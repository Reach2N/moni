import 'server-only'
import { tool, type Tool } from 'ai'
import { z } from 'zod'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import { expandResourceRange, formatMoney, type CurrencyCode, type OwnerTool } from '../types.ts'
import { cambodiaDate, cambodiaDayBounds } from '../time/cambodia.ts'
import { confirmPayment } from '../payments/confirm.ts'
import { getPaymentSettings, PaymentAccountError, setPaymentAccount } from '../payments/account.ts'
import { createProduct, createProductsBulk, ProductError, updateProduct } from '../products/write.ts'
import { generateProductPhoto } from '../ai/product-photo.ts'
import { describeShopTool } from './describe-shop.ts'
import { uploadProductPhoto } from '../media/storage.ts'
import { listCatalogue } from '../queries/catalogue.ts'
import { generateShopSiteDraft, publishShopSite } from '../storefront/generate.ts'
import { getStorefrontRow } from '../queries/storefront.ts'
import { loadSetupProgress } from '../queries/setup.ts'
import { setupComplete } from '../queries/setup-progress.ts'

/**
 * The OWNER tool set. This is the product: the owner says what she wants in plain
 * language and Moni organizes, plans and operates the shop. The customer-facing set
 * can only read the catalogue and book; only these can change the business.
 *
 * Four categories, which the UI mirrors so a non technical owner knows what she
 * can even ask for:
 *   ORGANIZE  the catalogue and the capacity: services, staff and rooms, hours, closures
 *   PLAN      what today and this week look like, where the gaps and the risks are
 *   OPERATE   act on what happened: mark done, mark no show, record cash, chase money
 *   SETUP     get the shop live: what is left, where the money goes, the public page
 *
 * `satisfies Record<OwnerTool, Tool>` at the bottom: a tool declared in
 * `OWNER_TOOLS` and not built here, or built and not declared, is a compile error
 * rather than a drift nobody notices (ARCHITECTURE.md guardrail G3).
 */
const KH = '+07:00'
const localDay = cambodiaDate
const hhmm = (s: string) =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Phnom_Penh' }).format(new Date(s))

