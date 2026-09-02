# Products, Photos and the Menu: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a shop that sells things (a cafe, a pharmacy, a repair shop) hold a product catalogue with photos, have the assistant quote it, and show it as a menu on the shop's public site.

**Architecture:** One `v_catalog` view unions `services` and `products` so every reader sees one shape and nothing branches on business type. Product photos live in a public Supabase Storage bucket, uploaded as raw bytes through an owned HTTP route, with AI generation offered beside upload and allowed to be refused. What a shop sells is a TypeScript field on the business type, not a database column.

**Tech Stack:** Next.js 16.3.1 App Router, React 19, Tailwind v4, `@supabase/supabase-js` (database client and now Storage), PGlite for schema assertions, Vercel AI SDK through `src/lib/ai/models.ts`, Node test scripts with `--experimental-strip-types`.

**Spec:** `docs/superpowers/specs/2026-09-02-products-photos-menu-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **No em dashes.** Not in UI copy, not in Khmer copy, not in comments, not in commit messages. Use a colon, a comma, or a full stop.
- **Khmer needs `line-height: 1.75` and `letter-spacing: normal`.** Any element carrying Khmer text gets the `km` class. Never put `tracking-*` on Khmer.
- **Icons only, never emoji.** lucide-react or an authored SVG at the surrounding stroke weight.
- **`src/lib/types.ts` is the source of truth.** It changes first, `db/schema.sql` follows, `npm run db:test` proves it. Never the reverse.
- **Money is integer minor units plus a currency code.** Render through `formatMoney()` or the helpers in `src/lib/format/khmer.ts` and `src/components/app/dashboard-format.ts`. Never a raw money number in JSX, never a float.
- **Never format a user facing quantity through a `km-KH` locale.** Node and Chrome disagree on its separators, which is a hydration mismatch on every money string. Group through `en-US` and transliterate with `toKhmerDigits`.
- **No business logic in components.** Components take props and call HTTP contracts. No server actions for business operations.
- **Every capability is an HTTP endpoint under `src/app/api/`** with a JSON contract, so a Swift client can later do everything the web app does.
- **Tenancy:** every query takes `businessId` as an argument, resolved from the session by `requireMember()` or `requireMemberApi()`. Never from a request body, query string or slug. RLS has zero policies, so a query that forgets its tenant has nothing to catch it.
- **`import 'server-only'` makes a module unimportable from a Node test script.** Pure, testable logic goes in a sibling module with no `server-only`, following `src/lib/auth/gate.ts` beside `src/lib/auth/member.ts`.
- **No model or provider name outside `src/lib/ai/models.ts`.**
- **Never invent or hand-build a UI component.** Select the complete Beautiful UI source first, then an existing installed component, then 21st.dev, DaisyUI, and only then shadcn/Radix for a low-level primitive. Keep its structure and interaction. If nothing fits, stop and report the gap. Record the source in `CREDITS.md`.
- **Owner-app token vocabulary only** on `/app` routes: `bg-paper`, `text-ink`, `text-rule`, `text-seal-text`, `bg-ink`, `text-on-ink`, `border-hairline`. Do not import homepage tokens (`text-label`, `bg-surface`, `border-separator`) there. The storefront under `/s/[slug]` uses the homepage tokens, which is existing and correct.
- **This repo has no component test framework.** Pure logic is asserted in `db/test.mjs` or `scripts/*-test.mjs`. Component tasks verify with `npm run lint`, `npm run build` and `npm run shoot`. Do not scaffold a new test runner.
- **Do not edit** `src/components/primitives/TaskRows.tsx`, `src/components/primitives/ThinkingState.tsx`, `src/app/beautifui/foundation.css`, `src/components/marketing/**` or `src/app/(marketing)/**`.
- **Do not simplify `src/lib/payments.ts`.** Its PORTED comments carry bugs already paid for once.

---

## File Structure

**Created:**

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20260902140000_product_catalogue.sql` | Product columns, the `v_catalog` view, the Storage bucket |
| `src/lib/media/validate.ts` | Pure upload rules: accepted types, size cap, storage key shape. No `server-only`, so tests can import it |
| `src/lib/media/storage.ts` | Supabase Storage reads and writes. `server-only` |
| `src/lib/queries/catalogue.ts` | Reads of `v_catalog`: list, search, count. `server-only` |
| `src/lib/products/write.ts` | Product create, update, archive. One place, shared by the API route and the agent tool. `server-only` |
| `src/lib/ai/product-photo.ts` | Prompt building and the generate call, returning a refusal rather than throwing |
| `src/app/api/products/route.ts` | `GET` the catalogue, `POST` a product |
| `src/app/api/products/[id]/route.ts` | `PATCH` and `DELETE` one product |
| `src/app/api/products/[id]/photo/route.ts` | `POST` raw bytes to upload, `PUT` to generate, `DELETE` to remove |
| `src/app/app/products/page.tsx` | The dashboard catalogue screen |
| `src/components/app/product-list.tsx` | The catalogue table and its editor |
| `src/components/app/product-photo.tsx` | One product's photo: upload, generate, remove |

**Modified:**

| File | Change |
| --- | --- |
| `src/lib/types.ts` | `CATALOG_KINDS`, `CatalogItem`, `Product`, `sells` on all 42 business types, product tool names |
| `db/schema.sql` | Product columns and the view, mirroring the migration |
| `db/test.mjs` | View, scoping, stock and catalogue assertions |
| `src/lib/queries/business.ts` | `hasCatalogue` counts the catalogue, not services |
| `src/lib/queries/setup.ts` | The spine's catalogue row counts both kinds |
| `src/lib/queries/setup-progress.ts` | Row label and amount stop saying "services" |
| `scripts/setup-progress-test.mjs` | Assertions for a products-only shop |
| `src/lib/agent/owner-tools.ts` | Product tools |
| `src/lib/agent/tools.ts` | `get_business` returns the catalogue, `search_catalogue` added |
| `src/lib/agent/categories.ts` | Product starting points |
| `src/lib/ai/models.ts` | The `image` task and its chain |
| `scripts/models-test.mjs` | Image chain assertions |
| `src/lib/queries/storefront.ts` | Reads `v_catalog` |
| `src/themes/types.ts`, `src/themes/registry.tsx`, `src/themes/shared.ts` | Render a catalogue item with a photo |
| `src/components/app/desktop-nav.tsx` | `/app/products` destination |
| `src/app/app/page.tsx` | The empty-shop redirect uses the catalogue |
| `.env.example`, `CLAUDE.md`, `PLAN.md`, `CREDITS.md` | Record what shipped |

---

### Task 1: The data model

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `db/schema.sql`
- Create: `supabase/migrations/20260902140000_product_catalogue.sql`
- Modify: `db/test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `CATALOG_KINDS`, `CatalogKind`, `Product`, `CatalogItem`, `BusinessTypeDef.sells`, `sellsFor(businessTypeId): Sells`, and the `v_catalog` view with columns `kind, id, business_id, name, name_en, description, price_minor, currency, stock, category, photo_path, photo_alt, active, sort_order, duration_min, unit`.

- [ ] **Step 1: Add the catalogue types to `src/lib/types.ts`**

Put this next to the existing `PAYMENT_KINDS` block, before the row types:

```ts
export const CATALOG_KINDS = ['service', 'product'] as const
export type CatalogKind = (typeof CATALOG_KINDS)[number]

/**
 * What a business type sells, which decides whether its dashboard leads with
 * services or with a menu. A TypeScript field and not a column, per hard rule 5:
 * a taxonomy that grows stays `as const` here, so adding a vertical is a code
 * change rather than a migration.
 *
 * `businesses.capabilities`, which ARCHITECTURE.md section 5 also proposes, is
 * deliberately not built. It exists to let an owner override this default and
 * nobody has asked to yet.
 */
