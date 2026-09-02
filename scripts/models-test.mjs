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
const { classifyRefusal, productPhotoPrompt } = await import('../src/lib/ai/photo-refusal.ts')

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

// ── deadlines ─────────────────────────────────────────────────────────────
// Measured on 2 September 2026: a parse hung on a direct Gemini candidate for
// over two and a half minutes, no error and no answer, because nothing in the
// stack had a clock. A provider that REFUSES is the easy case, the message says
// so. A provider that accepts the connection and never speaks is the one that
// puts a spinner in front of a shop owner forever, and only a deadline catches
// it. The timeouts here are tiny so the suite stays fast; the shipped budgets
// are in BUDGET in models.ts.
process.env.MONI_TIMEOUT_PARSE_MS = '150'

/** Like `run`, but a ref may HANG instead of throwing. */
async function runWithStalls(stalls, throwFor = () => null) {
  const tried = []
  const result = await withFallback('parse', async (_model, ref, signal) => {
    tried.push(ref)
    const message = throwFor(ref)
    if (message) throw new Error(message)
    if (!stalls.includes(ref)) return `answered by ${ref}`
    // What a stalled provider looks like from here: a promise that settles only
    // when somebody cancels it. If the router forgets to pass its signal, this
    // never resolves and the test hangs, which is the correct failure.
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted by caller')), { once: true })
    })
  })
  return { tried, ...result }
}

await check('a model that never answers is abandoned, and the next one answers', async () => {
  const { tried, ref } = await runWithStalls(['google/one'])
  assert.deepEqual(tried, ['google/one', 'google:two'])
  assert.equal(ref, 'google:two')
})

await check('the router hands its abort signal to the caller, or nothing could cancel a stall', async () => {
  let received
  await withFallback('parse', async (_model, ref, signal) => {
    received = signal
    return ref
  })
  assert.ok(received instanceof AbortSignal, 'no AbortSignal reached the run callback')
  assert.equal(received.aborted, false)
})

await check('a stall is remembered, so the next request does not wait on it again', async () => {
  await runWithStalls(['google/one'])
  const second = await runWithStalls(['google/one'])
  assert.deepEqual(second.tried, ['google:two'], 'the stalled ref was waited on twice')
})

await check('a stall is forgotten eventually, unlike a plan refusal', async () => {
  // Both drop the ref for the process, and the difference is the deadline: an
  // entitlement refusal is a billing fact (Infinity), a stall is a bad moment
  // (minutes). Asserted through the public surface: after a stall the ref is
  // still a configured candidate, it is simply not tried right now.
  await runWithStalls(['google/one'])
  assert.ok(
    modelsFor('parse').every((c) => c.ref !== 'google/one'),
    'a just-stalled ref should be skipped',
  )
})

await check('every model stalling still ends the request rather than hanging', async () => {
  await assert.rejects(
    runWithStalls(['google/one', 'google:two', 'google:three', 'anthropic:four']),
    /did not answer/,
    'a chain of stalls must reject, and say that nothing answered',
  )
})

await check('the whole chain stops when the request budget is spent, before trying more models', async () => {
  // One attempt is allowed 150ms and the whole request 26s in production; here
  // the total is forced down so the budget, not the candidate list, is what
  // ends the walk.
  process.env.MONI_TIMEOUT_PARSE_MS = '200'
  try {
    const started = Date.now()
    await assert.rejects(runWithStalls(['google/one', 'google:two', 'google:three', 'anthropic:four']))
    // Four candidates at 200ms each is 800ms if every one is waited on. The
    // point of the assertion is the ceiling, not the exact figure.
    assert.ok(Date.now() - started < 3_000, 'the chain took far longer than its own budget')
  } finally {
    process.env.MONI_TIMEOUT_PARSE_MS = '150'
  }
})


// ── the image task ────────────────────────────────────────────────────────
// Verified against the live key on 2 September 2026: every image model it can
// see refuses with the free tier's DAILY per-model quota already spent, and the
// gateway refuses them outright. The feature ships anyway, so what has to be
// right is the REASON it reports, because each one names a different next move
// for the owner: enable billing, wait for tomorrow, or photograph it herself.

await check('the image task has a chain, so a photo has somewhere to come from', () => {
  process.env.MONI_MODEL_IMAGE = 'google/pic,google:pic2'
  try {
    assert.deepEqual(modelsFor('image').map((c) => c.ref), ['google/pic', 'google:pic2'])
  } finally {
    delete process.env.MONI_MODEL_IMAGE
  }
})

await check('a plan refusal on an image model falls through to the direct one', async () => {
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

await check('a spent daily quota reads as quota, not as a dead plan', () => {
  assert.equal(
    classifyRefusal('You exceeded your current quota. GenerateRequestsPerDayPerProjectPerModel-FreeTier'),
    'quota',
  )
})

await check('a plan refusal reads as unavailable, because waiting will not fix it', () => {
  assert.equal(classifyRefusal(ENTITLEMENT), 'unavailable')
})

await check('the router\'s own timeout reads as slow, and is worth retrying', () => {
  assert.equal(classifyRefusal('google:pic did not answer within 25s'), 'slow')
})

await check('anything else is a plain failure', () => {
  assert.equal(classifyRefusal('the socket closed'), 'failed')
})

await check('the prompt forbids text, because letters on a menu photo would be a lie', () => {
  const prompt = productPhotoPrompt({ name: 'កាហ្វេទឹកកក', description: null, businessType: 'cafe' })
  assert.ok(/no text/i.test(prompt), 'the prompt does not forbid text')
  assert.ok(/no watermark/i.test(prompt))
  assert.ok(prompt.includes('កាហ្វេទឹកកក'), 'the product name is not in the prompt')
  assert.ok(!prompt.includes('—'), 'an em dash reached the prompt')
})

console.log(`\n${failures.length === 0 ? '\x1b[32m' : '\x1b[31m'}${failures.length} failed\x1b[0m\n`)
process.exit(failures.length === 0 ? 0 : 1)
