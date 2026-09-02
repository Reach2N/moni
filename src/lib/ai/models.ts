/**
 * One place that decides which model runs which job.
 *
 * The point is that nothing else in the codebase names a provider. Call
 * `modelFor('parse')` and you get a model. Swap anything by changing an env
 * var, with no code edit and no import churn, because the AI SDK gives every
 * provider the same interface.
 *
 * The gateway is Vercel AI Gateway (decided 27 August 2026): one endpoint for
 * every model, keyless on Vercel deployments (VERCEL_OIDC_TOKEN is injected
 * automatically), AI_GATEWAY_API_KEY locally, usage visible in the Vercel
 * dashboard. Gemini models stay the default because they handle Khmer, voice
 * and instruction-following well; audio goes up as AI SDK file parts and the
 * gateway passes them through to Gemini untouched.
 *
 * Fallback matters more than it looks. A demo that dies on stage because of a
 * 429 or a gateway hiccup is worse than a slower answer. So each job carries an
 * ordered list: gateway first, then the direct Google key (which is also what
 * keeps local dev working with no gateway key at all), then Anthropic. The
 * first provider with a configured key that does not throw wins.
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { anthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'

/** The jobs this product needs a model for. Add one, wire one line below. */
export type Task = 'parse' | 'chat' | 'classify' | 'transcribe' | 'image'

/**
 * Two shapes, and the shape IS the routing.
 *
 * A bare "creator/model" slug goes through the Vercel AI Gateway. That needs no
 * provider package and no import: `ai` depends on @ai-sdk/gateway internally and
 * documents that "if not set, the default provider is the Vercel AI gateway
 * provider", so handing generateText the string is the whole integration.
 *
 * A "provider:model" ref with a colon goes DIRECT, through that provider's own
 * package and its own key. This is the escape hatch, and the only reason
 * GEMINI_API_KEY exists: a laptop with no gateway key still runs the product.
 */
type ModelRef = `${string}/${string}` | `google:${string}` | `anthropic:${string}`

/**
 * Direct-Google ids verified against the live model list on this account,
 * 19 August 2026; gateway slugs mirror them. gemini-3.7-flash is the newest
 * stable Flash the key can see.
 *
 * Flash rather than Pro on purpose: parsing a shop description and answering a
 * customer are not reasoning-heavy, and Pro left the Gemini free tier in April
 * 2026. Flash-lite handles the cheap high-volume classify job.
 */
const DEFAULTS: Record<Task, ModelRef[]> = {
  // structured extraction, runs once per shop, quality matters most
  parse: [
    'google/gemini-3.7-flash',
    'google:gemini-3.7-flash',
    'anthropic:claude-sonnet-5',
    'google:gemini-3.5-flash',
  ],
  // customer conversation with tool calling, runs constantly, latency matters
  chat: [
    'google/gemini-3.7-flash',
    'google:gemini-3.7-flash',
    'google:gemini-3.5-flash',
    'anthropic:claude-sonnet-5',
  ],
  // a shop owner's voice note to text, in Khmer or English. Audio rides as an
  // AI SDK file part, which the gateway passes through to Gemini untouched;
  // Anthropic is deliberately absent because it takes no audio input, so a
  // fallback to it would fail on every request rather than degrade.
  transcribe: [
    'google/gemini-3.7-flash',
    'google:gemini-3.7-flash',
    'google:gemini-3.5-flash',
  ],
  // A product photo for a shop's menu. The ids were verified against the live
  // model list on 2 September 2026: six image models are visible to the key, and
  // the free tier's DAILY per-model quota for every one of them was already
  // spent, so this chain is EXPECTED to be refused until billing is enabled.
  // It ships anyway, because the refusal reaches the owner in her own words and
  // the upload button sits beside it.
  image: [
    'google/gemini-3.1-flash-image',
    'google:gemini-3.1-flash-image',
    'google:gemini-3.1-flash-lite-image',
  ],
  // "is this a booking request or a complaint", cheapest possible
  classify: [
    'google/gemini-3.5-flash-lite',
    'google:gemini-3.5-flash-lite',
    'google:gemini-3.7-flash',
  ],
}