export const SELLS = ['time', 'goods', 'both'] as const
export type Sells = (typeof SELLS)[number]
```

- [ ] **Step 2: Add `sells` to every business type**

`BUSINESS_TYPES` has 42 entries. Add `sells` to each. The classification, and the reasoning is that anything charging for both labour and parts is `both`:

`both`: `optical`, `pharmacy`, `car_repair`, `moto_repair`, `tire_shop`, `restaurant`, `cafe`, `catering`, `phone_repair`, `tailor`, `print_shop`, `photo_studio`, `aircon`, `handyman`, `karaoke`, `other`.

`time`: every remaining id, which is `salon`, `barber`, `nail`, `spa`, `makeup`, `clinic`, `dental`, `physio`, `car_wash`, `tutoring`, `language_school`, `music_school`, `driving_school`, `gym`, `yoga`, `sports_court`, `hotel`, `guesthouse`, `homestay`, `tour`, `laundry`, `pet_grooming`, `cleaning`, `construction`, `wedding_rental`, `event_venue`.

No current type is `goods`, because the taxonomy has no pure retail entry: a phone accessories shop picks `other`, which is why `other` is `both` and not `time`. Keep `'goods'` in the union anyway, since the next vertical added may be one.

Update the `BusinessTypeDef` type to require it, then add the lookup beside the existing helpers:

```ts
/** What this type sells. Unknown ids answer 'both', so nothing is ever hidden from a shop. */
export function sellsFor(businessTypeId: string): Sells {
  return BUSINESS_TYPES.find((type) => type.id === businessTypeId)?.sells ?? 'both'
}
```

- [ ] **Step 3: Extend `Product` and add `CatalogItem`**

`Product` ALREADY EXISTS in the orders section of `src/lib/types.ts`, carrying nine columns.
Extend it in place rather than adding a second one, and put `CatalogItem` beside it:

```ts
/**
 * What a shop sells that is not time. A sibling of Service, never a
 * replacement: a cafe has products, a salon has services, and a repair shop
 * has both. `v_catalog` is what stops every reader branching between them.
 */
export type Product = {
  id: string
  business_id: string
  name: string
  name_en: string | null
  description: string | null
  price_minor: number
  currency: CurrencyCode
  /** NULL means this product is not stock counted, which is different from zero. */
  stock: number | null
  /** The menu's own grouping, in the owner's words: "ភេសជ្ជៈ", "នំ". */
  category: string | null
  /** Supabase Storage key, never a URL, so the bucket can move without rewriting rows. */
  photo_path: string | null
  photo_alt: string | null
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/** One row of `v_catalog`: a service or a product, in the shape every reader wants. */
export type CatalogItem = {
  kind: CatalogKind
  id: string
  business_id: string
  name: string
  name_en: string | null
  description: string | null
  price_minor: number
  currency: CurrencyCode
  stock: number | null
  category: string | null
  photo_path: string | null
  photo_alt: string | null
  active: boolean
  sort_order: number
  /** Services only. Null on a product, which takes no time to hand over. */
  duration_min: number | null
  unit: string
}
```

- [ ] **Step 4: Mirror the columns in `db/schema.sql`**

In the `products` table, after `currency` and before `stock`, and keeping the existing comment on `stock`:

```sql
  category     text,
  photo_path   text,
  photo_alt    text,
```

Add the comments below the table, in the style of its neighbours:

```sql
comment on column products.category is 'The menu''s own grouping, in the owner''s words. NULL means ungrouped, which is correct for a shop with six things.';
comment on column products.photo_path is 'Supabase Storage key inside the shop-media bucket, never a URL. The bucket or the CDN in front of it can change without rewriting every row.';
```

- [ ] **Step 5: Add the view to `db/schema.sql`**

Put it with the other views, after `v_month_usage`:

```sql
-- One catalogue, two kinds. Every READ of what a shop sells goes through this;
-- every WRITE goes to the table that owns the row. Without it each consumer
-- (storefront, agent, dashboard, setup spine) grows its own branch on business
-- type, and the branch is where a cafe gets forgotten.
create or replace view
v_catalog with (security_invoker = true) as
  select 'service'::text        as kind,
         s.id, s.business_id, s.name, s.name_en, s.description,
         s.price_minor, s.currency,
         null::integer          as stock,
         null::text             as category,
         null::text             as photo_path,
         null::text             as photo_alt,
         s.active, s.sort_order,
         s.duration_min,
         s.unit
    from services s
  union all
  select 'product'::text,
         p.id, p.business_id, p.name, p.name_en, p.description,
         p.price_minor, p.currency,
         p.stock, p.category, p.photo_path, p.photo_alt,
         p.active, p.sort_order,
         null::integer,
         'item'::text
    from products p;
```

- [ ] **Step 6: Write the migration**

Create `supabase/migrations/20260902140000_product_catalogue.sql`:

```sql
-- The product catalogue, 2 September 2026.
-- Additive only. Mirrors db/schema.sql, which mirrors src/lib/types.ts.
--
-- `products` has shipped since Phase 8 with stock decrement, orders and gapless
-- invoice numbers behind it, and nothing could reach it: no row type, no image,
-- and not one reference in the dashboard or either agent tool set. A cafe was
-- therefore unmodellable, which is what this migration ends.

alter table products add column if not exists category   text;
alter table products add column if not exists photo_path text;
alter table products add column if not exists photo_alt  text;

comment on column products.category is 'The menu''s own grouping, in the owner''s words. NULL means ungrouped, which is correct for a shop with six things.';
comment on column products.photo_path is 'Supabase Storage key inside the shop-media bucket, never a URL. The bucket or the CDN in front of it can change without rewriting every row.';

create or replace view
v_catalog with (security_invoker = true) as
  select 'service'::text as kind, s.id, s.business_id, s.name, s.name_en, s.description,
         s.price_minor, s.currency, null::integer as stock, null::text as category,
         null::text as photo_path, null::text as photo_alt, s.active, s.sort_order,
         s.duration_min, s.unit
    from services s
  union all
  select 'product'::text, p.id, p.business_id, p.name, p.name_en, p.description,
         p.price_minor, p.currency, p.stock, p.category, p.photo_path, p.photo_alt,
         p.active, p.sort_order, null::integer, 'item'::text
    from products p;

-- Product photos are shown to visitors who never sign in, so a signed URL buys
-- nothing and costs a round trip per image. Public read, service role write.
insert into storage.buckets (id, name, public)
values ('shop-media', 'shop-media', true)
on conflict (id) do nothing;
```

- [ ] **Step 7: Write the failing assertions in `db/test.mjs`**

Add a new section before the result block at the end. `B_SALON` and `B_HOUSE` already exist in the file, as does the `one` helper:

```js
console.log('\nthe catalogue: one view, two kinds')
await db.exec(`
  insert into products (id, business_id, name, price_minor, currency, stock, category, photo_path) values
   ('e2000000-0000-4000-8000-000000000001','${B_SALON}','កាហ្វេទឹកកក', 5000, 'KHR', null, 'ភេសជ្ជៈ', '${B_SALON}/e2000000/cup.webp'),
   ('e2000000-0000-4000-8000-000000000002','${B_HOUSE}','ទឹកសុទ្ធតូច', 1000, 'KHR', 24, null, null)`)

const salonCatalogue = await db.query(
  `select kind, name, price_minor, stock, photo_path, duration_min, unit
     from v_catalog where business_id = '${B_SALON}' and active order by kind, name`)
const kinds = [...new Set(salonCatalogue.rows.map((r) => r.kind))].sort()
eq('the view carries both kinds for a shop that has both', kinds.join(','), 'product,service')

const drink = salonCatalogue.rows.find((r) => r.name === 'កាហ្វេទឹកកក')
eq('a product keeps its own price through the view', drink.price_minor, 5000)
eq('a product has no duration, because handing something over takes no appointment', drink.duration_min, null)
eq('a product reads as one item', drink.unit, 'item')
eq('and its photo travels as a storage key, never a URL', drink.photo_path.startsWith('http'), false)

const service = salonCatalogue.rows.find((r) => r.kind === 'service')
eq('a service still carries its duration', typeof service.duration_min, 'number')
eq('and a service has no stock, which is not the same as zero', service.stock, null)

// NULL stock means "we do not count this". The view must not flatten that to 0,
// or a kitchen that does not count soup starts reporting it as sold out.
eq('an uncounted product stays uncounted through the view', drink.stock, null)
const counted = await one(db, `select stock from v_catalog where id = 'e2000000-0000-4000-8000-000000000002'`)
eq('and a counted one keeps its number', counted.stock, 24)

// The whole point of the tenant argument. The view is security_invoker and every
// caller filters by business_id; this proves the other shop's row is reachable
// only under its own id.
const leak = await one(db, `select count(*) c from v_catalog where business_id = '${B_SALON}' and name = 'ទឹកសុទ្ធតូច'`)
eq('another shop\\'s product is not in this shop\\'s catalogue', Number(leak.c), 0)

// The bug this whole pass exists to fix: a cafe has a full menu and no services,
// and every catalogue check in the product counted services only.
const B_CAFE = 'b0000000-0000-4000-8000-000000000009'
await db.exec(`
  insert into businesses (id, slug, name, business_type, default_currency)
   values ('${B_CAFE}', 'test-cafe', 'ហាងកាហ្វេសាកល្បង', 'cafe', 'KHR');
  insert into products (business_id, name, price_minor, currency)
   values ('${B_CAFE}', 'កាហ្វេខ្មៅ', 4000, 'KHR')`)
const cafeCatalogue = await one(db, `select count(*) c from v_catalog where business_id = '${B_CAFE}' and active`)
eq('a cafe with a menu and no services has a catalogue', Number(cafeCatalogue.c), 1)
const cafeServices = await one(db, `select count(*) c from services where business_id = '${B_CAFE}'`)
eq('and it has no services at all, which is why counting those was the bug', Number(cafeServices.c), 0)
```

Add the types assertion beside it, importing `sellsFor` and `BUSINESS_TYPES` at the top of `db/test.mjs` alongside the existing `formatMoney` import:

```js
console.log('\nwhat a shop sells')
eq('every business type declares what it sells', BUSINESS_TYPES.every((t) => ['time', 'goods', 'both'].includes(t.sells)), true)
eq('a cafe sells goods as well as time', sellsFor('cafe'), 'both')
eq('a salon sells time', sellsFor('salon'), 'time')
eq('an unknown type is assumed to sell both, so nothing is hidden from a shop', sellsFor('spaceship_repair'), 'both')
```

- [ ] **Step 8: Run the tests and watch them fail**

Run: `npm run db:test`
Expected: FAIL. The view does not exist yet in the schema the test applies, so the first `v_catalog` query errors.

- [ ] **Step 9: Run the tests and watch them pass**

The schema edits from steps 4 and 5 are what make them pass, since `db/test.mjs` applies `db/schema.sql` to PGlite.

Run: `npm run db:test`
Expected: PASS, with the new assertions listed and the previous 289 still green.

Note: PGlite has no `storage` schema, so the bucket insert lives only in the migration and not in `db/schema.sql`. If `db/schema.sql` ever gains it, `db/test.mjs` will fail on the missing schema.

- [ ] **Step 10: Apply the migration to the live project and regenerate the row types**

Apply `supabase/migrations/20260902140000_product_catalogue.sql` through the Supabase MCP `apply_migration` tool, named `product_catalogue`.

Then regenerate and overwrite `src/lib/database.types.ts` from the live schema. Never hand edit that file.

- [ ] **Step 11: Typecheck and commit**

```bash
npx tsc --noEmit && npm run lint && npm run db:test
git add src/lib/types.ts db/schema.sql db/test.mjs src/lib/database.types.ts supabase/migrations/20260902140000_product_catalogue.sql
git commit -m "One catalogue, two kinds, so a cafe can be a shop"
```

---

### Task 2: Storage and the upload route

**Files:**
- Create: `src/lib/media/validate.ts`
- Create: `src/lib/media/storage.ts`
- Create: `src/app/api/products/[id]/photo/route.ts`
- Modify: `db/test.mjs`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `Product` from Task 1, and `products.photo_path`.
- Produces:
  - `ACCEPTED_IMAGE_TYPES: readonly string[]`, `MAX_IMAGE_BYTES: number`
  - `assertUploadable(contentType: string | null, byteLength: number): { mediaType: string; extension: string }` which throws `MediaError`
  - `storageKey(businessId: string, productId: string, extension: string): string`
  - `class MediaError extends Error { readonly status: number }`
  - `uploadProductPhoto(args: { businessId, productId, bytes: ArrayBuffer, mediaType, extension }): Promise<string>` returning the stored key
  - `deleteStoredPhoto(path: string): Promise<void>`
  - `publicMediaUrl(path: string | null): string | null`
  - `POST /api/products/[id]/photo` (raw bytes), `DELETE /api/products/[id]/photo`

- [ ] **Step 1: Write the failing assertions in `db/test.mjs`**

Import at the top beside the other pure-module imports:

```js
import { assertUploadable, storageKey, MediaError, MAX_IMAGE_BYTES } from '../src/lib/media/validate.ts'
```

Add a section:

```js
console.log('\nproduct photos: what may be uploaded')
const okUpload = assertUploadable('image/webp', 40_000)
eq('a webp is accepted and names its extension', `${okUpload.mediaType} ${okUpload.extension}`, 'image/webp webp')
eq('a jpeg is accepted', assertUploadable('image/jpeg', 1000).extension, 'jpg')
eq('a png is accepted', assertUploadable('image/png', 1000).extension, 'png')
// The content type arrives from a phone and decides what we write to a public
// bucket, so anything unrecognised is refused rather than stored and guessed at.
const refuses = (type, size, why) => {
  try { assertUploadable(type, size); no(why, 'it was accepted') }
  catch (error) { error instanceof MediaError ? ok(`${why} (${error.status})`) : no(why, `wrong error type: ${error.message}`) }
}
refuses('image/gif', 1000, 'an animated gif is refused, since a menu photo is one frame')
refuses('application/pdf', 1000, 'a pdf is refused')
refuses(null, 1000, 'a missing content type is refused rather than assumed')
refuses('image/webp', MAX_IMAGE_BYTES + 1, 'an oversized image is refused before it reaches storage')
refuses('image/webp', 0, 'an empty body is refused')
// A content type may carry parameters, which a naive equality check rejects.
eq('a charset parameter does not break the check', assertUploadable('image/webp; charset=binary', 500).extension, 'webp')

console.log('\nproduct photos: where they are written')
const key = storageKey('b0000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'webp')
eq('the shop id leads the key, so one prefix is one shop', key.startsWith('b0000000-0000-4000-8000-000000000001/'), true)
eq('the product id follows it', key.split('/')[1], 'e2000000-0000-4000-8000-000000000001')
eq('and the file keeps its extension', key.endsWith('.webp'), true)
// Two uploads for one product must not collide, or replacing a photo would
// serve the old one from a CDN that already cached the name.
const second = storageKey('b0000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'webp')
eq('two uploads for the same product get different keys', key === second, false)
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run db:test`
Expected: FAIL, `Cannot find module '../src/lib/media/validate.ts'`.

- [ ] **Step 3: Write `src/lib/media/validate.ts`**

No `server-only` in this file: that import is what makes a module unimportable from `db/test.mjs`.

```ts
import { randomUUID } from 'node:crypto'

/**
 * The rules for a product photo, kept pure so they can be asserted.
 *
 * These decide what reaches a PUBLIC bucket, so they are deliberately a closed
 * allow list rather than a deny list. A type nobody recognised is refused, not
 * stored and guessed at later by whatever renders it.
 */
export class MediaError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'MediaError'
    this.status = status
  }
}

/** One frame, widely supported, and renderable by every phone browser in Cambodia. */
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXTENSIONS)

