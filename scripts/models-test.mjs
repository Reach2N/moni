/**
 * The fallback chain decides what happens when a provider says no, and every one
 * of its branches is a production behaviour nobody can see from a log line. So
 * they get asserted rather than eyeballed.
 *
 * The case that started this file: on 2 September 2026 a parse spent about eight
 * seconds walking two candidates that could not possibly answer, on every single
 * request, because nothing remembered the refusals. These assertions are what
 * keeps that fixed.
 *
 *   node --experimental-strip-types scripts/models-test.mjs
 */
import assert from 'node:assert/strict'

// Set before the import: refsFor and hasKeyFor read process.env, and the whole
// point is to drive a deterministic candidate list rather than whatever the
// defaults happen to be this month.
process.env.AI_GATEWAY_API_KEY = 'test-gateway-key'
process.env.GEMINI_API_KEY = 'test-google-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.MONI_MODEL_PARSE = 'google/one,google:two,google:three,anthropic:four'

const { withFallback, modelsFor, resetModelAvailability } = await import('../src/lib/ai/models.ts')

const failures = []
async function check(name, run) {
  resetModelAvailability()
  try {
    await run()
    console.log(`  ok   ${name}`)
  } catch (error) {
    failures.push(name)
    console.log(`  FAIL ${name}\n       ${error.message.split('\n')[0]}`)
  }
}

const ENTITLEMENT = 'Free tier users do not have access to this model. Upgrade to paid credits.'
const MODEL_QUOTA = (id) =>
  `Quota exceeded for metric: generate_content_free_tier_requests, limit: 20, model: ${id}`
const PROVIDER_QUOTA = '429 RESOURCE_EXHAUSTED: the project is over its allowance'
const CAPACITY = 'The model is overloaded. Please try again later.'
const SCHEMA = 'No object generated: response did not match schema.'

/**
 * Runs the chain, recording which refs were actually called. `throwFor` decides
 * what each ref does, so a test states its provider's behaviour and nothing else.
 */
async function run(throwFor) {
  const tried = []
  const result = await withFallback('parse', async (_model, ref) => {
    tried.push(ref)
    const message = throwFor(ref)
    if (message) throw new Error(message)
    return `answered by ${ref}`
  })
  return { tried, ...result }
}

// Keep the console honest: these paths warn on purpose, and the warnings are
// noise in a test run.
console.warn = () => {}

await check('the configured chain is walked in order', async () => {
  const { tried, ref } = await run(() => null)
  assert.deepEqual(tried, ['google/one'])
  assert.equal(ref, 'google/one')
})

await check('an entitlement refusal falls through to the next candidate', async () => {
  const { tried, ref } = await run((r) => (r === 'google/one' ? ENTITLEMENT : null))
  assert.deepEqual(tried, ['google/one', 'google:two'])
  assert.equal(ref, 'google:two')
})

await check('an entitlement refusal is never paid for twice', async () => {
  const refuse = (r) => (r === 'google/one' ? ENTITLEMENT : null)
  await run(refuse)
  const second = await run(refuse)
  assert.deepEqual(second.tried, ['google:two'], 'the refused ref was tried again')
  assert.equal(second.ref, 'google:two')
})

await check('a per-model quota skips that model but keeps its provider', async () => {
  const { tried, ref } = await run((r) => (r === 'google:two' ? MODEL_QUOTA('two') : null))
  assert.deepEqual(tried, ['google/one'])
  assert.equal(ref, 'google/one')

  // Now force the gateway out of the way so the google siblings are reachable.
  const { tried: t2, ref: r2 } = await run((r) => {
    if (r === 'google/one') return ENTITLEMENT
    if (r === 'google:two') return MODEL_QUOTA('two')
    return null
  })
  assert.deepEqual(t2, ['google/one', 'google:two', 'google:three'], 'the sibling was skipped')
  assert.equal(r2, 'google:three')
})

await check('a per-model quota is remembered for the window', async () => {
  const behaviour = (r) => {
    if (r === 'google/one') return ENTITLEMENT
    if (r === 'google:two') return MODEL_QUOTA('two')
    return null
  }
  await run(behaviour)
  const second = await run(behaviour)
  assert.deepEqual(second.tried, ['google:three'], 'a spent model was tried again inside its window')
})

await check('a provider-wide quota jumps to a different provider', async () => {
  const { tried, ref } = await run((r) => {
    if (r === 'google/one') return ENTITLEMENT
    if (r.startsWith('google:')) return PROVIDER_QUOTA
    return null
  })
  assert.deepEqual(tried, ['google/one', 'google:two', 'anthropic:four'])
  assert.equal(ref, 'anthropic:four')
})

await check('capacity pressure is never remembered', async () => {
  let overloaded = true
  const first = await run((r) => (r === 'google/one' && overloaded ? CAPACITY : null))
  assert.deepEqual(first.tried, ['google/one', 'google:two'])
  overloaded = false
  const second = await run(() => null)
  assert.deepEqual(second.tried, ['google/one'], 'an overloaded model was dropped from the chain')
})

await check('a schema failure propagates without burning the chain', async () => {
  const tried = []
  await assert.rejects(
    withFallback('parse', async (_model, ref) => {
      tried.push(ref)
      throw new Error(SCHEMA)
    }),
    /did not match schema/,
  )
  assert.deepEqual(tried, ['google/one'], 'a prompt problem was retried on other models')
})

await check('every candidate marked dead still yields the full list', async () => {
  await assert.rejects(run(() => ENTITLEMENT))
  const candidates = modelsFor('parse')
  assert.equal(candidates.length, 4, 'a stale mark took the chain off the air')
  assert.deepEqual(
    candidates.map((c) => c.ref),
    ['google/one', 'google:two', 'google:three', 'anthropic:four'],
  )
})

await check('an unconfigured provider is still filtered out', async () => {
  const key = process.env.ANTHROPIC_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  try {
    assert.deepEqual(
      modelsFor('parse').map((c) => c.ref),
      ['google/one', 'google:two', 'google:three'],
    )
  } finally {
    process.env.ANTHROPIC_API_KEY = key
  }
})

console.log(`\n${failures.length === 0 ? '\x1b[32m' : '\x1b[31m'}${failures.length} failed\x1b[0m\n`)
process.exit(failures.length === 0 ? 0 : 1)