/** Env override, e.g. MONI_MODEL_PARSE="anthropic/claude-opus-4.8" for the gateway. */
function refsFor(task: Task): ModelRef[] {
  const override = process.env[`MONI_MODEL_${task.toUpperCase()}`]?.trim()
  if (override) return override.split(',').map((s) => s.trim() as ModelRef)
  return DEFAULTS[task]
}

/** A ref with no colon is a gateway slug; a colon names a direct provider. */
function providerOf(ref: ModelRef): string {
  return ref.includes(':') ? ref.slice(0, ref.indexOf(':')) : 'gateway'
}

function hasKeyFor(provider: string): boolean {
  if (provider === 'gateway') {
    // AI_GATEWAY_API_KEY locally; VERCEL_OIDC_TOKEN is injected on Vercel
    // deployments and by `vercel env pull` (12h validity) for local dev.
    return Boolean(
      process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim(),
    )
  }
  if (provider === 'google') {
    return Boolean(
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim(),
    )
  }
  if (provider === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
  return false
}

/**
 * The Google provider, built with whichever key name is actually set.
 *
 * The bare `google` export reads GOOGLE_GENERATIVE_AI_API_KEY and ONLY that
 * name, while `hasKeyFor` below accepts either it or GEMINI_API_KEY. That
 * mismatch let the chain pass its own gate and then call the API with no
 * credential at all, which the provider reports as "Method doesn't allow
 * unregistered callers": an error that names neither the key nor the variable.
 * `.env.example` promises either name works, so make that true here rather than
 * quietly meaning one of them.
 */
let googleClient: ReturnType<typeof createGoogleGenerativeAI> | undefined
function googleProvider() {
  googleClient ??= createGoogleGenerativeAI({
    apiKey:
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim(),
  })
  return googleClient
}

function build(ref: ModelRef): LanguageModel {
  // No colon: hand the slug straight to the AI SDK, which routes it through the
  // gateway. Passing a string IS the supported integration; wrapping it in a
  // gateway() call from a package we also depend on directly was one layer of
  // indirection doing nothing.
  if (!ref.includes(':')) return ref as LanguageModel

  const provider = ref.slice(0, ref.indexOf(':'))
  const id = ref.slice(ref.indexOf(':') + 1)
  if (provider === 'google') return googleProvider()(id)
  if (provider === 'anthropic') return anthropic(id)
  throw new Error(`unknown provider in "${ref}"`)
}

/**
 * Refs known to be dead, and the moment each becomes worth trying again.
 *
 * Without this the chain re-pays for the same two refusals on every single
 * request. Measured on 2 September 2026: the gateway refuses
 * google/gemini-3.7-flash outright ("Free tier users do not have access to this
 * model") and direct google:gemini-3.7-flash is out of its per-model free-tier
 * quota, so a parse spent roughly eight seconds walking two dead candidates
 * before reaching the 3.5-flash that answers. Neither refusal is discoverable in
 * advance: the gateway's model list carries no tier field, so a model the account
 * cannot run looks identical to one it can until you call it.
 *
 * The two timeouts are different on purpose, and match the distinctions
 * `isEntitlement` and `isQuota` already draw below. An entitlement refusal is a
 * billing fact and will not change inside one process, so it is marked forever. A
 * quota is a window, and Gemini's free tier meters per minute, so it is marked for
 * the server's own retryDelay when it names one and a minute when it does not.
 * Capacity pressure is never marked: an overloaded model is fine a second later,
 * and remembering it would route away from the best model for nothing.
 *
 * This map is per process. It helps a warm serverless instance and costs a cold
 * one nothing, which is the right trade: the cost it avoids is per request, not
 * per deploy.
 */
const unavailableUntil = new Map<string, number>()

/** Marks `ref` dead until `until` (Infinity for permanent), keeping the later deadline. */
function markUnavailable(ref: string, until: number): void {
  const current = unavailableUntil.get(ref) ?? 0
  if (until > current) unavailableUntil.set(ref, until)
}

function isMarkedDead(ref: string): boolean {
  const until = unavailableUntil.get(ref)
  if (until === undefined) return false
  if (until <= Date.now()) {
    unavailableUntil.delete(ref)
    return false
  }
  return true
}

/** For the test harness, and for anything that wants a clean slate. */
export function resetModelAvailability(): void {
  unavailableUntil.clear()
}

/**
 * How long a job may take, and how long any ONE model gets inside it.
 *
 * Measured on 2 September 2026: a parse of "i want to create a coffee shop"
 * hung on direct google:gemini-3.7-flash for over two and a half minutes with
 * no error and no answer. Nothing anywhere had a deadline. `generateText` was
 * given no abortSignal, `withFallback` waited forever, the browser's fetch
 * waited forever, and the route's `maxDuration` is a Vercel platform limit that
 * does nothing at all under `next dev`. So the owner watched a spinner with the
 * product's one important screen behind it, and no log line said why.
 *
 * A provider that refuses is a good day: the message says so and the chain
 * moves on. A provider that accepts the connection and never answers is the bad
 * one, and only a clock can catch it.
 *
 * Two numbers, because they answer different questions. `perAttempt` is how
 * long one model may stall before we give up on IT. `total` is how long the
 * whole chain may take before we give up on the REQUEST, and it is set under
 * each route's `maxDuration` so the chain concludes on its own terms rather
 * than being killed mid-flight by the platform, which produces a 504 carrying
 * nothing anyone can act on.
 */
const BUDGET: Record<Task, { total: number; perAttempt: number }> = {
  // POST /api/parse, maxDuration 30
  parse: { total: 26_000, perAttempt: 12_000 },
  // POST /api/ask and /api/chat and the channel webhooks, maxDuration 60
  chat: { total: 50_000, perAttempt: 20_000 },
  // POST /api/transcribe, maxDuration 60. Audio uploads are bigger, so one
  // attempt gets longer and fewer of them fit.
  transcribe: { total: 50_000, perAttempt: 30_000 },
  classify: { total: 20_000, perAttempt: 10_000 },
  // Drawing takes longer than writing a sentence, and /api/products/[id]/photo
  // allows sixty seconds.
  image: { total: 50_000, perAttempt: 25_000 },
}

/** `MONI_TIMEOUT_PARSE_MS=8000` overrides one attempt, for a demo on bad wifi. */
function budgetFor(task: Task): { total: number; perAttempt: number } {
  const base = BUDGET[task]
  const override = Number(process.env[`MONI_TIMEOUT_${task.toUpperCase()}_MS`]?.trim())
  if (!Number.isFinite(override) || override <= 0) return base
  return { total: Math.max(override, base.total), perAttempt: override }
}

/** Every configured candidate for a job, in preference order. */
export function modelsFor(task: Task): Array<{ ref: ModelRef; model: LanguageModel }> {
  const configured = refsFor(task).filter((ref) => hasKeyFor(providerOf(ref)))
  if (configured.length === 0) {
    throw new Error(
      `no API key configured for any model assigned to "${task}". ` +
        `Set AI_GATEWAY_API_KEY, GEMINI_API_KEY or ANTHROPIC_API_KEY in .env.local`,
    )
  }
  // A mark is an optimisation, never a gate. If every candidate is marked the
  // full list comes back unfiltered, so a stale entry can slow the product down
  // but can never take it off the air.
  const live = configured.filter((ref) => !isMarkedDead(ref))
  const chosen = live.length > 0 ? live : configured
  return chosen.map((ref) => ({ ref, model: build(ref) }))
}

export function modelFor(task: Task): LanguageModel {
  return modelsFor(task)[0]!.model
}

/**
 * Run a job against each candidate until one succeeds.
 *
 * Two distinctions matter here, and getting them wrong wastes the whole chain.
 *
 * A schema validation failure means the prompt is wrong, so the next model fails
 * identically. That propagates immediately rather than burning every provider.
 *
 * A QUOTA failure from Gemini's free tier is per MODEL: the error names the
 * model and its limit. Corrected 1 September 2026, it previously counted every
 * Gemini model against one bucket, so falling from 3.7-flash to 3.5-flash on a 429
 * fails the same way a millisecond later. On a quota error we therefore skip every
 * remaining candidate from the SAME provider and jump to a different one (the
 * gateway bills through Vercel and direct Google bills through the Google key, so
 * they are different buckets even for the same underlying model). If none exists,
 * we honour the server's own retryDelay once, because the free tier window is per
 * minute and waiting is usually cheaper than failing the user's request.
 */
/**
 * Capacity pressure, which is about the model right now rather than the
 * account. Checked before quota because a provider can answer 429 for both,
 * and an overloaded model is not an exhausted allowance.
 */
const isCapacity = (m: string) =>
  /overloaded|high demand|unavailable|503|502|500|timeout|ETIMEDOUT|ECONN|fetch failed/i.test(m)

const isQuota = (m: string) =>
  !isCapacity(m) && /429|quota|exhausted|RESOURCE_EXHAUSTED|rate limit/i.test(m)
/**
 * An ENTITLEMENT refusal is permanent for that one route and irrelevant to the
 * rest of the chain, which is exactly when a direct provider should take over.
 * The Vercel gateway's free tier serves a subset of the catalogue and refuses
 * the rest with prose carrying none of the words below, so before this pattern
 * existed a refusal threw on the first candidate and the direct Gemini links
 * were never tried. Kept OUT of isQuota deliberately: quota marks the whole
 * provider exhausted, and here only the gateway is refusing.
 */
const isEntitlement = (m: string) =>
  /free tier|do not have access|not available on your plan|insufficient credit|payment required|\b40[23]\b/i.test(m)

const isRetryable = (m: string) => isQuota(m) || isEntitlement(m) || isCapacity(m)

/** Gemini reports "Please retry in 41.6s"; honour it rather than guessing. */
function retryAfterMs(msg: string): number | null {
  const m = msg.match(/retry in ([\d.]+)s/i)
  if (!m) return null
  const s = Number(m[1])
  return Number.isFinite(s) && s <= 65 ? Math.ceil(s * 1000) + 500 : null
}

export async function withFallback<T>(
  task: Task,
  run: (model: LanguageModel, ref: string, signal: AbortSignal) => Promise<T>,
): Promise<{ result: T; ref: string }> {
  const candidates = modelsFor(task)
  const exhaustedProviders = new Set<string>()
  const budget = budgetFor(task)
  const startedAt = Date.now()
  let last: unknown

  for (let i = 0; i < candidates.length; i++) {
    const { ref, model } = candidates[i]!
    const provider = providerOf(ref as ModelRef)
    if (exhaustedProviders.has(provider)) continue

    // What is left of the request's whole budget, capped at one attempt's share.
    // Stopping here beats starting a call we already know we cannot wait for.
    const remaining = budget.total - (Date.now() - startedAt)
    if (remaining <= 1_000) {
      console.warn(`[ai] ${task} ran out of time after ${((Date.now() - startedAt) / 1000).toFixed(1)}s, ${candidates.length - i} model(s) untried`)
      break
    }
    const allowance = Math.min(budget.perAttempt, remaining)

    // In development every attempt is announced, because the failure this
    // catches is silence: a stalled provider used to print nothing at all while
    // the owner watched a spinner. Left out of production, where this would
    // double the log volume of every customer message.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[ai] ${task}: asking ${ref}, up to ${(allowance / 1000).toFixed(0)}s`)
    }

    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, allowance)
    const attemptStarted = Date.now()

    try {
      const result = await run(model, ref, controller.signal)
      const took = Date.now() - attemptStarted
      if (took > 3_000) console.warn(`[ai] ${ref} answered in ${(took / 1000).toFixed(1)}s`)
      return { result, ref }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)

      // Our own clock fired. Checked before anything reads the message, because
      // an abort surfaces from the AI SDK as prose that varies by provider and
      // says nothing about who cancelled it. A stall is not a refusal, so the
      // mark is a short window: the model is probably fine again in minutes,
      // and remembering it forever would route away from the best model for a
      // bad thirty seconds.
      if (timedOut) {
        markUnavailable(ref, Date.now() + 5 * 60_000)
        last = new Error(`${ref} did not answer within ${(allowance / 1000).toFixed(0)}s`)
        console.warn(`[ai] ${ref} did not answer within ${(allowance / 1000).toFixed(0)}s, trying the next model`)
        continue
      }

      if (!isRetryable(msg)) throw err
      last = err

      // Gemini's free tier meters PER MODEL, not per project. Its error names
      // the bucket outright: "Quota exceeded for metric:
      // generate_content_free_tier_requests, limit: 20, model: gemini-3.7-flash".
      // Treating that as a project-wide exhaustion marks every Google model
      // spent and skips a sibling holding its own separate allowance, which on
      // 1 September 2026 was the 3.5-flash that answered on the next line.
      // Only an exhaustion that names no model is taken as provider wide.
      // A quota is a window, so the mark expires with it. The server names its
      // own delay often enough to be worth honouring; a minute is the free
      // tier's window when it does not.
      const quotaWindow = () => Date.now() + (retryAfterMs(msg) ?? 60_000)

      const namesModel = /\bmodel:\s*\S+/i.test(msg)
      if (isQuota(msg) && namesModel) {
        markUnavailable(ref, quotaWindow())
        console.warn(`[ai] ${ref} is out of its own quota, trying the next model`)
        continue
      }
      if (isQuota(msg)) {
        exhaustedProviders.add(provider)
        const until = quotaWindow()
        for (const c of candidates) {
          if (providerOf(c.ref as ModelRef) === provider) markUnavailable(c.ref, until)
        }
        const another = candidates.slice(i + 1).find((c) => !exhaustedProviders.has(providerOf(c.ref)))
        if (another) {
          console.warn(`[ai] ${provider} is over quota, switching provider`)
          continue
        }
        // Nothing else configured: wait out the window once rather than fail,
        // but only if the wait AND a second attempt still fit the request's
        // budget. Sleeping 40 seconds inside a route the platform kills at 30
        // spends the user's whole request to arrive nowhere.
        const wait = retryAfterMs(msg)
        const left = budget.total - (Date.now() - startedAt)
        if (wait && wait + 5_000 < left) {
          console.warn(`[ai] ${provider} over quota and no other provider, waiting ${wait}ms`)
          await new Promise((r) => setTimeout(r, wait))
          const retryController = new AbortController()
          const retryTimer = setTimeout(() => retryController.abort(), Math.max(1_000, budget.total - (Date.now() - startedAt)))
          try {
            return { result: await run(model, ref, retryController.signal), ref }
          } catch (again) {
            last = again
          } finally {
            clearTimeout(retryTimer)
          }
        } else if (wait) {
          console.warn(`[ai] ${provider} over quota, and its ${wait}ms window is longer than this request has left`)
        }
        break
      }
      // Checked after quota on purpose: a 429 that also says "free tier" is a
      // window, not a billing fact, and marking it permanent would route away
      // from the best model for the life of the process.
      if (isEntitlement(msg)) {
        markUnavailable(ref, Infinity)
        console.warn(`[ai] ${ref} is not available on this plan, dropping it for this process`)
        continue
      }
      console.warn(`[ai] ${ref} failed, trying next: ${msg.slice(0, 160)}`)
    } finally {
      clearTimeout(timer)
    }
  }
  throw last instanceof Error ? last : new Error(`all models failed for "${task}"`)
}