/** A shop owner photographs a plate of food on a phone. Six megabytes is generous for that. */
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024

export function assertUploadable(
  contentType: string | null,
  byteLength: number,
): { mediaType: string; extension: string } {
  // "image/webp; charset=binary" is a real header from a real client, so the
  // parameters are stripped rather than allowed to fail an equality check.
  const mediaType = contentType?.split(';')[0]?.trim().toLowerCase() ?? ''
  const extension = EXTENSIONS[mediaType]
  if (!extension) {
    throw new MediaError(415, `A photo must be ${ACCEPTED_IMAGE_TYPES.join(', ')}. This was ${contentType ?? 'not stated'}.`)
  }
  if (byteLength <= 0) throw new MediaError(400, 'That photo was empty.')
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new MediaError(413, `A photo must be under ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`)
  }
  return { mediaType, extension }
}

/**
 * Business id first, so a shop's media is one prefix to list and one prefix to
 * remove. The random segment is what lets a replacement photo take a new name:
 * reusing the key would serve the old picture from any cache in front of it.
 */
export function storageKey(businessId: string, productId: string, extension: string): string {
  return `${businessId}/${productId}/${randomUUID()}.${extension}`
}

export const MEDIA_BUCKET = 'shop-media'
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm run db:test`
Expected: PASS.

- [ ] **Step 5: Write `src/lib/media/storage.ts`**

```ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { MEDIA_BUCKET, MediaError, storageKey } from './validate.ts'

/**
 * Supabase Storage, which ARCHITECTURE.md reserved for exactly this and which
 * until now was provisioned and unused: `@supabase/supabase-js` was installed
 * for Storage and only ever used as the database client.
 *
 * A separate client from `src/lib/db.ts` because that one is typed against the
 * database schema and this one only moves bytes. Both use the service role,
 * which is the only way in: RLS is on everywhere with zero policies.
 */
