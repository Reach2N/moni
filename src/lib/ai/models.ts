/**
 * One place that decides which model runs which job.
 *
 * The point is that nothing else in the codebase names a provider. Call
 * `modelFor('parse')` and you get a model. Swap Gemini for Claude by changing an
 * env var, with no code edit and no import churn, because the AI SDK gives every
 * provider the same interface.
 *
 * Fallback matters more than it looks. Gemini's free tier is generous but rate
 * limited per minute, and a demo that dies on stage because of a 429 is worse
 * than a slower answer. So each job carries an ordered list and the first
 * provider with a configured key that does not throw wins.
 */
import { google } from '@ai-sdk/google'
import { anthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'

/** The jobs this product needs a model for. Add one, wire one line below. */
export type Task = 'parse' | 'chat' | 'classify'

/** "provider:model". Kept as a string so an env var can override it verbatim. */
type ModelRef = `google:${string}` | `anthropic:${string}`

/**
 * Verified against the live model list on this account, 19 August 2026.
 * gemini-3.7-flash is the newest stable Flash the key can see.
 *
 * Flash rather than Pro on purpose: parsing a shop description and answering a
 * customer are not reasoning-heavy, and Pro left the Gemini free tier in April
 * 2026. Flash-lite handles the cheap high-volume classify job.
 */
const DEFAULTS: Record<Task, ModelRef[]> = {
  // structured extraction, runs once per shop, quality matters most
  parse: ['google:gemini-3.7-flash', 'anthropic:claude-sonnet-5', 'google:gemini-3.5-flash'],
  // customer conversation with tool calling, runs constantly, latency matters
  chat: ['google:gemini-3.7-flash', 'google:gemini-3.5-flash', 'anthropic:claude-sonnet-5'],
  // "is this a booking request or a complaint", cheapest possible
  classify: ['google:gemini-3.5-flash-lite', 'google:gemini-3.7-flash'],
}

/** Env override, e.g. MONI_MODEL_PARSE="anthropic:claude-opus-5". */
function refsFor(task: Task): ModelRef[] {
  const override = process.env[`MONI_MODEL_${task.toUpperCase()}`]?.trim()
  if (override) return override.split(',').map((s) => s.trim() as ModelRef)
  return DEFAULTS[task]
}

function hasKeyFor(provider: string): boolean {
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
        `Set GEMINI_API_KEY or ANTHROPIC_API_KEY in .env.local`,
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
 * Only worth retrying on a transport or quota failure. A schema validation
 * failure means the prompt is wrong and the next model will fail identically,
 * so that propagates immediately instead of burning three providers.
 */
export async function withFallback<T>(
  task: Task,
  run: (model: LanguageModel, ref: string) => Promise<T>,
): Promise<{ result: T; ref: string }> {
  const candidates = modelsFor(task)
  let last: unknown
  for (const { ref, model } of candidates) {
    try {
      return { result: await run(model, ref), ref }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const retryable =
        /429|rate|quota|exhausted|overloaded|high demand|unavailable|503|502|500|timeout|ETIMEDOUT|ECONN|fetch failed/i.test(
          msg,
        )
      if (!retryable) throw err
      last = err
      console.warn(`[ai] ${ref} failed, trying next: ${msg.slice(0, 160)}`)
    }
  }
  throw last instanceof Error ? last : new Error(`all models failed for "${task}"`)
}

/**
 * Token usage to whole micro dollars, for messages.cost_micro_usd.
 * Rates are per million tokens. Update when pricing moves. Rounded up, because
 * under-reporting your own cost is the failure that hurts.
 */
const RATES: Record<string, { in: number; out: number }> = {
  'google:gemini-3.7-flash': { in: 0.3, out: 2.5 },
  'google:gemini-3.5-flash': { in: 0.3, out: 2.5 },
  'google:gemini-3.5-flash-lite': { in: 0.1, out: 0.4 },
  'anthropic:claude-sonnet-5': { in: 3, out: 15 },
}

export function costMicroUsd(ref: string, inputTokens = 0, outputTokens = 0): number {
  const r = RATES[ref] ?? { in: 1, out: 5 }
  return Math.ceil((inputTokens * r.in + outputTokens * r.out) / 1_000_000 * 1_000_000)
}