/**
 * Token usage to whole micro dollars, for messages.cost_micro_usd.
 * Rates are per million tokens; the gateway charges provider list price with no
 * markup, so gateway and direct refs share numbers. Update when pricing moves.
 * Rounded up, because under-reporting your own cost is the failure that hurts.
 */
const RATES: Record<string, { in: number; out: number }> = {
  'google/gemini-3.7-flash': { in: 0.3, out: 2.5 },
  'google/gemini-3.5-flash-lite': { in: 0.1, out: 0.4 },
  'google:gemini-3.7-flash': { in: 0.3, out: 2.5 },
  'google:gemini-3.5-flash': { in: 0.3, out: 2.5 },
  'google:gemini-3.5-flash-lite': { in: 0.1, out: 0.4 },
  'anthropic:claude-sonnet-5': { in: 3, out: 15 },
  // Image models are billed PER IMAGE, not per token, so token rates cannot
  // express them and these zeros deliberately UNDER-report. Recorded here rather
  // than left absent, because a missing key silently falls through to the
  // 1-per-million default below and reports a plausible wrong number instead of
  // an obvious zero. Model per-image pricing when an image bill actually exists.
  'google/gemini-3.1-flash-image': { in: 0, out: 0 },
  'google:gemini-3.1-flash-image': { in: 0, out: 0 },
  'google:gemini-3.1-flash-lite-image': { in: 0, out: 0 },
}

export function costMicroUsd(ref: string, inputTokens = 0, outputTokens = 0): number {
  const r = RATES[ref] ?? { in: 1, out: 5 }
  return Math.ceil((inputTokens * r.in + outputTokens * r.out) / 1_000_000 * 1_000_000)
}