let storageClient: ReturnType<typeof createClient> | undefined
function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    throw new MediaError(500, 'This deployment cannot store photos: Supabase is not configured.')
  }
  storageClient ??= createClient(url, key, { auth: { persistSession: false } })
  return storageClient.storage.from(MEDIA_BUCKET)
}

export async function uploadProductPhoto({
  businessId,
  productId,
  bytes,
  mediaType,
  extension,
}: {
  businessId: string
  productId: string
  bytes: ArrayBuffer
  mediaType: string
  extension: string
}): Promise<string> {
  const path = storageKey(businessId, productId, extension)
  const { error } = await storage().upload(path, bytes, { contentType: mediaType, upsert: false })
  if (error) throw new MediaError(502, `That photo could not be saved: ${error.message}`)
  return path
}

/** Best effort. A row that no longer points at a file matters; an orphaned file does not. */
export async function deleteStoredPhoto(path: string): Promise<void> {
  const { error } = await storage().remove([path])
  if (error) console.error('[media] photo not removed:', error.message)
}

/**
 * The bucket is public, so the URL is derivable and needs no round trip. Kept in
 * one place because `photo_path` stores a key: this is the only function that
 * knows the bucket is public, and the only one to change if that stops being true.
 */
export function publicMediaUrl(path: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!path || !base) return null
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`
}
```

- [ ] **Step 6: Write `src/app/api/products/[id]/photo/route.ts`**

Raw bytes as the body, matching `/api/transcribe` and for the same reason: base64 costs a third more bytes on a phone, and the blob's own content type is the media type.

```ts
import { NextResponse } from 'next/server'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost } from '@/lib/http/post.ts'
import { db } from '@/lib/db.ts'
import { requireDbData, throwIfDbError } from '@/lib/db-result.ts'
import { assertUploadable, MAX_IMAGE_BYTES, MediaError } from '@/lib/media/validate.ts'
import { deleteStoredPhoto, uploadProductPhoto } from '@/lib/media/storage.ts'

export const runtime = 'nodejs'
export const maxDuration = 30

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function failure(error: unknown) {
  if (error instanceof MediaError || error instanceof ApiRequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[products/photo]', error instanceof Error ? error.message : 'failed')
  return NextResponse.json({ error: 'that photo could not be saved' }, { status: 502 })
}

/** The product must be this member's, checked before a single byte is read. */
async function ownedProduct(businessId: string, id: string) {
  if (!UUID.test(id)) throw new ApiRequestError(404, 'no such product')
  const result = await db
    .from('products')
    .select('id, photo_path')
    .eq('id', id)
    .eq('business_id', businessId)
    .maybeSingle()
  throwIfDbError('load product for photo', result.error)
  if (!result.data) throw new ApiRequestError(404, 'no such product')
  return result.data
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { id } = await params
    const product = await ownedProduct(member.businessId, id)

    // Content-Length first, so an oversized upload is refused before the body is
    // read into memory rather than after.
    const declared = Number(req.headers.get('content-length') ?? '0')
    if (declared > MAX_IMAGE_BYTES) {
      throw new MediaError(413, `A photo must be under ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`)
    }
    const bytes = await req.arrayBuffer()
    const { mediaType, extension } = assertUploadable(req.headers.get('content-type'), bytes.byteLength)

    const path = await uploadProductPhoto({
      businessId: member.businessId,
      productId: product.id,
      bytes,
      mediaType,
      extension,
    })
    const saved = await db
      .from('products')
      .update({ photo_path: path, photo_alt: null })
      .eq('id', product.id)
      .eq('business_id', member.businessId)
      .select('id, photo_path')
      .single()
    requireDbData('save product photo', saved)

    // The old file goes only after the row points at the new one, so a failure
    // anywhere above leaves the product with the photo it already had.
    if (product.photo_path) await deleteStoredPhoto(product.photo_path)

    return NextResponse.json({ photo_path: path })
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { id } = await params
    const product = await ownedProduct(member.businessId, id)
    const cleared = await db
      .from('products')
      .update({ photo_path: null, photo_alt: null })
      .eq('id', product.id)
      .eq('business_id', member.businessId)
    throwIfDbError('clear product photo', cleared.error)
    if (product.photo_path) await deleteStoredPhoto(product.photo_path)
    return NextResponse.json({ photo_path: null })
  } catch (error) {
    return failure(error)
  }
}
```

- [ ] **Step 7: Record the bucket in `.env.example`**

In section 1, under the Supabase block, add:

```
# Product photos live in the PUBLIC `shop-media` bucket, created by the
# 20260902140000_product_catalogue migration. Public because a menu photo is
# shown to visitors who never sign in, so a signed URL costs a round trip and
# protects nothing. Written only by the service role above.
```

- [ ] **Step 8: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run db:test && npm run build
git add src/lib/media db/test.mjs .env.example src/app/api/products
git commit -m "A product photo has one place to live and one set of rules to get there"
```

---

### Task 3: The catalogue read layer, and the spine that counts it

**Files:**
- Create: `src/lib/queries/catalogue.ts`
- Modify: `src/lib/queries/business.ts`
- Modify: `src/lib/queries/setup.ts`
- Modify: `src/lib/queries/setup-progress.ts`
- Modify: `scripts/setup-progress-test.mjs`
- Modify: `src/app/app/page.tsx`

**Interfaces:**
- Consumes: `v_catalog` and `CatalogItem` from Task 1, `publicMediaUrl` from Task 2.
- Produces:
  - `listCatalogue(businessId: string, opts?: { search?: string; kind?: CatalogKind }): Promise<CatalogItem[]>`
  - `countCatalogue(businessId: string): Promise<number>`
  - `catalogueForAgent(businessId: string): Promise<Array<{ id, kind, name, name_en, price, price_minor, category, stock, duration_min, unit }>>`
  - `hasCatalogue(businessId)` keeps its signature and changes its meaning
  - `SetupProgressInput` gains `catalogueCount` in place of `serviceCount`

- [ ] **Step 1: Write `src/lib/queries/catalogue.ts`**

```ts
import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import { formatMoney, type CatalogItem, type CatalogKind, type CurrencyCode } from '../types.ts'

const COLUMNS =
  'kind, id, business_id, name, name_en, description, price_minor, currency, stock, category, photo_path, photo_alt, active, sort_order, duration_min, unit'

/**
 * What this shop sells, both kinds, in one read.
 *
 * `businessId` is an argument like every query here: RLS has zero policies, so a
 * query that forgets its tenant has nothing to catch it.
 *
 * Search is `ilike` on the name and nothing cleverer, because ARCHITECTURE.md
 * puts a shop under fifty items and a trigram index for fifty rows is a moving
 * part that earns nothing. The `%` and `_` in a search term are escaped, or a
 * customer typing "100%" matches the whole menu.
 */
export async function listCatalogue(
  businessId: string,
  opts: { search?: string; kind?: CatalogKind; includeInactive?: boolean } = {},
): Promise<CatalogItem[]> {
  let query = db.from('v_catalog').select(COLUMNS).eq('business_id', businessId)
  if (!opts.includeInactive) query = query.eq('active', true)
  if (opts.kind) query = query.eq('kind', opts.kind)
  if (opts.search?.trim()) {
    const term = opts.search.trim().replace(/[\\%_]/g, (match) => `\\${match}`)
    query = query.ilike('name', `%${term}%`)
  }
  const result = await query.order('kind').order('sort_order').order('name')
  throwIfDbError('load catalogue', result.error)
  return (result.data ?? []) as CatalogItem[]
}

export async function countCatalogue(businessId: string): Promise<number> {
  const result = await db
    .from('v_catalog')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('active', true)
  throwIfDbError('count catalogue', result.error)
  return result.count ?? 0
}

/**
 * The shape the assistant is given. Prices are pre-formatted here, because the
 * agent is forbidden from doing arithmetic on money and a formatted string is
 * the only thing it may repeat.
 */
export async function catalogueForAgent(businessId: string) {
  const items = await listCatalogue(businessId)
  return items.map((item) => ({
    id: item.id,
    kind: item.kind,
    name: item.name,
    name_en: item.name_en,
    price: formatMoney(item.price_minor, item.currency as CurrencyCode),
    price_minor: item.price_minor,
    category: item.category,
    // Null means uncounted, which is not zero: say so rather than implying none left.
    stock: item.stock,
    duration_min: item.duration_min,
    unit: item.unit,
  }))
}
```

- [ ] **Step 2: Point `hasCatalogue` at the catalogue**

In `src/lib/queries/business.ts`, replace the body of `hasCatalogue` and its comment:

```ts
/**
 * Does this shop have anything to sell yet, of either kind?
 *
 * It counted active `services` until 2 September 2026, which meant a cafe with a
 * full menu and no appointments answered false: the dashboard bounced it back to
 * onboarding forever and the setup spine never completed. It counts `v_catalog`,
 * so a menu is a catalogue and so is a price list.
 */
