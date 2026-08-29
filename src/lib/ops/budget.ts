/**
 * What a shop's assistant is allowed to cost.
 *
 * `messages.cost_micro_usd` has recorded spend since the beginning and nothing
 * has ever bounded it. That is fine until the first prompt-loop, the first
 * abusive customer, or the first bug that re-sends a conversation's history
 * forever, and then it is a bill nobody approved. PLAN.md Phase 9 calls this out
 * and the acceptance check is explicit: a synthetic runaway conversation must be
 * cut off by the cap rather than by the invoice.
 *
 * Two ceilings, because they catch different failures. The per-conversation cap
 * catches ONE conversation going wrong, which is the common case and the one a
 * customer can cause. The monthly ceiling catches a shop going wrong in
 * aggregate, which is the one a bug causes.
 *
 * No `server-only`: these are the rules, and a rule nothing tests is a comment.
 */

/** Micro dollars: millionths of one USD, matching `messages.cost_micro_usd`. */
export const MICRO_USD_PER_USD = 1_000_000

/**
 * About five dollars of model spend per shop per month. Generous against the
 * free tier's 100 transactions: a booking conversation costs well under a cent,
 * so this is roughly a thousand conversations before anyone notices.
 */
export const DEFAULT_MONTH_CEILING_MICRO_USD = 5 * MICRO_USD_PER_USD

/**
 * Ten cents in one conversation. A booking takes a handful of turns; reaching
 * this means something is looping, not that a customer is being thorough.
 */
export const DEFAULT_CONVERSATION_CAP_MICRO_USD = 100_000

export type Spend = {
  /** What this business has spent on models so far this calendar month. */
  monthMicroUsd: number
  /** What this one conversation has spent, over its whole life. */
  conversationMicroUsd: number
}

export type Ceilings = {
  monthMicroUsd?: number
  conversationMicroUsd?: number
}

export type BudgetVerdict =
  | { allowed: true }
  | {
      allowed: false
      /** Which ceiling stopped it. The owner and we care about different ones. */
      reason: 'month' | 'conversation'
      spentMicroUsd: number
      ceilingMicroUsd: number
    }

/**
 * Checked BEFORE the model runs, never after. Refusing a turn we have not paid
 * for is a cap; noticing afterwards is a receipt.
 *
 * The conversation cap is evaluated first. When both are blown it is the more
 * actionable answer: one thread to look at rather than a whole month to explain.
 */
export function checkBudget(spend: Spend, ceilings: Ceilings = {}): BudgetVerdict {
  const conversationCap = ceilings.conversationMicroUsd ?? DEFAULT_CONVERSATION_CAP_MICRO_USD
  const monthCeiling = ceilings.monthMicroUsd ?? DEFAULT_MONTH_CEILING_MICRO_USD

  if (spend.conversationMicroUsd >= conversationCap) {
    return {
      allowed: false,
      reason: 'conversation',
      spentMicroUsd: spend.conversationMicroUsd,
      ceilingMicroUsd: conversationCap,
    }
  }
  if (spend.monthMicroUsd >= monthCeiling) {
    return {
      allowed: false,
      reason: 'month',
      spentMicroUsd: spend.monthMicroUsd,
      ceilingMicroUsd: monthCeiling,
    }
  }
  return { allowed: true }
}

/**
 * What the customer is told when a cap bites.
 *
 * Never the reason. A customer hearing "this shop hit its AI budget" learns
 * something true, useless to them, and embarrassing to the shop. They are told
 * the owner will reply, which is exactly what happens: the conversation is
 * handed over, not dropped.
 */
export const BUDGET_HANDOVER_REASON = 'ដល់ដែនកំណត់ចំណាយរបស់ជំនួយការ។ សូមម្ចាស់ហាងឆ្លើយផ្ទាល់។'

/** Micro dollars to something a person reads, for the owner's own screens. */
export function formatSpend(microUsd: number): string {
  return `$${(microUsd / MICRO_USD_PER_USD).toFixed(2)}`
}
