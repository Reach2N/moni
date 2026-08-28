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
import { gateway } from '@ai-sdk/gateway'
import { google } from '@ai-sdk/google'
import { anthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'

/** The jobs this product needs a model for. Add one, wire one line below. */
export type Task = 'parse' | 'chat' | 'classify'

/**
 * "provider:model". Kept as a string so an env var can override it verbatim.
 * gateway ids are "creator/model-name" slugs, e.g. gateway:google/gemini-3.7-flash.
 */
type ModelRef = `gateway:${string}` | `google:${string}` | `anthropic:${string}`

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
    'gateway:google/gemini-3.7-flash',
    'google:gemini-3.7-flash',
    'anthropic:claude-sonnet-5',
    'google:gemini-3.5-flash',
  ],
  // customer conversation with tool calling, runs constantly, latency matters
  chat: [
    'gateway:google/gemini-3.7-flash',
    'google:gemini-3.7-flash',
    'google:gemini-3.5-flash',
    'anthropic:claude-sonnet-5',
  ],
  // "is this a booking request or a complaint", cheapest possible
  classify: [
    'gateway:google/gemini-3.5-flash-lite',
    'google:gemini-3.5-flash-lite',
    'google:gemini-3.7-flash',
  ],
}

/** Env override, e.g. MONI_MODEL_PARSE="gateway:anthropic/claude-opus-4.8". */
function refsFor(task: Task): ModelRef[] {
  const override = process.env[`MONI_MODEL_${task.toUpperCase()}`]?.trim()
  if (override) return override.split(',').map((s) => s.trim() as ModelRef)
  return DEFAULTS[task]
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

function build(ref: ModelRef): LanguageModel {
  const [provider, ...rest] = ref.split(':')
  const id = rest.join(':')
  if (provider === 'gateway') return gateway(id)
  if (provider === 'google') return google(id)
  if (provider === 'anthropic') return anthropic(id)
  throw new Error(`unknown provider in "${ref}"`)
}

/** Every configured candidate for a job, in preference order. */
export function modelsFor(task: Task): Array<{ ref: ModelRef; model: LanguageModel }> {
  const out = refsFor(task)
    .filter((ref) => hasKeyFor(ref.split(':')[0]!))
    .map((ref) => ({ ref, model: build(ref) }))
  if (out.length === 0) {
    throw new Error(
      `no API key configured for any model assigned to "${task}". ` +
        `Set AI_GATEWAY_API_KEY, GEMINI_API_KEY or ANTHROPIC_API_KEY in .env.local`,
    )
  }
  return out
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
 * A QUOTA failure is per project, not per model. Gemini's free tier counts every
 * Gemini model against one bucket, so falling from 3.7-flash to 3.5-flash on a 429
 * fails the same way a millisecond later. On a quota error we therefore skip every
 * remaining candidate from the SAME provider and jump to a different one (the
 * gateway bills through Vercel and direct Google bills through the Google key, so
 * they are different buckets even for the same underlying model). If none exists,
 * we honour the server's own retryDelay once, because the free tier window is per
 * minute and waiting is usually cheaper than failing the user's request.
 */
const isQuota = (m: string) => /429|quota|exhausted|RESOURCE_EXHAUSTED|rate limit/i.test(m)
const isRetryable = (m: string) =>
  isQuota(m) || /overloaded|high demand|unavailable|503|502|500|timeout|ETIMEDOUT|ECONN|fetch failed/i.test(m)

/** Gemini reports "Please retry in 41.6s"; honour it rather than guessing. */
function retryAfterMs(msg: string): number | null {
  const m = msg.match(/retry in ([\d.]+)s/i)
  if (!m) return null
  const s = Number(m[1])
  return Number.isFinite(s) && s <= 65 ? Math.ceil(s * 1000) + 500 : null
}

export async function withFallback<T>(
  task: Task,
  run: (model: LanguageModel, ref: string) => Promise<T>,
): Promise<{ result: T; ref: string }> {
  const candidates = modelsFor(task)
  const exhaustedProviders = new Set<string>()
  let last: unknown

  for (let i = 0; i < candidates.length; i++) {
    const { ref, model } = candidates[i]!
    const provider = ref.split(':')[0]!
    if (exhaustedProviders.has(provider)) continue

    try {
      return { result: await run(model, ref), ref }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!isRetryable(msg)) throw err
      last = err

      if (isQuota(msg)) {
        exhaustedProviders.add(provider)
        const another = candidates.slice(i + 1).find((c) => !exhaustedProviders.has(c.ref.split(':')[0]!))
        if (another) {
          console.warn(`[ai] ${provider} is over quota, switching provider`)
          continue
        }
        // nothing else configured: wait out the window once rather than fail
        const wait = retryAfterMs(msg)
        if (wait) {
          console.warn(`[ai] ${provider} over quota and no other provider, waiting ${wait}ms`)
          await new Promise((r) => setTimeout(r, wait))
          try {
            return { result: await run(model, ref), ref }
          } catch (again) {
            last = again
          }
        }
        break
      }
      console.warn(`[ai] ${ref} failed, trying next: ${msg.slice(0, 160)}`)
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
  'gateway:google/gemini-3.7-flash': { in: 0.3, out: 2.5 },
  'gateway:google/gemini-3.5-flash-lite': { in: 0.1, out: 0.4 },
  'google:gemini-3.7-flash': { in: 0.3, out: 2.5 },
  'google:gemini-3.5-flash': { in: 0.3, out: 2.5 },
  'google:gemini-3.5-flash-lite': { in: 0.1, out: 0.4 },
  'anthropic:claude-sonnet-5': { in: 3, out: 15 },
}

export function costMicroUsd(ref: string, inputTokens = 0, outputTokens = 0): number {
  const r = RATES[ref] ?? { in: 1, out: 5 }
  return Math.ceil((inputTokens * r.in + outputTokens * r.out) / 1_000_000 * 1_000_000)
}