export async function hasCatalogue(businessId: string): Promise<boolean> {
  const result = await db
    .from('v_catalog')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('active', true)
  throwIfDbError('count catalogue', result.error)
  return (result.count ?? 0) > 0
}
```

- [ ] **Step 3: Rename the spine's count and change its words**

In `src/lib/queries/setup-progress.ts`, rename `serviceCount` to `catalogueCount` in `SetupProgressInput`, and change the catalogue row so it does not promise services to a cafe:

```ts
    {
      key: 'catalogue',
      label: 'បញ្ជីអ្វីដែលលក់',
      amount: input.hasCatalogue ? `${toKhmerDigits(input.catalogueCount)} មុខ` : 'គ្មានទេ',
      state: input.hasCatalogue ? 'done' : 'pending',
      error: null,
      href: '/app/products',
    },
```

- [ ] **Step 4: Feed it from the view**

In `src/lib/queries/setup.ts`, replace the services count in the parallel read with a `v_catalog` count and pass `catalogueCount`:

```ts
    db
      .from('v_catalog')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('active', true),
```

Rename the local `serviceCount` to `catalogueCount` and pass it through, keeping `hasCatalogue: catalogueCount > 0`.

- [ ] **Step 5: Update `scripts/setup-progress-test.mjs`**

Rename `serviceCount` to `catalogueCount` in the `input()` helper and in the existing catalogue assertion, then add:

```js
check('a cafe with only products has a catalogue, which is the bug this fixes', () => {
  const steps = byKey(deriveSetupProgress(input({ hasCatalogue: true, catalogueCount: 6 })))
  assert.equal(steps.catalogue.state, 'done')
  assert.ok(steps.catalogue.amount.includes('៦'), 'the count renders in Khmer digits')
})

check('the catalogue row never promises services, because a cafe has none', () => {
  const steps = byKey(deriveSetupProgress(input()))
  assert.ok(!steps.catalogue.label.includes('សេវា'), 'the label still says services')
})

check('the catalogue row sends the owner to the catalogue screen', () => {
  const steps = byKey(deriveSetupProgress(input()))
  assert.equal(steps.catalogue.href, '/app/products')
})
```

- [ ] **Step 6: Run the spine tests**

Run: `npm run test:setup`
Expected: PASS, including the three new checks.

- [ ] **Step 7: Fix the dashboard redirect**

In `src/app/app/page.tsx`, the redirect currently reads `if (snapshot.services.length === 0) redirect('/app/onboarding')`, which loops a menu-only cafe forever. Load the count and use it:

```ts
  const { countCatalogue } = await import('@/lib/queries/catalogue.ts')
  // A shop with nothing to sell has no day to plan, so the composer is the right
  // first screen. Counting SERVICES here sent a cafe with a full menu back to
  // onboarding on every visit, which is the same bug as the setup spine's.
  if ((await countCatalogue(member.businessId)) === 0) redirect('/app/onboarding')
```

Remove the `snapshot.services.length` condition.

- [ ] **Step 8: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run db:test && npm run test:setup && npm run build
git add src/lib/queries src/app/app/page.tsx scripts/setup-progress-test.mjs
git commit -m "A menu is a catalogue, so stop counting only services"
```

---

### Task 4: Product writes, and the owner's tools

**Files:**
- Create: `src/lib/products/write.ts`
- Create: `src/app/api/products/route.ts`
- Create: `src/app/api/products/[id]/route.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/agent/owner-tools.ts`
- Modify: `src/lib/agent/owner-prompt.ts`
- Modify: `src/lib/agent/categories.ts`
- Modify: `src/components/app/ask-moni.tsx`

**Interfaces:**
- Consumes: `listCatalogue` and `countCatalogue` from Task 3.
- Produces:
  - `createProduct(businessId, input): Promise<{ id: string; name: string }>`
  - `updateProduct(businessId, id, patch): Promise<{ name: string; changes: Record<string, unknown> }>`
  - `archiveProduct(businessId, id): Promise<{ name: string }>`
  - Owner tools `create_product`, `create_products_bulk`, `update_product`, `search_catalogue`
  - `GET/POST /api/products`, `PATCH/DELETE /api/products/[id]`

- [ ] **Step 1: Declare the tools in `src/lib/types.ts`**

Add to `OWNER_TOOLS` under the ORGANIZE group, keeping the group comments:

```ts
  'create_product',
  'create_products_bulk',
  'update_product',
  'search_catalogue',
```

`ownerTools()` is typed `satisfies Record<OwnerTool, Tool>`, so this is a compile error until Step 3 builds them. That is the guard working.

- [ ] **Step 2: Write `src/lib/products/write.ts`**

One module, two callers: the HTTP route and the agent tool. Both must validate identically, because the agent is not a trusted client.

```ts
import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import type { CurrencyCode } from '../types.ts'

export class ProductError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ProductError'
    this.status = status
  }
}

export type NewProduct = {
  name: string
  name_en?: string | null
  description?: string | null
  price_minor: number
  currency?: CurrencyCode
  stock?: number | null
  category?: string | null
}

/**
 * Create, update and archive, in one place, because the dashboard route and the
 * agent tool both do it and two copies is how they drift. The agent is not a
 * trusted client: it reaches the same validation the browser does.
 *
 * A price of zero is allowed and meaningful. The parse emits zero for a thing
 * the owner named without pricing, and the review screen asks for the number;
 * refusing it here would lose the item instead.
 */
function clean(input: NewProduct) {
  const name = input.name?.trim()
  if (!name) throw new ProductError(400, 'a product needs a name')
  if (!Number.isInteger(input.price_minor) || input.price_minor < 0) {
    throw new ProductError(400, 'a price is a whole number of minor units, and never negative')
  }
  if (input.stock != null && (!Number.isInteger(input.stock) || input.stock < 0)) {
    throw new ProductError(400, 'stock is a whole number, or null when the shop does not count it')
  }
  return {
    name,
    name_en: input.name_en?.trim() || null,
    description: input.description?.trim() || null,
    price_minor: input.price_minor,
    currency: input.currency ?? 'KHR',
    stock: input.stock ?? null,
    category: input.category?.trim() || null,
  }
}

export async function createProduct(businessId: string, input: NewProduct) {
  const row = clean(input)
  const saved = await db
    .from('products')
    .insert({ business_id: businessId, ...row })
    .select('id, name')
    .single()
  return requireDbData('create product', saved)
}

export async function createProductsBulk(businessId: string, items: NewProduct[]) {
  if (items.length === 0) throw new ProductError(400, 'nothing to add')
  if (items.length > 100) throw new ProductError(400, 'refusing to add more than 100 products at once')
  const rows = items.map((item) => ({ business_id: businessId, ...clean(item) }))
  const saved = await db.from('products').insert(rows).select('id, name')
  throwIfDbError('create products', saved.error)
  return saved.data ?? []
}

export async function updateProduct(
  businessId: string,
  id: string,
  patch: Partial<NewProduct> & { active?: boolean },
) {
  // Built field by field rather than through Object.fromEntries, because the
  // generated update type rejects an index signature that can hold null. Same
  // reason as update_service in owner-tools.ts.
  const next: Record<string, unknown> = {}
  if (patch.name != null) next.name = patch.name.trim()
  if (patch.name_en !== undefined) next.name_en = patch.name_en?.trim() || null
  if (patch.description !== undefined) next.description = patch.description?.trim() || null
  if (patch.price_minor != null) {
    if (!Number.isInteger(patch.price_minor) || patch.price_minor < 0) {
      throw new ProductError(400, 'a price is a whole number of minor units, and never negative')
    }
    next.price_minor = patch.price_minor
  }
  if (patch.stock !== undefined) next.stock = patch.stock
  if (patch.category !== undefined) next.category = patch.category?.trim() || null
  if (patch.active != null) next.active = patch.active
  if (Object.keys(next).length === 0) throw new ProductError(400, 'nothing to change')

  const saved = await db
    .from('products')
    .update(next)
    .eq('id', id)
    .eq('business_id', businessId)
    .select('name')
    .single()
  const row = requireDbData('update product', saved)
  return { name: row.name, changes: next }
}

/** Archived, never deleted: an order_items row snapshots its name, and history must stay readable. */
export async function archiveProduct(businessId: string, id: string) {
  const saved = await db
    .from('products')
    .update({ active: false })
    .eq('id', id)
    .eq('business_id', businessId)
    .select('name')
    .single()
  return requireDbData('archive product', saved)
}
```

