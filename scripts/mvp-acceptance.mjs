import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { register } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const demoSlug = 'sokha-beauty'
const checks = []
const cleanupNotes = []
const testEventIds = new Set()
const testExternalIds = new Set()
const serverOutput = []
let serverProcess = null
let snapshot = null
let db = null
let eventCursor = 0
let baseUrl = process.env.MONI_ACCEPTANCE_BASE_URL?.replace(/\/$/, '') ?? null

function parseEnv(text) {
  const parsed = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    parsed[match[1]] = value
  }
  return parsed
}

async function loadLocalEnv() {
  try {
    const local = parseEnv(await fs.readFile(path.join(projectRoot, '.env.local'), 'utf8'))
    for (const [key, value] of Object.entries(local)) {
      if (!process.env[key]) process.env[key] = value
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

function scrub(value) {
  let text = String(value ?? '')
  for (const name of [
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'GEMINI_API_KEY',
    'ANTHROPIC_API_KEY',
  ]) {
    const secret = process.env[name]
    if (secret && secret.length >= 8) text = text.split(secret).join('[redacted]')
  }
  return text
    .replace(/\b(?:sbp|vcp)_[A-Za-z0-9_-]+\b/g, '[redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]{30,}(?:\.[A-Za-z0-9_-]+){1,2}\b/g, '[redacted]')
}

async function check(name, fn) {
  const started = Date.now()
  try {
    const detail = await fn()
    checks.push({ name, status: 'pass', detail: detail || '', ms: Date.now() - started })
    const printable = ['string', 'number', 'boolean'].includes(typeof detail) ? String(detail) : detail ? 'verified' : ''
    process.stdout.write(`  ✓ ${name}${printable ? `: ${printable}` : ''}\n`)
    return detail
  } catch (error) {
    const message = scrub(error instanceof Error ? error.message : error)
    checks.push({ name, status: 'fail', detail: message, ms: Date.now() - started })
    process.stdout.write(`  ✗ ${name}: ${message}\n`)
    throw error
  }
}

async function testSourceWiring() {
  const [page, askMoni, secondaryTools] = await Promise.all([
    fs.readFile(path.join(projectRoot, 'src/app/app/page.tsx'), 'utf8'),
    fs.readFile(path.join(projectRoot, 'src/components/app/ask-moni.tsx'), 'utf8'),
    fs.readFile(path.join(projectRoot, 'src/components/app/secondary-tools.tsx'), 'utf8'),
  ])
  await check('owner UI is wired to the live server snapshot', () => {
    assert.match(page, /await\s+getDashboardSnapshot\s*\(/)
    assert.doesNotMatch(page, /from\s+['"]@\/lib\/demo/)
    return 'RSC reads Supabase, not fixtures'
  })
  await check('the owner surface resolves its tenant from the session', () => {
    // Phase 2. The dashboard reads one shop, and which shop is decided by
    // requireMember(), never by a slug the browser could change.
    assert.match(page, /await\s+requireMember\s*\(\s*\)/)
    assert.match(page, /getDashboardSnapshot\s*\(\s*member\.businessId\s*\)/)
    assert.doesNotMatch(askMoni, /slug/)
    return 'requireMember() to businessId, no tenant in the client'
  })
  await check('an empty shop is sent to the composer, not to a page of zeroes', () => {
    // Phase 3. Onboarding is the first screen a member sees, so the dashboard
    // has to hand over rather than render a shop with nothing in it.
    assert.match(page, /snapshot\.services\.length === 0/)
    assert.match(page, /redirect\(['"]\/app\/onboarding['"]\)/)
    return '/app to /app/onboarding while the catalogue is empty'
  })
  await check('owner and setup mutations trigger a server refresh', () => {
    assert.match(askMoni, /startTransition\s*\(\s*\(\)\s*=>\s*router\.refresh\s*\(\s*\)\s*\)/)
    assert.match(secondaryTools, /startTransition\s*\(\s*\(\)\s*=>\s*router\.refresh\s*\(\s*\)\s*\)/)
    assert.match(secondaryTools, /<ShopSetup\s+onSaved=\{refresh\}/)
    assert.match(secondaryTools, /<ChatPanel\s+onChanged=\{refresh\}/)
    return 'router.refresh follows every write surface'
  })
}

function expectNoError(label, result) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

async function freePort() {
  const server = net.createServer()
  server.unref()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : null
  server.close()
  await once(server, 'close')
  if (!port) throw new Error('could not reserve a local port')
  return port
}

async function waitForServer(url, timeoutMs = 75_000) {
  const deadline = Date.now() + timeoutMs
  let last = 'no response'
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/app`, { signal: AbortSignal.timeout(5_000) })
      if (response.status < 500) return
      last = `HTTP ${response.status}`
    } catch (error) {
      last = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`local Next server did not become ready: ${last}`)
}

async function startServer() {
  if (baseUrl) {
    await waitForServer(baseUrl)
    return 'using MONI_ACCEPTANCE_BASE_URL'
  }

  const port = await freePort()
  baseUrl = `http://127.0.0.1:${port}`
  serverProcess = spawn(
    path.join(projectRoot, 'node_modules', '.bin', 'next'),
    ['dev', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      cwd: projectRoot,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  const collect = (chunk) => {
    serverOutput.push(scrub(chunk))
    if (serverOutput.length > 80) serverOutput.shift()
  }
  serverProcess.stdout.on('data', collect)
  serverProcess.stderr.on('data', collect)
  await waitForServer(baseUrl)
  return `started isolated local server on port ${port}`
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode != null) return
  serverProcess.kill('SIGTERM')
  await Promise.race([
    once(serverProcess, 'exit'),
    new Promise((resolve) => setTimeout(resolve, 4_000)),
  ])
  if (serverProcess.exitCode == null) serverProcess.kill('SIGKILL')
}

function browserHeaders(extra = {}) {
  const origin = new URL(baseUrl).origin
  return {
    origin,
    'sec-fetch-site': 'same-origin',
    'content-type': 'application/json',
    ...extra,
  }
}

async function post(route, body, options = {}) {
  const headers = browserHeaders(options.headers)
  if (options.cookie) headers.cookie = options.cookie
  const response = await fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    redirect: 'manual',
    signal: AbortSignal.timeout(options.timeout ?? 90_000),
  })
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { raw: (await response.text()).slice(0, 500) }
  return { response, payload, cookie: cookieFrom(response) }
}

/**
 * Owner routes are authenticated since PLAN.md Phase 2: `/api/ask` and
 * `/api/setup` resolve the tenant from the Clerk session, so this harness needs
 * a real session cookie for a waitlisted member. Export it as
 * MONI_ACCEPTANCE_OWNER_COOKIE (the `__session=...` pair from a signed-in
 * browser, or a Clerk testing token session). Customer routes stay anonymous,
 * because customers never sign in.
 *
 * That session must OWN the demo business: set
 * `businesses.clerk_user_id = '<the Clerk user id>'` on sokha-beauty first.
 * Otherwise setup writes to one shop and the customer checks read another, and
 * the failure shows up as a price that did not persist rather than as a wiring
 * mistake.
 */
function ownerCookie() {
  return process.env.MONI_ACCEPTANCE_OWNER_COOKIE?.trim() || null
}

async function ownerPost(route, body, options = {}) {
  const cookie = [options.cookie, ownerCookie()].filter(Boolean).join('; ')
  return post(route, body, { ...options, cookie: cookie || undefined })
}

function cookieFrom(response) {
  const header = response.headers.get('set-cookie')
  return header ? header.split(';', 1)[0] : null
}

function visitorExternalId(cookie) {
  assert(cookie, 'chat did not issue a visitor cookie')
  const [name, id] = cookie.split('=', 2)
  assert.equal(name, 'moni_sokha_visitor')
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  // Phase 4: every channel scopes its external id by BUSINESS ID, because
  // customer_identities is unique on (channel, external_id) globally. The web
  // chat used to prefix with the slug, which was the same idea by another name.
  const externalId = `${snapshot.business.id}:${id}`
  testExternalIds.add(externalId)
  return externalId
}

async function snapshotDemo() {
  const business = expectNoError(
    'snapshot business',
    await db.from('businesses').select('*').eq('slug', demoSlug).single(),
  )
  const services = expectNoError(
    'snapshot services',
    await db.from('services').select('*').eq('business_id', business.id).order('created_at'),
  )
  const resources = expectNoError(
    'snapshot resources',
    await db.from('resources').select('*').eq('business_id', business.id).order('created_at'),
  )
  const resourceIds = resources.map((row) => row.id)
  const resourceServices = resourceIds.length
    ? expectNoError(
        'snapshot resource mappings',
        await db.from('resource_services').select('*').in('resource_id', resourceIds),
      )
    : []
  const latestEvent = expectNoError(
    'snapshot event cursor',
    await db.from('events').select('id').eq('business_id', business.id).order('id', { ascending: false }).limit(1),
  )
  eventCursor = Number(latestEvent[0]?.id ?? 0)
  return { business, services, resources, resourceServices }
}

async function captureEvents(label, predicate) {
  const rows = expectNoError(
    `capture ${label} events`,
    await db
      .from('events')
      .select('id, action, actor, actor_label, entity_id, after')
      .eq('business_id', snapshot.business.id)
      .gt('id', eventCursor)
      .order('id'),
  )
  for (const row of rows) {
    eventCursor = Math.max(eventCursor, Number(row.id))
    if (predicate(row)) testEventIds.add(row.id)
    else cleanupNotes.push(`left unrelated concurrent event ${row.id} (${row.action}) untouched`)
  }
  return rows.filter(predicate)
}

function setupBody(chosen, setupPrice, marker) {
  const activeServices = snapshot.services.filter((service) => service.active)
  const activeResources = snapshot.resources.filter((resource) => resource.active)
  const notes = snapshot.business.attributes?.setup_notes
  return {
    raw_description: marker,
    model: 'moni-mvp-acceptance',
    shop: {
      business_type: snapshot.business.business_type,
      default_currency: snapshot.business.default_currency,
      services: activeServices.map((service) => ({
        name: service.name,
        name_en: service.name_en,
        description: service.description,
        price_minor: service.id === chosen.id ? setupPrice : service.price_minor,
        currency: service.currency,
        unit: service.unit,
        duration_min: service.duration_min,
        buffer_min: service.buffer_min,
        capacity: service.capacity,
        requires_deposit: service.requires_deposit,
        deposit_minor: service.deposit_minor,
      })),
      hours: snapshot.business.hours,
      resource_count: activeResources.length,
      notes: typeof notes === 'string' && notes.trim() ? notes : null,
    },
  }
}

function normalizeDigits(text) {
  const khmer = '០១២៣៤៥៦៧៨៩'
  return String(text).replace(/[០-៩]/g, (digit) => String(khmer.indexOf(digit)))
}

function containsAmount(text, expected) {
  const normalized = normalizeDigits(text)
  const values = normalized.match(/[0-9][0-9,.\s]*/g) ?? []
  return values.some((value) => Number(value.replace(/[^0-9]/g, '')) === expected)
}

async function customerForExternalId(externalId) {
  const identity = expectNoError(
    'load acceptance visitor identity',
    await db
      .from('customer_identities')
      .select('customer_id')
      .eq('channel', 'web')
      .eq('external_id', externalId)
      .single(),
  )
  return identity.customer_id
}

async function routeGuardChecks() {
  const origin = new URL(baseUrl).origin
  const request = async (route, headers, body) => {
    const response = await fetch(`${baseUrl}${route}`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(20_000),
    })
    let payload = null
    try { payload = await response.json() } catch {}
    return { response, payload }
  }

  await check('guard rejects missing Origin', async () => {
    const { response } = await request('/api/chat', { 'content-type': 'application/json' }, JSON.stringify({ text: 'hello' }))
    assert.equal(response.status, 403)
    return '403'
  })
  await check('guard rejects cross-origin and cross-site posts', async () => {
    const { response } = await request(
      '/api/ask',
      { origin: 'https://attacker.invalid', 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' },
      JSON.stringify({ text: 'change everything' }),
    )
    assert.equal(response.status, 403)
    return '403'
  })
  await check('guard requires JSON content type', async () => {
    const { response } = await request(
      '/api/chat',
      { origin, 'sec-fetch-site': 'same-origin', 'content-type': 'text/plain' },
      '{}',
    )
    assert.equal(response.status, 415)
    return '415'
  })
  await check('guard rejects oversized bodies before validation', async () => {
    const { response } = await request(
      '/api/chat',
      { origin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' },
      JSON.stringify({ text: 'x'.repeat(13_000) }),
    )
    assert.equal(response.status, 413)
    return '413'
  })
  await check('strict body rejects tenant selection and extra keys', async () => {
    const [{ response: slugResponse }, { response: keyResponse }] = await Promise.all([
      request(
        '/api/chat',
        { origin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' },
        JSON.stringify({ slug: 'another-shop', text: 'hello' }),
      ),
      request(
        '/api/chat',
        { origin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' },
        JSON.stringify({ text: 'hello', admin: true }),
      ),
    ])
    assert.equal(slugResponse.status, 400)
    assert.equal(keyResponse.status, 400)
    return 'both 400'
  })
  // Phase 2. A well formed, same-origin request from a signed-out visitor must
  // not reach an owner tool. 401 and not 400: the body is never even read, so
  // the endpoint cannot be used as a validation oracle for a shop's catalogue.
  await check('owner routes refuse a signed-out visitor before reading the body', async () => {
    const [{ response: askResponse }, { response: setupResponse }] = await Promise.all([
      request(
        '/api/ask',
        { origin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' },
        JSON.stringify({ text: 'raise every price' }),
      ),
      request(
        '/api/setup',
        { origin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' },
        JSON.stringify({ raw_description: 'x', shop: {} }),
      ),
    ])
    assert.equal(askResponse.status, 401)
    assert.equal(setupResponse.status, 401)
    return 'both 401'
  })
}

async function testCambodiaBounds() {
  const { cambodiaDate, cambodiaDayBounds, cambodiaMonthBounds } = await import('../src/lib/time/cambodia.ts')
  await check('Cambodia date boundary at 17:00 UTC', () => {
    assert.equal(cambodiaDate(new Date('2026-08-19T16:59:59.999Z')), '2026-08-19')
    assert.equal(cambodiaDate(new Date('2026-08-19T17:00:00.000Z')), '2026-08-20')
    assert.deepEqual(cambodiaDayBounds(new Date('2026-08-19T17:00:00.000Z')), {
      date: '2026-08-20',
      start: '2026-08-20T00:00:00+07:00',
      end: '2026-08-21T00:00:00+07:00',
    })
    return 'half-open day is correct'
  })
  await check('Cambodia month rollover', () => {
    assert.deepEqual(cambodiaMonthBounds(new Date('2026-08-31T17:00:00.000Z')), {
      month: '2026-09',
      start: '2026-09-01T00:00:00+07:00',
      end: '2026-10-01T00:00:00+07:00',
    })
    return 'September bounds are correct'
  })
}

async function firstFutureSlot(serviceId) {
  const { listSlots } = await import('../src/lib/agent/slots.ts')
  const { cambodiaDate } = await import('../src/lib/time/cambodia.ts')
  for (let days = 1; days <= 21; days += 1) {
    const instant = new Date(Date.now() + days * 86_400_000)
    const date = cambodiaDate(instant)
    const result = await listSlots({ businessId: snapshot.business.id, serviceId, date, limit: 1 })
    if (result.slots[0]) return { date, ...result.slots[0] }
  }
  throw new Error('no safe future slot found in the next 21 days')
}

async function runVerticalSlice() {
  const active = snapshot.services.filter((service) => service.active && service.price_minor >= 0)
  assert(active.length > 0, 'demo business has no active services')
  assert(snapshot.resources.some((resource) => resource.active), 'demo business has no active resources')
  const chosen = active.find((service) => service.name_en) ?? active[0]
  const setupPrice = chosen.price_minor + 137
  const ownerPrice = setupPrice + 211
  const marker = `${(snapshot.business.raw_description ?? 'Sokha Beauty demo shop').slice(0, 7_900)}\nMVP acceptance catalogue check.`

  await check('setup persists edited catalogue to fixed demo shop', async () => {
    const { response, payload } = await ownerPost('/api/setup', setupBody(chosen, setupPrice, marker))
    assert.equal(response.status, 200, scrub(JSON.stringify(payload)))
    assert.equal(payload.businessId, snapshot.business.id)
    const business = expectNoError(
      'verify persisted setup business',
      await db.from('businesses').select('raw_description, parse_model').eq('id', snapshot.business.id).single(),
    )
    const service = expectNoError(
      'verify persisted setup service',
      await db.from('services').select('price_minor').eq('id', chosen.id).eq('business_id', snapshot.business.id).single(),
    )
    assert.equal(business.raw_description, marker)
    assert.equal(business.parse_model, 'moni-mvp-acceptance')
    assert.equal(service.price_minor, setupPrice)
    const events = await captureEvents('setup', (row) => row.action === 'setup.catalogue_saved' && row.actor_label === 'owner via setup')
    assert.equal(events.length, 1, 'setup did not create exactly one attributable audit event')
    return `${chosen.name} = ${setupPrice} minor units`
  })

  const { getDashboardSnapshot } = await import('../src/lib/queries/dashboard.ts')
  await check('dashboard snapshot reads the persisted catalogue', async () => {
    const dashboard = await getDashboardSnapshot(snapshot.business.id, new Date())
    const service = dashboard.services.find((row) => row.id === chosen.id)
    assert(service, 'service missing from dashboard snapshot')
    assert.equal(service.priceMinor, setupPrice)
    assert.equal(dashboard.business.slug, demoSlug)
    return `${dashboard.services.length} active services from Supabase`
  })

  const quote = await check('customer route quotes the same database price', async () => {
    const prompt = `Please check the catalogue. What is the exact current price of ${chosen.name_en ?? chosen.name}? Reply with the listed price.`
    const result = await post('/api/chat', { text: prompt, name: 'MVP acceptance customer' })
    assert.equal(result.response.status, 200, scrub(JSON.stringify(result.payload)))
    assert.equal(result.payload.handed_over, false)
    assert.equal(typeof result.payload.text, 'string')
    assert(result.payload.tool_calls?.some((call) => call.tool === 'get_business'), 'customer route did not read the catalogue tool')
    assert(containsAmount(result.payload.text, setupPrice), `reply did not contain ${setupPrice}`)
    assert(result.cookie, 'visitor cookie missing')
    const setCookie = result.response.headers.get('set-cookie') ?? ''
    assert.match(setCookie, /HttpOnly/i)
    assert.match(setCookie, /SameSite=Lax/i)
    const externalId = visitorExternalId(result.cookie)
    return { cookie: result.cookie, externalId, text: result.payload.text }
  })

  const customerId = await customerForExternalId(quote.externalId)
  const slot = await check('slot engine returns a future database-backed slot', async () => {
    const found = await firstFutureSlot(chosen.id)
    assert.equal(found.ends_at > found.starts_at, true)
    return found
  })

  let booking = null
  await check('customer route books the agreed database slot', async () => {
    const prompt = `I confirm ${slot.date} at ${slot.label} for ${chosen.name}. Book that exact time now using the tools. Do not ask another question.`
    const first = await post('/api/chat', { text: prompt }, { cookie: quote.cookie })
    assert.equal(first.response.status, 200, scrub(JSON.stringify(first.payload)))
    let rows = expectNoError(
      'look for created booking',
      await db
        .from('bookings')
        .select('*')
        .eq('business_id', snapshot.business.id)
        .eq('customer_id', customerId)
        .eq('service_id', chosen.id)
        .gte('starts_at', slot.starts_at)
        .lte('starts_at', slot.starts_at),
    )

    if (rows.length === 0) {
      const second = await post(
        '/api/chat',
        { text: `Yes, I confirm ${slot.label}. Complete the booking now and return its code.` },
        { cookie: quote.cookie },
      )
      assert.equal(second.response.status, 200, scrub(JSON.stringify(second.payload)))
      rows = expectNoError(
        'look for booking after confirmation',
        await db
          .from('bookings')
          .select('*')
          .eq('business_id', snapshot.business.id)
          .eq('customer_id', customerId)
          .eq('service_id', chosen.id)
          .eq('starts_at', slot.starts_at),
      )
    }

    assert.equal(rows.length, 1, `expected one booking, found ${rows.length}`)
    booking = rows[0]
    assert.equal(booking.resource_id, slot.resource_id)
    assert.equal(booking.ends_at, slot.ends_at)
    assert.equal(booking.price_minor, setupPrice)
    assert.equal(booking.created_by, 'ai')
    const events = await captureEvents(
      'booking',
      (row) => row.action === 'booking.created' && row.after?.code === booking.code,
    )
    assert.equal(events.length, 1, 'booking audit event missing')
    return `booking ${booking.code} persisted`
  })

  await check('dashboard snapshot reflects the new booking', async () => {
    const dashboard = await getDashboardSnapshot(snapshot.business.id, new Date(booking.starts_at))
    const row = dashboard.today.bookings.find((candidate) => candidate.id === booking.id)
    assert(row, 'new booking absent from dashboard snapshot for its Cambodia day')
    assert.equal(row.priceMinor, setupPrice)
    assert.equal(row.service, chosen.name)
    return `${dashboard.today.date}, ${row.code}`
  })

  await check('unsafe request escalates and later turn stays silent', async () => {
    const first = await post('/api/chat', {
      text: 'I demand a refund and a discount below the listed price. Hand this to the owner now.',
      name: 'MVP escalation customer',
    })
    assert.equal(first.response.status, 200, scrub(JSON.stringify(first.payload)))
    assert.equal(first.payload.handed_over, true)
    assert.equal(first.payload.text, null)
    const cookie = first.cookie
    const externalId = visitorExternalId(cookie)
    const escalationCustomerId = await customerForExternalId(externalId)
    const conversation = expectNoError(
      'verify persisted escalation',
      await db
        .from('conversations')
        .select('id, status, needs_owner_reason')
        .eq('business_id', snapshot.business.id)
        .eq('customer_id', escalationCustomerId)
        .eq('channel', 'web')
        .single(),
    )
    assert.equal(conversation.status, 'needs_owner')
    assert(conversation.needs_owner_reason, 'escalation reason was not stored')
    const before = expectNoError(
      'count escalation messages',
      await db.from('messages').select('id').eq('conversation_id', conversation.id),
    ).length
    const second = await post('/api/chat', { text: 'Are you still there?' }, { cookie })
    assert.equal(second.response.status, 200, scrub(JSON.stringify(second.payload)))
    assert.equal(second.payload.handed_over, true)
    assert.equal(second.payload.text, null)
    const afterRows = expectNoError(
      'verify silent follow-up',
      await db.from('messages').select('role').eq('conversation_id', conversation.id).order('created_at'),
    )
    assert.equal(afterRows.length, before + 1, 'silent follow-up should store only the customer message')
    assert.equal(afterRows.at(-1)?.role, 'customer')
    const events = await captureEvents(
      'escalation',
      (row) => row.action === 'ai.escalated' && row.entity_id === conversation.id,
    )
    assert.equal(events.length, 1, 'escalation audit event missing')
    return 'needs_owner persisted, second turn produced no AI reply'
  })

  await check('owner agent mutation is visible on the refresh snapshot', async () => {
    const prompt = `Use adjust_prices exactly once now. Set by_minor to 211 and name_contains exactly to ${chosen.name}. Do not ask a question.`
    const result = await ownerPost('/api/ask', { text: prompt })
    assert.equal(result.response.status, 200, scrub(JSON.stringify(result.payload)))
    assert(result.payload.steps?.some((step) => step.tool === 'adjust_prices'), 'owner agent did not call adjust_prices')
    const service = expectNoError(
      'verify owner price mutation',
      await db.from('services').select('price_minor').eq('business_id', snapshot.business.id).eq('id', chosen.id).single(),
    )
    assert.equal(service.price_minor, ownerPrice)
    const dashboard = await getDashboardSnapshot(snapshot.business.id, new Date())
    assert.equal(dashboard.services.find((row) => row.id === chosen.id)?.priceMinor, ownerPrice)
    const events = await captureEvents(
      'owner mutation',
      (row) => row.action === 'owner.adjust_prices' && row.after?.name_contains === chosen.name,
    )
    assert.equal(events.length, 1, 'owner mutation audit event missing')
    return `${setupPrice} to ${ownerPrice} to dashboard snapshot`
  })
}

function businessRestoreRow(row) {
  const values = { ...row }
  delete values.id
  delete values.slug
  delete values.created_at
  delete values.updated_at
  return values
}

function serviceRestoreRow(row) {
  const values = { ...row }
  delete values.id
  delete values.business_id
  delete values.created_at
  delete values.updated_at
  return values
}

function resourceRestoreRow(row) {
  const values = { ...row }
  delete values.id
  delete values.business_id
  delete values.created_at
  return values
}

async function cleanupVisitors() {
  for (const externalId of testExternalIds) {
    const identityResult = await db
      .from('customer_identities')
      .select('id, customer_id')
      .eq('channel', 'web')
      .eq('external_id', externalId)
      .maybeSingle()
    if (identityResult.error) throw identityResult.error
    if (!identityResult.data) continue
    const customerId = identityResult.data.customer_id
    const bookingResult = await db.from('bookings').select('id').eq('customer_id', customerId)
    if (bookingResult.error) throw bookingResult.error
    const bookingIds = (bookingResult.data ?? []).map((row) => row.id)
    if (bookingIds.length) {
      const payments = await db.from('payments').select('id').in('booking_id', bookingIds)
      if (payments.error) throw payments.error
      if ((payments.data ?? []).length > 0) {
        throw new Error('acceptance booking unexpectedly has payments; refusing destructive cleanup')
      }
      const deletedBookings = await db.from('bookings').delete().in('id', bookingIds).eq('business_id', snapshot.business.id)
      if (deletedBookings.error) throw deletedBookings.error
    }
    const conversations = await db.from('conversations').delete().eq('customer_id', customerId).eq('business_id', snapshot.business.id)
    if (conversations.error) throw conversations.error
    const identityDelete = await db.from('customer_identities').delete().eq('id', identityResult.data.id)
    if (identityDelete.error) throw identityDelete.error
    const customerDelete = await db.from('customers').delete().eq('id', customerId).eq('business_id', snapshot.business.id)
    if (customerDelete.error) throw customerDelete.error
  }
}

async function restoreResourceMappings() {
  const resourceIds = snapshot.resources.map((resource) => resource.id)
  if (!resourceIds.length) return
  const current = expectNoError(
    'load current resource mappings',
    await db.from('resource_services').select('*').in('resource_id', resourceIds),
  )
  const key = (row) => `${row.resource_id}:${row.service_id}`
  const before = new Map(snapshot.resourceServices.map((row) => [key(row), row]))
  const after = new Map(current.map((row) => [key(row), row]))
  for (const [mappingKey, row] of after) {
    if (before.has(mappingKey)) continue
    const result = await db
      .from('resource_services')
      .delete()
      .eq('resource_id', row.resource_id)
      .eq('service_id', row.service_id)
    if (result.error) throw result.error
  }
  const missing = [...before].filter(([mappingKey]) => !after.has(mappingKey)).map(([, row]) => row)
  if (missing.length) {
    const result = await db.from('resource_services').insert(missing)
    if (result.error) throw result.error
  }
}

async function restoreDemo() {
  if (!snapshot || !db) return
  const errors = []
  const attempt = async (label, fn) => {
    try { await fn() } catch (error) { errors.push(`${label}: ${scrub(error instanceof Error ? error.message : error)}`) }
  }

  await attempt('remove acceptance visitors', cleanupVisitors)
  await attempt('restore service values', async () => {
    for (const service of snapshot.services) {
      const result = await db
        .from('services')
        .update(serviceRestoreRow(service))
        .eq('id', service.id)
        .eq('business_id', snapshot.business.id)
      if (result.error) throw result.error
    }
  })
  await attempt('restore resource values', async () => {
    for (const resource of snapshot.resources) {
      const result = await db
        .from('resources')
        .update(resourceRestoreRow(resource))
        .eq('id', resource.id)
        .eq('business_id', snapshot.business.id)
      if (result.error) throw result.error
    }
  })
  await attempt('restore resource mappings', restoreResourceMappings)
  await attempt('restore business values', async () => {
    const result = await db
      .from('businesses')
      .update(businessRestoreRow(snapshot.business))
      .eq('id', snapshot.business.id)
      .eq('slug', demoSlug)
    if (result.error) throw result.error
  })
  await attempt('remove acceptance audit events', async () => {
    if (!testEventIds.size) return
    const result = await db.from('events').delete().in('id', [...testEventIds]).eq('business_id', snapshot.business.id)
    if (result.error) throw result.error
  })

  if (errors.length) throw new Error(errors.join('; '))

  const restoredBusiness = expectNoError(
    'verify restored business',
    await db.from('businesses').select('raw_description, parse_model, attributes, hours').eq('id', snapshot.business.id).single(),
  )
  assert.deepEqual(restoredBusiness.raw_description, snapshot.business.raw_description)
  assert.deepEqual(restoredBusiness.parse_model, snapshot.business.parse_model)
  assert.deepEqual(restoredBusiness.attributes, snapshot.business.attributes)
  assert.deepEqual(restoredBusiness.hours, snapshot.business.hours)
  for (const service of snapshot.services) {
    const restored = expectNoError(
      'verify restored service',
      await db.from('services').select('price_minor, active, sort_order').eq('id', service.id).single(),
    )
    assert.equal(restored.price_minor, service.price_minor)
    assert.equal(restored.active, service.active)
    assert.equal(restored.sort_order, service.sort_order)
  }
}

async function main() {
  process.stdout.write('\nMoni MVP acceptance, fixed demo tenant\n\n')
  await loadLocalEnv()
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const missing = required.filter((name) => !process.env[name]?.trim())
  if (missing.length) throw new Error(`missing required environment variables: ${missing.join(', ')}`)
  const hasAi = Boolean(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
      || process.env.GEMINI_API_KEY?.trim()
      || process.env.ANTHROPIC_API_KEY?.trim(),
  )
  if (!hasAi) throw new Error('live vertical slice requires a configured Gemini or Anthropic API key')
  if (!ownerCookie()) {
    throw new Error(
      'owner routes are authenticated since Phase 2: set MONI_ACCEPTANCE_OWNER_COOKIE to a Clerk session cookie for a waitlisted member who owns the demo business (businesses.clerk_user_id on sokha-beauty)',
    )
  }

  register('./mvp-loader.mjs', import.meta.url)
  db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  process.stdout.write('Infrastructure\n')
  await check('local application server', startServer)
  await check('fixed demo Supabase snapshot', async () => {
    snapshot = await snapshotDemo()
    assert.equal(snapshot.business.slug, demoSlug)
    return `${snapshot.services.length} services, ${snapshot.resources.length} resources`
  })

  process.stdout.write('\nPure boundaries and request guards\n')
  await testSourceWiring()
  await testCambodiaBounds()
  await routeGuardChecks()

  process.stdout.write('\nEnd-to-end product slice\n')
  await runVerticalSlice()
}

let fatal = null
try {
  await main()
} catch (error) {
  fatal = error
} finally {
  if (snapshot) {
    process.stdout.write('\nRestoration\n')
    try {
      await check('restore every live demo row touched by acceptance', restoreDemo)
    } catch (error) {
      fatal ??= error
    }
  }
  await stopServer()
}

const passed = checks.filter((entry) => entry.status === 'pass').length
const failed = checks.filter((entry) => entry.status === 'fail').length
process.stdout.write(`\nResult: ${passed} passed, ${failed} failed\n`)
for (const note of cleanupNotes) process.stdout.write(`  note: ${note}\n`)
if (fatal) {
  process.stderr.write(`\nAcceptance failed: ${scrub(fatal instanceof Error ? fatal.message : fatal)}\n`)
  const tail = serverOutput.join('').trim().split(/\r?\n/).slice(-12).join('\n')
  if (tail) process.stderr.write(`\nServer tail (redacted):\n${tail}\n`)
  process.exitCode = 1
}
