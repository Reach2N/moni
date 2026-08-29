/**
 * A fixed-window rate limit, per key, in memory.
 *
 * PLAN.md Phase 9 asks for a webhook rate limit per chat id. This is that, and
 * its limits are worth stating plainly rather than discovering later.
 *
 * It is PER INSTANCE. On Fluid Compute an instance is reused across concurrent
 * requests, so in practice one busy sender meets one counter and this works.
 * But it is not a global limit and must never be the only thing between us and
 * a cost: the budget ceilings in `budget.ts` are enforced against the DATABASE,
 * which every instance shares. This stops a chatty bot from making us do work;
 * that stops a bill.
 *
 * Fixed window, not a token bucket, because the failure mode we care about is
 * "one chat id sending fifty messages a second", and for that the extra
 * precision of a bucket buys nothing.
 *
 * No `server-only`: it is a rule, and db/test.mjs proves it.
 */

export type RateVerdict =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number }

type Window = { count: number; resetAt: number }

export type RateLimiter = {
  check(key: string, now?: number): RateVerdict
  /** Visible for tests and for a future admin surface. */
  size(): number
}

export function createRateLimiter({
  limit,
  windowMs,
  /** Beyond this many tracked keys the oldest windows are dropped. */
  maxKeys = 10_000,
}: {
  limit: number
  windowMs: number
  maxKeys?: number
}): RateLimiter {
  const windows = new Map<string, Window>()

  function sweep(now: number) {
    for (const [key, window] of windows) {
      if (window.resetAt <= now) windows.delete(key)
    }
    // A map that only ever grows is a memory leak wearing a rate limiter's
    // clothes. If sweeping expired windows was not enough, drop oldest first.
    if (windows.size > maxKeys) {
      const excess = windows.size - maxKeys
      let dropped = 0
      for (const key of windows.keys()) {
        windows.delete(key)
        if (++dropped >= excess) break
      }
    }
  }

  return {
    check(key, now = Date.now()) {
      const existing = windows.get(key)
      if (!existing || existing.resetAt <= now) {
        sweep(now)
        windows.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true, remaining: limit - 1 }
      }
      if (existing.count >= limit) {
        return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1_000) }
      }
      existing.count += 1
      return { allowed: true, remaining: limit - existing.count }
    },
    size: () => windows.size,
  }
}

/**
 * One customer sending more than twenty messages a minute to one shop is not a
 * customer. Generous enough that a real person typing fast never sees it.
 */
export const inboundMessageLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 })