- [ ] **Step 3: Add the four owner tools**

In `src/lib/agent/owner-tools.ts`, import `createProduct`, `createProductsBulk`, `updateProduct` from `../products/write.ts` and `listCatalogue` from `../queries/catalogue.ts`, then add under the ORGANIZE group:

```ts
    create_product: tool({
      description:
        'ORGANIZE. Add one thing the shop SELLS rather than does: a drink, a dish, a part, a bottle of shampoo. Use create_service instead for work that takes time and gets booked.',
      inputSchema: z.object({
        name: z.string().describe("in the owner's own words, Khmer is fine"),
        name_en: z.string().nullable().optional(),
        price_minor: z.number().int().min(0).describe('minor units. 5000 means 5,000 riel. Use 0 when she has not said a price'),
        currency: z.enum(['KHR', 'USD']).default('KHR'),
        category: z.string().nullable().optional().describe('the menu grouping in her words, such as ភេសជ្ជៈ, or null'),
        stock: z.number().int().min(0).nullable().optional().describe('leave null unless she counts this item'),
      }),
      execute: async ({ name, name_en, price_minor, currency, category, stock }) => {
        const product = await createProduct(businessId, { name, name_en, price_minor, currency, category, stock })
        return { added: product.name, id: product.id }
      },
    }),

    create_products_bulk: tool({
      description:
        'ORGANIZE. Add a whole menu or price list at once. Use this when the owner lists several things in one message, so a fifteen item menu is one call and not fifteen.',
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
        const added = await createProductsBulk(businessId, items.map((item) => ({ ...item, currency })))
        return { added: added.length, names: added.map((row) => row.name) }
      },
    }),

    update_product: tool({
      description: 'ORGANIZE. Change a product price, name, category, stock, or take it off the menu with active false.',
      inputSchema: z.object({
        product_id: z.string().uuid(),
        name: z.string().nullable().optional(),
        price_minor: z.number().int().min(0).nullable().optional(),
        category: z.string().nullable().optional(),
        stock: z.number().int().min(0).nullable().optional(),
        active: z.boolean().nullable().optional(),
      }),
      execute: async ({ product_id, name, price_minor, category, stock, active }) => {
        const patch: Record<string, unknown> = {}
        if (name != null) patch.name = name
        if (price_minor != null) patch.price_minor = price_minor
        if (category !== undefined) patch.category = category
        if (stock !== undefined) patch.stock = stock
        if (active != null) patch.active = active
        return updateProduct(businessId, product_id, patch)
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
```

- [ ] **Step 4: Teach the owner prompt the difference**

In `src/lib/agent/owner-prompt.ts`, extend the ORGANIZE line:

```
- ORGANIZE the shop: services and prices, products and a menu, staff and rooms and bays, opening hours, closures. A SERVICE is work that takes time and gets booked, like a haircut. A PRODUCT is a thing handed over, like a coffee or a phone case. A cafe has products, a salon has services, a repair shop has both. If she lists several things at once, add them in one call.
```

- [ ] **Step 5: Add starting points**

In `src/lib/agent/categories.ts`, add two examples to the `organize` group:

```ts
      'បន្ថែមម៉ឺនុយ៖ កាហ្វេទឹកកក ៥០០០៛ តែជូរ ៤០០០៛',
      'ដំឡើងតម្លៃកាហ្វេទៅ ៦០០០៛',
```

`categoryExamples()` in `src/components/app/ask-moni.tsx` indexes `ASK_CATEGORIES[1].examples` by position for the organize pair. Point it at the two new ones so a cafe owner sees a menu example rather than a haircut one.

- [ ] **Step 6: Write the HTTP routes**

`src/app/api/products/route.ts` with `GET` (list, optional `?search=` and `?kind=`) and `POST` (create), and `src/app/api/products/[id]/route.ts` with `PATCH` (update) and `DELETE` (archive). Follow the shape of `src/app/api/money/route.ts` exactly: `assertSameOriginBrowserPost`, `requireMemberApi`, a strict zod body, and one `failure()` helper that maps `ProductError` and `ApiRequestError` to their status and everything else to a logged 502.

- [ ] **Step 7: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run db:test && npm run build
git add src/lib/products src/lib/types.ts src/lib/agent src/app/api/products src/components/app/ask-moni.tsx
git commit -m "The owner can put a menu in her shop, by hand or by asking"
```

---

### Task 5: Generated photos, and an honest refusal

**Files:**
- Modify: `src/lib/ai/models.ts`
- Create: `src/lib/ai/product-photo.ts`
- Modify: `src/app/api/products/[id]/photo/route.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/agent/owner-tools.ts`
- Modify: `scripts/models-test.mjs`

**Interfaces:**
- Consumes: `uploadProductPhoto` from Task 2, `withFallback` and `Task` from `models.ts`.
- Produces:
  - `Task` gains `'image'`
  - `generateProductPhoto(args: { name, description, businessType, shopName }): Promise<GeneratedPhoto>` where `GeneratedPhoto` is `{ ok: true; bytes: ArrayBuffer; mediaType: string; model: string } | { ok: false; reason: 'unavailable' | 'quota' | 'slow' | 'failed'; message: string }`
  - Owner tool `generate_product_photo`
  - `PUT /api/products/[id]/photo`

- [ ] **Step 1: Add the image task to `src/lib/ai/models.ts`**

Extend `Task` with `'image'`, add the chain to `DEFAULTS`, and add its budget. The model ids were verified against the live key on 2 September 2026:

```ts
  // A product photo for a menu. Verified against the live model list: six image
  // models are visible to the key, and the free tier's DAILY per-model quota for
  // every one of them was already spent, so this chain is expected to be refused
  // until billing is enabled. It ships anyway, because the refusal is reported to
  // the owner and the upload button sits beside it.
  image: [
    'google/gemini-3.1-flash-image',
    'google:gemini-3.1-flash-image',
    'google:gemini-3.1-flash-lite-image',
  ],
```

In `BUDGET`, add `image: { total: 50_000, perAttempt: 25_000 }`, since an image is slower than a sentence and the route allows sixty seconds.

Add `'google/gemini-3.1-flash-image'` and its direct siblings to `RATES`. Image pricing is per image rather than per token, so record the token rates as zero and add a comment saying the figure comes from the provider's per-image price and that `costMicroUsd` under-reports it until that is modelled. Under-reporting your own cost is the failure that hurts, so it must be visible in the file rather than silent.

- [ ] **Step 2: Write `src/lib/ai/product-photo.ts`**

```ts
import 'server-only'
import { generateText } from 'ai'
import { withFallback } from './models.ts'

/**
 * A photo for one product, generated from what the shop already told us.
 *
 * The refusal is a RESULT, not an exception. Verified on 2 September 2026: every
 * image model the key can see answers 429 with the free tier's daily per-model
 * quota spent, and the gateway refuses them outright on its free tier. A feature
 * that cannot run today must still be reachable and must say why, because the
 * owner's next move differs: enable billing, wait for tomorrow, or upload.
 *
 * No text in the image, ever. A generated photo carrying invented Khmer words
 * puts a lie on a real shop's menu, and letters are exactly what image models
 * get wrong.
 */
export type GeneratedPhoto =
  | { ok: true; bytes: ArrayBuffer; mediaType: string; model: string }
  | { ok: false; reason: 'unavailable' | 'quota' | 'slow' | 'failed'; message: string }

const KHMER_REASON: Record<Exclude<GeneratedPhoto & { ok: false }, never>['reason'], string> = {
  unavailable: 'គណនី AI នេះមិនទាន់អាចបង្កើតរូបភាពបានទេ។ សូមបញ្ចូលរូបពីទូរស័ព្ទរបស់អ្នកជំនួស។',
  quota: 'ចំនួនរូបភាពឥតគិតថ្លៃថ្ងៃនេះអស់ហើយ។ សូមសាកថ្ងៃស្អែក ឬបញ្ចូលរូបពីទូរស័ព្ទរបស់អ្នក។',
  slow: 'ការបង្កើតរូបភាពយឺតពេក។ សូមសាកម្តងទៀត ឬបញ្ចូលរូបពីទូរស័ព្ទរបស់អ្នក។',
  failed: 'មិនអាចបង្កើតរូបភាពបានទេ។ សូមបញ្ចូលរូបពីទូរស័ព្ទរបស់អ្នកជំនួស។',
}