export function ownerTools(businessId: string) {
  return {
    // ────────────────────────────────────────────────────────────────── SETUP
    /**
     * The one tool that PROPOSES instead of doing, and the only one built
     * somewhere else.
     *
     * It is wired in from `./describe-shop.ts`, which imports the parser and
     * the proposal builder and nothing else. That module is where the reason
     * is written down: a tool that can rewrite a whole shop from one sentence
     * must have no writer in scope, and inside THIS file every writer is one
     * scope up. `db/test.mjs` walks that module's import graph and asserts this
     * line is a delegation rather than a body, so the guarantee survives
     * someone editing either end of it.
     */
    describe_shop: describeShopTool,

    report_setup_status: tool({
      description:
        'SETUP. What is left before this shop is live: described, catalogue, receiving money, Telegram, first customer, and whether the public page is drafted or published. Call it for "what do I still have to do", "is my shop ready", "what next".',
      inputSchema: z.object({}),
      execute: async () => {
        const [steps, site, money] = await Promise.all([
          loadSetupProgress(businessId),
          getStorefrontRow(businessId),
          getPaymentSettings(businessId),
        ])
        return {
          complete: setupComplete(steps),
          steps: steps.map((step) => ({ step: step.label, state: step.state, detail: step.amount, error: step.error, screen: step.href })),
          site: { drafted: Boolean(site?.draft), published: Boolean(site?.published), screen: '/app/site' },
          money: money.account ? { account: money.account.accountId, screen: '/app/money' } : { account: null, screen: '/app/money' },
          note: 'Telegram is connected on /app/channels by pasting a BotFather token there. Never ask the owner to paste a token into this chat.',
        }
      },
    }),

    set_payment_account: tool({
      description:
        'SETUP. Save the shop\'s OWN Bakong account so customers pay it directly by KHQR. The owner copies it from her banking app, e.g. "sokha@wing". Use when she says "my Bakong is ...", "pay me at ...", "set up QR payments".',
      inputSchema: z.object({
        account_id: z.string().trim().describe('name@bank, exactly as her banking app shows it'),
        merchant_name: z.string().trim().max(80).nullable().optional().describe('the name to print on the QR, or null for the shop name'),
        merchant_city: z.string().trim().max(80).nullable().optional().describe('or null for the province'),
      }),
      execute: async ({ account_id, merchant_name, merchant_city }) => {
        try {
          const settings = await setPaymentAccount(
            businessId,
            { accountId: account_id, merchantName: merchant_name, merchantCity: merchant_city },
            'owner via moni',
          )
          return {
            saved: settings.account,
            next: 'She can scan her own test card on /app/money to see her account name come up in her banking app.',
          }
        } catch (error) {
          if (error instanceof PaymentAccountError) return { error: error.message }
          throw error
        }
      },
    }),

    generate_shop_site: tool({
      description:
        'SETUP. Write (or rewrite) the draft of the shop\'s public web page from what the owner already told us. Nothing goes public: she reviews the draft on /app/site and publishes. Use for "make me a website", "write my page".',
      inputSchema: z.object({}),
      execute: async () => {
        const generated = await generateShopSiteDraft(businessId, 'owner via moni')
        const draft = generated.storefront.draft as { theme?: string; headline?: string; subhead?: string } | null
        return {
          drafted: true,
          theme: draft?.theme ?? null,
          headline: draft?.headline ?? null,
          subhead: draft?.subhead ?? null,
          warnings: generated.warnings,
          review_on: '/app/site',
          note: 'Not public yet. Read the headline back to her and say she publishes on /app/site or by asking you to publish.',
        }
      },
    }),

    publish_shop_site: tool({
      description:
        'SETUP. Publish the drafted page to the shop\'s own address. Only when the owner explicitly asks to publish or go live. Refuses when nothing is drafted.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await publishShopSite(businessId, 'owner via moni')
        if (!result.published) return { error: 'there is no draft yet, generate the page first' }
        const slug = await db.from('businesses').select('slug').eq('id', businessId).single()
        const path = slug.data ? `/s/${slug.data.slug}` : null
        return { published: true, published_at: result.storefront.published_at, path, address: slug.data ? `${slug.data.slug}.moni.cam` : null }
      },
    }),

    // ─────────────────────────────────────────────────────────────── ORGANIZE
    create_service: tool({
      description: 'ORGANIZE. Add a service with its price and how long it takes.',
      inputSchema: z.object({
        name: z.string().describe("in the owner's own words, Khmer is fine"),
        name_en: z.string().nullable().optional(),
        price_minor: z.number().int().min(0).describe('minor units. 15000 means 15,000 riel'),
        currency: z.enum(['KHR', 'USD']).default('KHR'),
        duration_min: z.number().int().positive(),
        buffer_min: z.number().int().min(0).default(0),
      }),
      execute: async (a) => {
        const { data, error } = await db.from('services').insert({ business_id: businessId, ...a }).select('id, name').single()
        return error ? { error: error.message } : { added: data.name, id: data.id }
      },
    }),

    update_service: tool({
      description: 'ORGANIZE. Change a price, a duration or a name. Use adjust_prices for "raise everything by X".',
      inputSchema: z.object({
        service_id: z.string(),
        price_minor: z.number().int().min(0).nullable().optional(),
        duration_min: z.number().int().positive().nullable().optional(),
        name: z.string().nullable().optional(),
        active: z.boolean().nullable().optional(),
      }),
      execute: async ({ service_id, price_minor, duration_min, name, active }) => {
        // built field by field rather than via Object.fromEntries, because the
        // generated update type rejects an index signature that can hold null
        const patch: Partial<{ price_minor: number; duration_min: number; name: string; active: boolean }> = {}
        if (price_minor != null) patch.price_minor = price_minor
        if (duration_min != null) patch.duration_min = duration_min
        if (name != null) patch.name = name
        if (active != null) patch.active = active
        if (Object.keys(patch).length === 0) return { error: 'nothing to change' }
        const { data, error } = await db.from('services').update(patch).eq('id', service_id).eq('business_id', businessId).select('name').single()
        return error ? { error: error.message } : { updated: data.name, changes: patch }
      },
    }),

    adjust_prices: tool({
      description:
        'ORGANIZE. Change many prices at once, e.g. "raise every colouring price by 5000" or "put everything up 10 percent". Reports each old and new price so the owner can check before it goes live.',
      inputSchema: z.object({
        by_minor: z.number().int().nullable().optional().describe('flat amount to add, may be negative'),
        by_percent: z.number().nullable().optional().describe('percentage to add, may be negative'),
        name_contains: z.string().nullable().optional().describe('only services whose name contains this'),
      }),
      execute: async ({ by_minor, by_percent, name_contains }) => {
        if (by_minor == null && by_percent == null) return { error: 'give either by_minor or by_percent' }
        let q = db.from('services').select('id, name, price_minor, currency').eq('business_id', businessId).eq('active', true)
        if (name_contains) q = q.ilike('name', `%${name_contains}%`)
        const { data: rows, error } = await q
        if (error) return { error: error.message }
        if (!rows?.length) return { error: 'no services matched' }

        const changes = await Promise.all(rows.map(async (s) => {
          const next = Math.max(
            0,
            by_minor != null ? s.price_minor + by_minor : Math.round(s.price_minor * (1 + by_percent! / 100)),
          )
          const updated = await db
            .from('services')
            .update({ price_minor: next })
            .eq('id', s.id)
            .eq('business_id', businessId)
          throwIfDbError(`adjust price for ${s.name}`, updated.error)
          return {
            name: s.name,
            from: formatMoney(s.price_minor, s.currency as CurrencyCode),
            to: formatMoney(next, s.currency as CurrencyCode),
          }
        }))
        return { changed: changes.length, changes }
      },
    }),

    create_resources_bulk: tool({
      description:
        'ORGANIZE. Add many staff, rooms, bays or tables at once. "I have rooms 101 to 140" is one call, not forty.',
      inputSchema: z.object({
        kind: z.enum(['staff', 'room', 'bay', 'table', 'chair', 'equipment']),
        prefix: z.string().nullable().optional().describe('e.g. "Room " so you get Room 101'),
        from: z.number().int(),
        to: z.number().int(),
      }),
      execute: async ({ kind, prefix, from, to }) => {
        let names: string[]
        try {
          names = expandResourceRange({ kind, prefix: prefix ?? '', from, to })
        } catch (e) {
          return { error: e instanceof Error ? e.message : 'bad range' }
        }
        const { error } = await db.from('resources').insert(names.map((name) => ({ business_id: businessId, name, kind })))
        return error ? { error: error.message } : { added: names.length, first: names[0], last: names.at(-1) }
      },
    }),

    create_resource: tool({
      description: 'ORGANIZE. Add one member of staff, room, bay or table.',
      inputSchema: z.object({ name: z.string(), kind: z.enum(['staff', 'room', 'bay', 'table', 'chair', 'equipment']).default('staff') }),
      execute: async (a) => {
        const { data, error } = await db.from('resources').insert({ business_id: businessId, ...a }).select('name').single()
        return error ? { error: error.message } : { added: data.name }
      },
    }),

    create_product: tool({
      description:
        'ORGANIZE. Add one thing the shop SELLS rather than does: a drink, a dish, a part, a bottle of shampoo. Use create_service instead for work that takes time and gets booked, like a haircut.',
      inputSchema: z.object({
        name: z.string().describe("in the owner's own words, Khmer is fine"),
        name_en: z.string().nullable().optional(),
        price_minor: z.number().int().min(0).describe('minor units. 5000 means 5,000 riel. Use 0 when she has not said a price'),
        currency: z.enum(['KHR', 'USD']).default('KHR'),
        category: z.string().nullable().optional().describe('the menu grouping in her words, such as ភេសជ្ជៈ, or null'),
        stock: z.number().int().min(0).nullable().optional().describe('leave null unless she actually counts this item'),
      }),
      execute: async ({ name, name_en, price_minor, currency, category, stock }) => {
        try {
          const product = await createProduct(businessId, { name, name_en, price_minor, currency, category, stock })
          return { added: product.name, id: product.id }
        } catch (error) {
          if (error instanceof ProductError) return { error: error.message }
          throw error
        }
      },
    }),

    create_products_bulk: tool({
      description:
        'ORGANIZE. Add a whole menu or price list at once. Use this whenever the owner lists several things in one message, so a fifteen item menu is one call and not fifteen.',
      inputSchema: z.object({
        items: z
          .array(
            z.object({
              name: z.string(),
              price_minor: z.number().int().min(0),
              category: z.string().nullable().optional(),
            }),
          )
          .min(1)
          .max(100),
        currency: z.enum(['KHR', 'USD']).default('KHR'),
      }),
      execute: async ({ items, currency }) => {
        try {
          const added = await createProductsBulk(businessId, items.map((item) => ({ ...item, currency })))
          return { added: added.length, names: added.map((row) => row.name) }
        } catch (error) {
          if (error instanceof ProductError) return { error: error.message }
          throw error
        }
      },
    }),

    update_product: tool({
      description:
        'ORGANIZE. Change a product price, name, category or stock, or take it off the menu with active false. Find its id with search_catalogue first.',
      inputSchema: z.object({
        product_id: z.string().uuid(),
        name: z.string().nullable().optional(),
        price_minor: z.number().int().min(0).nullable().optional(),
        category: z.string().nullable().optional(),
        stock: z.number().int().min(0).nullable().optional(),
        active: z.boolean().nullable().optional(),
      }),
      execute: async ({ product_id, name, price_minor, category, stock, active }) => {
        const patch: Parameters<typeof updateProduct>[2] = {}
        if (name != null) patch.name = name
        if (price_minor != null) patch.price_minor = price_minor
        if (category !== undefined) patch.category = category
        if (stock !== undefined) patch.stock = stock
        if (active != null) patch.active = active
        try {
          return await updateProduct(businessId, product_id, patch)
        } catch (error) {
          if (error instanceof ProductError) return { error: error.message }
          throw error
        }
      },
    }),

    generate_product_photo: tool({
      description:
        'ORGANIZE. Draw a photo for a product that has none, from what the shop already told us. It CAN be refused, and when it is, tell her the reason it gives and that she can add a photo from her phone on the catalogue screen.',
      inputSchema: z.object({ product_id: z.string().uuid() }),
      execute: async ({ product_id }) => {
        const productResult = await db
          .from('products')
          .select('id, name, description')
          .eq('id', product_id)
          .eq('business_id', businessId)
          .maybeSingle()
        if (!productResult.data) return { error: 'no such product in this shop' }
        const product = productResult.data

        const shopResult = await db.from('businesses').select('business_type').eq('id', businessId).single()
        const shop = requireDbData('load shop for product photo', shopResult)

        const photo = await generateProductPhoto({
          name: product.name,
          description: product.description,
          businessType: shop.business_type,
        })
        if (!photo.ok) return { refused: photo.reason, message: photo.message, upload_on: '/app/products' }

        const path = await uploadProductPhoto({
          businessId,
          productId: product.id,
          bytes: photo.bytes,
          mediaType: photo.mediaType,
          extension: photo.mediaType === 'image/png' ? 'png' : 'jpg',
        })
        const saved = await db
          .from('products')
          .update({ photo_path: path })
          .eq('id', product.id)
          .eq('business_id', businessId)
        if (saved.error) return { error: 'the photo was drawn but could not be attached' }
        return { drawn: product.name, model: photo.model }
      },
    }),

    set_hours: tool({
      description:
        'ORGANIZE. Set the weekly opening hours. Give every day the shop is OPEN. Any day left out is treated as closed.',
      inputSchema: z.object({
        days: z.array(z.object({ dow: z.number().int().min(0).max(6).describe('0 is Sunday'), open: z.string(), close: z.string() })).min(1),
      }),
      execute: async ({ days }) => {
        const { error } = await db.from('businesses').update({ hours: days }).eq('id', businessId)
        return error ? { error: error.message } : { open_days: days.length, closed_days: 7 - days.length }
      },
    }),

    add_closure: tool({
      description:
        'ORGANIZE. Close the shop for a period: a holiday, a wedding, an afternoon off. Existing bookings are not cancelled, they are reported back so the owner can decide.',
      inputSchema: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        from_time: z.string().default('00:00'),
        to_time: z.string().default('23:59'),
        reason: z.string().nullable().optional(),
      }),
      execute: async ({ date, from_time, to_time, reason }) => {
        const starts = `${date}T${from_time}:00${KH}`
        const ends = `${date}T${to_time}:00${KH}`
        const { error } = await db.from('closures').insert({ business_id: businessId, starts_at: starts, ends_at: ends, reason: reason ?? null })
        if (error) return { error: error.message }
        const clashResult = await db
          .from('v_bookings_agent')
          .select('code, customer_name, starts_at')
          .eq('business_id', businessId)
          .gte('starts_at', starts)
          .lt('starts_at', ends)
          .in('status', ['pending', 'confirmed'])
        throwIfDbError('load bookings affected by closure', clashResult.error)
        const clash = clashResult.data
        return {
          closed: `${date} ${from_time} to ${to_time}`,
          bookings_already_in_that_window: (clash ?? []).map((b) => ({ code: b.code, who: b.customer_name, at: b.starts_at ? hhmm(b.starts_at) : null })),
        }
      },
    }),

    // ───────────────────────────────────────────────────────────────── PLAN
    get_day_plan: tool({
      description:
        'PLAN. What a day looks like: who is coming, in what order, how much is expected, where the idle gaps are, and what still needs paying.',
      inputSchema: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional() }),
      execute: async ({ date }) => {
        const day = date ?? localDay()
        const bounds = cambodiaDayBounds(new Date(`${day}T12:00:00${KH}`))
        const rowsResult = await db
          .from('v_bookings_agent')
          .select('code, customer_name, service_name, resource_name, status, starts_at, ends_at, price_minor, balance_minor, currency, no_show_count')
          .eq('business_id', businessId)
          .gte('starts_at', bounds.start)
          .lt('starts_at', bounds.end)
          .order('starts_at')
        throwIfDbError('load owner day plan', rowsResult.error)
        const rows = rowsResult.data

        const live = (rows ?? []).filter((r) => r.status !== 'cancelled')
        const expected = live.filter((r) => r.status !== 'no_show').reduce((n, r) => n + (r.price_minor ?? 0), 0)
        const outstanding = live.reduce((n, r) => n + (r.balance_minor ?? 0), 0)
        const cur = (live[0]?.currency ?? 'KHR') as CurrencyCode

        // idle gaps between consecutive bookings, which is what "plan my day" means
        const gaps: string[] = []
        for (let i = 1; i < live.length; i++) {
          const prevEnd = new Date(live[i - 1]!.ends_at!).getTime()
          const thisStart = new Date(live[i]!.starts_at!).getTime()
          const mins = Math.round((thisStart - prevEnd) / 60000)
          if (mins >= 45) gaps.push(`${hhmm(live[i - 1]!.ends_at!)} to ${hhmm(live[i]!.starts_at!)}, ${mins} minutes free`)
        }

        return {
          date: day,
          count: live.length,
          expected_takings: formatMoney(expected, cur),
          still_to_collect: formatMoney(outstanding, cur),
          idle_gaps: gaps,
          risky: live.filter((r) => (r.no_show_count ?? 0) > 0).map((r) => ({ who: r.customer_name, previous_no_shows: r.no_show_count })),
          bookings: live.map((r) => ({
            at: hhmm(r.starts_at!),
            code: r.code,
            who: r.customer_name,
            what: r.service_name,
            with: r.resource_name,
            status: r.status,
            owes: r.balance_minor ? formatMoney(r.balance_minor, (r.currency ?? cur) as CurrencyCode) : null,
          })),
        }
      },
    }),

    get_week_plan: tool({
      description: 'PLAN. The next seven days at a glance: how busy each day is and which days are quiet enough to promote.',
      inputSchema: z.object({}),
      execute: async () => {
        const from = new Date()
        const to = new Date(from.getTime() + 7 * 86400_000)
        const result = await db
          .from('v_bookings_agent')
          .select('starts_at, price_minor, status, currency')
          .eq('business_id', businessId)
          .gte('starts_at', from.toISOString())
          .lt('starts_at', to.toISOString())
          .in('status', ['pending', 'confirmed', 'completed'])
        throwIfDbError('load owner week plan', result.error)
        const data = result.data

        const byDay = new Map<string, { n: number; minor: number }>()
        for (const r of data ?? []) {
          const k = cambodiaDate(new Date(r.starts_at!))
          const cell = byDay.get(k) ?? { n: 0, minor: 0 }
          cell.n++; cell.minor += r.price_minor ?? 0
          byDay.set(k, cell)
        }
        const cur = ((data ?? [])[0]?.currency ?? 'KHR') as CurrencyCode
        const days = [...byDay.entries()].sort().map(([date, c]) => ({ date, bookings: c.n, expected: formatMoney(c.minor, cur) }))
        const quiet = days.filter((d) => d.bookings <= 1).map((d) => d.date)
        return { days, quiet_days: quiet, note: quiet.length ? 'quiet days are the ones worth promoting' : 'the week is fairly full' }
      },
    }),

    get_money_owed: tool({
      description: 'PLAN. Who still owes money, oldest first, so the owner knows exactly who to chase.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await db
          .from('v_bookings_agent')
          .select('code, customer_name, customer_phone, service_name, balance_minor, currency, starts_at, status')
          .eq('business_id', businessId)
          .gt('balance_minor', 0)
          .in('status', ['confirmed', 'completed'])
          .order('starts_at')
        throwIfDbError('load money owed', result.error)
        const data = result.data
        const cur = ((data ?? [])[0]?.currency ?? 'KHR') as CurrencyCode
        const total = (data ?? []).reduce((n, r) => n + (r.balance_minor ?? 0), 0)
        return {
          total_owed: formatMoney(total, cur),
          people: (data ?? []).map((r) => ({
            code: r.code, who: r.customer_name, phone: r.customer_phone,
            for: r.service_name, owes: formatMoney(r.balance_minor ?? 0, (r.currency ?? cur) as CurrencyCode),
          })),
        }
      },
    }),

    get_service_performance: tool({
      description: 'PLAN. Which services actually earn, by money taken and by how much of the day they consume.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await db
          .from('v_bookings_agent')
          .select('service_name, price_minor, currency, status, starts_at, ends_at')
          .eq('business_id', businessId)
          .in('status', ['completed', 'confirmed'])
        throwIfDbError('load service performance', result.error)
        const data = result.data
        const agg = new Map<string, { n: number; minor: number; mins: number }>()
        for (const r of data ?? []) {
          const k = r.service_name ?? '?'
          const cell = agg.get(k) ?? { n: 0, minor: 0, mins: 0 }
          cell.n++; cell.minor += r.price_minor ?? 0
          cell.mins += Math.round((new Date(r.ends_at!).getTime() - new Date(r.starts_at!).getTime()) / 60000)
          agg.set(k, cell)
        }
        const cur = ((data ?? [])[0]?.currency ?? 'KHR') as CurrencyCode
        return {
          services: [...agg.entries()]
            .map(([name, c]) => ({
              name, bookings: c.n, earned: formatMoney(c.minor, cur),
              per_hour: formatMoney(c.mins ? Math.round((c.minor / c.mins) * 60) : 0, cur),
            }))
            .sort((a, b) => b.bookings - a.bookings),
          note: 'per_hour is what the shop earns for each hour of chair time, which is the number that matters when a day is full',
        }
      },
    }),

    search_catalogue: tool({
      description:
        'PLAN. Find what the shop sells, services and products together, by name. Use it before changing something so you have its id, and to answer "do we sell X".',
      inputSchema: z.object({ query: z.string().trim().max(80).describe('part of a name, or empty for everything') }),
      execute: async ({ query }) => {
        const items = await listCatalogue(businessId, { search: query })
        return {
          found: items.length,
          items: items.map((item) => ({
            id: item.id,
            kind: item.kind,
            name: item.name,
            price: formatMoney(item.price_minor, item.currency as CurrencyCode),
            category: item.category,
            stock: item.stock,
          })),
        }
      },
    }),

    // ─────────────────────────────────────────────────────────────── OPERATE
    mark_booking: tool({
      description: 'OPERATE. Mark a booking done, a no show, or cancelled. A no show is recorded against the customer.',
      inputSchema: z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/), status: z.enum(['completed', 'no_show', 'cancelled', 'confirmed']) }),
      execute: async ({ code, status }) => {
        const { data, error } = await db
          .from('bookings')
          .update({ status, ...(status === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}) })
          .eq('business_id', businessId).eq('code', code.toUpperCase())
          .select('id, customer_id, code').single()
        if (error) return { error: error.message }
        if (status === 'no_show') {
          const customerResult = await db
            .from('customers')
            .select('no_show_count')
            .eq('id', data.customer_id)
            .eq('business_id', businessId)
            .single()
          const customer = requireDbData('load no-show customer', customerResult)
          const updatedCustomer = await db
            .from('customers')
            .update({ no_show_count: customer.no_show_count + 1 })
            .eq('id', data.customer_id)
            .eq('business_id', businessId)
          throwIfDbError('increment customer no-show count', updatedCustomer.error)
        }
        return { code: data.code, status }
      },
    }),

    record_manual_payment: tool({
      description: 'OPERATE. Record cash or a bank transfer taken in person, so the books match reality.',
      inputSchema: z.object({
        code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/).describe('booking code'),
        amount_minor: z.number().int().positive(),
        method: z.enum(['cash', 'bank_transfer', 'manual']).default('cash'),
      }),
      execute: async ({ code, amount_minor, method }) => {
        const bookingResult = await db
          .from('bookings')
          .select('id, currency')
          .eq('business_id', businessId)
          .eq('code', code)
          .single()
        const bk = requireDbData('load booking for manual payment', bookingResult)
        const { error } = await db.from('payments').insert({
          business_id: businessId, booking_id: bk.id, kind: 'balance', amount_minor,
          currency: bk.currency, provider: method, status: 'paid', paid_at: new Date().toISOString(),
          idempotency_key: `manual:${code}:${Date.now()}`,
        })
        return error ? { error: error.message } : { recorded: formatMoney(amount_minor, bk.currency as CurrencyCode), against: code }
      },
    }),

    confirm_payment: tool({
      description:
        'OPERATE. The owner saw a KHQR payment arrive in her own banking app. Marks that pending QR as paid and confirms what it was for, a booking or a shop-site order. Use when she says a code was paid, "MN7Q1A paid", "the money for 4K2P came in". Refuses nothing twice: an already paid code is reported, not re-marked. If it returns outcome "ambiguous" the code names both a booking and an order: say so and ask her which, never pick one.',
      inputSchema: z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/).describe('booking or order code') }),
      execute: async ({ code }) => confirmPayment({ businessId, code, actorLabel: 'owner via moni' }),
    }),

    export_customers: tool({
      description: "OPERATE. The customer list. It is the owner's own asset and she can take it whenever she wants.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await db.from('customers').select('display_name, phone, no_show_count, first_seen_at').eq('business_id', businessId).order('first_seen_at')
        throwIfDbError('export owner customers', result.error)
        return { count: (result.data ?? []).length, customers: result.data ?? [] }
      },
    }),
  } satisfies Record<OwnerTool, Tool>
}