function classify(message: string): Exclude<GeneratedPhoto & { ok: false }, never>['reason'] {
  if (/did not answer within/i.test(message)) return 'slow'
  if (/free tier|do not have access|not available on your plan|payment required/i.test(message)) return 'unavailable'
  if (/quota|exhausted|RESOURCE_EXHAUSTED|429/i.test(message)) return 'quota'
  return 'failed'
}

export async function generateProductPhoto(input: {
  name: string
  description: string | null
  businessType: string
  shopName: string
}): Promise<GeneratedPhoto> {
  const prompt = [
    `A clean product photograph of "${input.name}"`,
    input.description ? `, described by the shop as: ${input.description}` : '',
    `, sold by a small ${input.businessType} in Cambodia.`,
    ' Plain neutral background, soft even lighting, the item centred and filling the frame, square crop, photographic and realistic.',
    ' Absolutely no text, no letters, no numbers, no logo, no watermark, no hands, no people.',
  ].join('')

  try {
    const { result, ref } = await withFallback('image', (model, _ref, abortSignal) =>
      generateText({ model, prompt, abortSignal }),
    )
    const file = result.files?.find((candidate) => candidate.mediaType?.startsWith('image/'))
    if (!file) {
      return { ok: false, reason: 'failed', message: KHMER_REASON.failed }
    }
    return {
      ok: true,
      bytes: file.uint8Array.slice().buffer as ArrayBuffer,
      mediaType: file.mediaType,
      model: ref,
    }
  } catch (error) {
    const reason = classify(error instanceof Error ? error.message : String(error))
    console.warn(`[product-photo] generation refused (${reason})`)
    return { ok: false, reason, message: KHMER_REASON[reason] }
  }
}
```

Check the AI SDK's own file-part shape in `node_modules/ai` before relying on `result.files`; if the installed version exposes generated images differently, use what it exposes and keep the return type above unchanged.

- [ ] **Step 3: Add `PUT` to the photo route**

In `src/app/api/products/[id]/photo/route.ts`, add a `PUT` handler that loads the product's name and description plus the shop's name and type, calls `generateProductPhoto`, and on `ok: false` returns `{ error: message, reason }` with status 503 for `unavailable` and `quota`, 504 for `slow`, and 502 for `failed`. On success it uploads through `uploadProductPhoto` with the returned media type and writes `photo_path`, reusing the same replace-then-delete order as `POST`.

Set `export const maxDuration = 60` on the route, since the image budget is fifty seconds.

- [ ] **Step 4: Add the owner tool**

Declare `generate_product_photo` in `OWNER_TOOLS` and build it in `ownerTools()`:

```ts
    generate_product_photo: tool({
      description:
        'ORGANIZE. Draw a photo for a product that has none, from what the shop already told us. It can be refused, and when it is, say the reason and tell her she can add a photo from her phone on the catalogue screen.',
      inputSchema: z.object({ product_id: z.string().uuid() }),
      execute: async ({ product_id }) => {
        const productResult = await db
          .from('products')
          .select('id, name, description')
          .eq('id', product_id)
          .eq('business_id', businessId)
          .maybeSingle()
        const product = productResult.data
        if (!product) return { error: 'no such product in this shop' }
        const businessResult = await db
          .from('businesses')
          .select('name, business_type')
          .eq('id', businessId)
          .single()
        const shop = requireDbData('load shop for product photo', businessResult)

        const photo = await generateProductPhoto({
          name: product.name,
          description: product.description,
          businessType: shop.business_type,
          shopName: shop.name,
        })
        if (!photo.ok) return { refused: photo.reason, message: photo.message, upload_on: '/app/products' }

        const path = await uploadProductPhoto({
          businessId,
          productId: product.id,
          bytes: photo.bytes,
          mediaType: photo.mediaType,
          extension: photo.mediaType === 'image/png' ? 'png' : 'jpg',
        })
        await db.from('products').update({ photo_path: path }).eq('id', product.id).eq('business_id', businessId)
        return { drawn: product.name, model: photo.model }
      },
    }),
```

Render it in `ask-moni.tsx`'s `ownerStep()` so a refusal reads as a sentence and not as a generic "Moni finished".

- [ ] **Step 5: Add assertions to `scripts/models-test.mjs`**

```js
await check('the image task has a chain, so a photo has somewhere to come from', () => {
  process.env.MONI_MODEL_IMAGE = 'google/pic,google:pic2'
  try {
    assert.deepEqual(modelsFor('image').map((c) => c.ref), ['google/pic', 'google:pic2'])
  } finally {
    delete process.env.MONI_MODEL_IMAGE
  }
})

await check('a plan refusal on an image model is an entitlement, not a stall', async () => {
  process.env.MONI_MODEL_IMAGE = 'google/pic,google:pic2'
  try {
    const tried = []
    const { ref } = await withFallback('image', async (_model, r) => {
      tried.push(r)
      if (r === 'google/pic') throw new Error(ENTITLEMENT)
      return 'drawn'
    })
    assert.deepEqual(tried, ['google/pic', 'google:pic2'])
    assert.equal(ref, 'google:pic2')
  } finally {
    delete process.env.MONI_MODEL_IMAGE
  }
})
```

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run test:models && npm run build
git add src/lib/ai src/app/api/products src/lib/types.ts src/lib/agent scripts/models-test.mjs src/components/app/ask-moni.tsx
git commit -m "Draw a product photo, and say plainly when the plan will not"
```

---

### Task 6: The assistant sells what the shop sells

**Files:**
- Modify: `src/lib/agent/tools.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/agent/prompt.ts`
- Modify: `src/components/app/chat-panel.tsx`

**Interfaces:**
- Consumes: `catalogueForAgent` and `listCatalogue` from Task 3.
- Produces: `customerTools()` typed `satisfies Record<CustomerTool, Tool>`, `get_business` returning `catalogue`, and a customer `search_catalogue`.

- [ ] **Step 1: Add `search_catalogue` to `CUSTOMER_TOOLS` and add the guard**

In `src/lib/types.ts`, add `'search_catalogue'` to `CUSTOMER_TOOLS`. In `src/lib/agent/tools.ts`, import `type Tool` from `ai` and `type CustomerTool` from `../types.ts`, then close `customerTools()` with `} satisfies Record<CustomerTool, Tool>`.

Expect this to fail to compile at first. The owner set had three declared tools that were never built and four built that were never declared, and that was only found when the same guard was added there. Reconcile the two lists rather than deleting the guard.

- [ ] **Step 2: Return the catalogue from `get_business`**

In `get_business`, keep everything it already returns and replace the `services` array with the catalogue, so a cafe's customer is not told the shop offers nothing:

```ts
        // Both kinds. `v_agent_business` carries services only, which is correct
        // for the booking half and useless to a cafe, so the catalogue is read
        // beside it rather than by widening a view four callers depend on.
        catalogue: await catalogueForAgent(businessId),
```

Keep `services` too, populated from the same call filtered to `kind === 'service'`, because `list_slots` and `create_booking` take a service id and the model must not be handed a product id where a service belongs. Say exactly that in the field description.

- [ ] **Step 3: Add the customer-side search tool**

```ts
    search_catalogue: tool({
      description:
        'Look up what the shop sells by name, services and products together. Use it when the customer asks whether the shop has something, or what it costs. Quote only what this returns.',
      inputSchema: z.object({ query: z.string().trim().max(80) }),
      execute: async ({ query }) => {
        const items = await listCatalogue(businessId, { search: query })
        return {
          found: items.length,
          items: items.map((item) => ({
            id: item.id,
            kind: item.kind,
            name: item.name,
            price: formatMoney(item.price_minor, item.currency as CurrencyCode),
            // Only a service can be booked, and the model must not offer a time
            // for a cup of coffee.
            bookable: item.kind === 'service',
          })),
        }
      },
    }),
```

- [ ] **Step 4: Teach the customer prompt that some shops sell things**

In `src/lib/agent/prompt.ts`, add after the booking flow paragraph:

```
Some shops sell things rather than book time. A product has a price and no appointment, so never offer a time for one and never call list_slots for it. If a customer asks for something the shop sells, quote the price from get_business or search_catalogue, say it is available at the shop, and hand over to the owner if they want it delivered or reserved. Only a service can be booked.
```

- [ ] **Step 5: Label the new tool in the web chat**

In `src/components/app/chat-panel.tsx`, add to `CUSTOMER_STEP`:

```ts
  search_catalogue: 'Moni បានរកមើលអ្វីដែលហាងលក់',
```

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run db:test && npm run build
git add src/lib/agent src/lib/types.ts src/components/app/chat-panel.tsx
git commit -m "A customer can ask a cafe what it sells and get an answer from rows"
```

---

### Task 7: The catalogue screen

**Files:**
- Create: `src/app/app/products/page.tsx`
- Create: `src/components/app/product-list.tsx`
- Create: `src/components/app/product-photo.tsx`
- Modify: `src/components/app/desktop-nav.tsx`
- Modify: `CREDITS.md`

**Interfaces:**
- Consumes: `listCatalogue` from Task 3, the product routes from Task 4, the photo routes from Tasks 2 and 5, `publicMediaUrl` from Task 2, `sellsFor` from Task 1.
- Produces: `/app/products` in `APP_DESTINATIONS`.

- [ ] **Step 1: Select the component before writing any markup**

Per the sourcing rule, check Beautiful UI first for a records or catalogue table with an inline editor and an image cell. The vendored `src/components/primitives/RecordsTable.tsx` is the first candidate and is already installed. If it fits, fork it the way `setup-tasks.tsx` forked Task Rows: prop-driven, no scripted data, and leave the original untouched because other surfaces depend on it.

If nothing fits, stop and report the gap rather than hand-drawing a table.

Record the choice and its source URL in `CREDITS.md` either way.

- [ ] **Step 2: Write the page**

`src/app/app/products/page.tsx`, following `src/app/app/money/page.tsx` exactly: `export const dynamic = 'force-dynamic'`, a `metadata` title, dynamic imports of the query modules so a clean clone still builds, `requireMember()`, then `AppShell` with the heading and the list.

Load `listCatalogue(member.businessId, { includeInactive: true })` and `getBusinessById`, and pass `sellsFor(business.business_type)` so the screen leads with products for a cafe and with services for a salon.

- [ ] **Step 3: Write `src/components/app/product-list.tsx`**

A client component that takes `items: CatalogItem[]`, `photoUrls: Record<string, string | null>` and `leadWith: Sells`. It renders a search box filtering client-side over the already-loaded rows, a group per `category`, and each row with its photo, name, price through `formatMoney`, and stock when counted.

Adding and editing call `POST /api/products` and `PATCH /api/products/[id]`. No database access and no business logic in the component: it takes props and calls the HTTP contracts.

Services render read-only here with a link to the setup sheet that already edits them, so this screen never becomes a second implementation of service editing.

- [ ] **Step 4: Write `src/components/app/product-photo.tsx`**

One product's photo cell: the image when there is one, an upload input accepting `image/jpeg,image/png,image/webp`, and a generate button.

Upload posts the `File` object straight as the body with its own `type` as the content type, matching the raw-bytes contract:

```ts
await fetch(`/api/products/${id}/photo`, { method: 'POST', headers: { 'content-type': file.type }, body: file })
```

The generate button calls `PUT` on the same path. On a refusal it shows `body.error` verbatim beside the upload input, because the message is already the owner's own language and the whole point is that she can act on it.

- [ ] **Step 5: Add the destination**

In `src/components/app/desktop-nav.tsx`, add to `APP_DESTINATIONS` after `/app` and before `/app/inbox`:

```ts
  { href: '/app/products', label: 'អ្វីដែលលក់', Icon: Package },
```

Import `Package` from lucide-react. The mobile bar keeps its first three entries and the rest fall into the existing "more" sheet with no change to `tab-bar.tsx`.

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run build
lsof -ti:3000 | xargs kill -9 2>/dev/null; npm run start &
npm run shoot
```

Review the captures: no horizontal overflow, Khmer readable at 1.75 line height, the reduced-motion shot still legible, and the marketing captures unchanged.

```bash
git add src/app/app/products src/components/app/product-list.tsx src/components/app/product-photo.tsx src/components/app/desktop-nav.tsx CREDITS.md
git commit -m "The owner can see and edit her menu"
```

---

### Task 8: The menu on the shop's own site

**Files:**
- Modify: `src/lib/queries/storefront.ts`
- Modify: `src/themes/types.ts`
- Modify: `src/themes/shared.ts`
- Modify: `src/themes/registry.tsx`
- Modify: `db/test.mjs`
- Modify: `PLAN.md`, `CLAUDE.md`, `docs/ONBOARDING.md`

**Interfaces:**
- Consumes: `listCatalogue` from Task 3, `publicMediaUrl` from Task 2.
- Produces: `StorefrontData['items']` replacing `StorefrontData['services']`, each carrying `kind`, `photoUrl`, `category`.

- [ ] **Step 1: Widen `StorefrontData`**

In `src/themes/types.ts`, rename `services` to `items` and give each entry `kind: CatalogKind`, `photoUrl: string | null` and `category: string | null`, keeping `durationMin` and `unit` nullable for a product.

Renaming rather than adding a second array is deliberate: two arrays means every theme decides how to interleave them, and four themes will decide four different ways.

- [ ] **Step 2: Read the view in `getStorefront`**

Replace the `services` read with `listCatalogue(business.id)` and map `photo_path` through `publicMediaUrl`. Everything else in that function stays, including the rule that an unpublished shop returns null so a shop that never pressed publish has no site.

- [ ] **Step 3: Render items in the four themes**

In `src/themes/registry.tsx`, the shared `Services` component becomes `Items` and renders a photo when one exists, at a fixed aspect ratio with `object-cover`, and grouped by `category` when any item has one. A product shows its price and no duration. Every theme keeps its own layout, which is the point of having four.

An item without a photo renders as a named row. A menu must read correctly for a shop that uploaded nothing, so the photo is an enhancement and never the layout's skeleton.

Use `next/image` only if the Supabase host is already configured in `next.config.ts`; otherwise a plain `img` with `loading="lazy"` and explicit `width`/`height`, with an eslint-disable comment naming the reason, matching how the QR card is rendered elsewhere.

- [ ] **Step 4: Add the storefront assertion to `db/test.mjs`**

```js
console.log('\nthe shop site shows what the shop sells')
// The storefront read is a query, not a pure function, so what is asserted here
// is the contract it depends on: the view answers for a shop with no services,
// which is the whole cafe case, and it answers with the photo key.
const cafeSite = await db.query(
  `select kind, name, photo_path from v_catalog where business_id = '${B_CAFE}' and active`)
eq('a cafe site has rows to render', cafeSite.rows.length > 0, true)
eq('and every one of them is a product', cafeSite.rows.every((r) => r.kind === 'product'), true)
```

- [ ] **Step 5: Update the documents in the same commit**

Per guardrail 8, the document and the code never disagree for more than one commit.

- `PLAN.md`: add Phase 11 describing what shipped, in the style of Phase 10, including that image generation is reachable and refused until billing is enabled.
- `CLAUDE.md`: add to the decided list that a catalogue is `v_catalog`, that `photo_path` is a Storage key and never a URL, and that `sells` lives on the business type rather than in a column.
- `docs/ONBOARDING.md`: the spine's catalogue row counts the catalogue and links to `/app/products`.

- [ ] **Step 6: Full verification and commit**

```bash
npx tsc --noEmit && npm run lint && npm run db:test && npm run test:setup && npm run test:models && npm run test:signals && npm run build
lsof -ti:3000 | xargs kill -9 2>/dev/null; npm run start &
npm run shoot
```

Then confirm by hand that a cafe with a menu and no services renders its menu at `/s/{slug}` once published.

```bash
git add src/lib/queries/storefront.ts src/themes db/test.mjs PLAN.md CLAUDE.md docs/ONBOARDING.md
git commit -m "A cafe's menu is its shop site"
```

---

## Self-Review

**Spec coverage.** Scope A is Task 1. B is Task 2. C is Task 5. D is Tasks 4 and 6. E is Task 7. F is Task 8. G is Task 3. The spec's non-goals are untouched: no ordering tool, no job queue, no `capabilities` column, no variants.

**Placeholders.** None. Task 7 deliberately defers the component choice to a sourcing search rather than naming markup, which is what the sourcing rule requires; it names the first candidate, the fork precedent, and the instruction to stop and report if nothing fits.

**Type consistency.** `CatalogItem` is defined in Task 1 and consumed by Tasks 3, 6, 7 and 8 under that name. `photo_path` is the column everywhere, `photoUrl` is the rendered value in `StorefrontData` only, and `publicMediaUrl` is the single conversion. `catalogueCount` replaces `serviceCount` in Task 3 and nothing later refers to `serviceCount`. `MediaError`, `ProductError` and `GeneratedPhoto` are each defined once and imported by name.
