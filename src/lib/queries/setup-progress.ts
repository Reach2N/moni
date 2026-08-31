/**
 * What is left before this shop can serve a customer, in the order it has to
 * happen, in the words the owner would use.
 *
 * This file holds the whole judgement (CLAUDE.md rule 9) and the component that
 * renders it holds none of it. It is a pure function of four answers, which is
 * what lets `scripts/setup-progress-test.mjs` assert the states no seed data can
 * ever show: a shop on its first second, and a channel that dropped.
 *
 * There is no `server-only` import here on purpose. See CLAUDE.md: that import
 * makes a module unimportable from the test harness.
 */
import { toKhmerDigits } from '../format/khmer.ts'

export type SetupStepKey = 'describe' | 'catalogue' | 'channel' | 'customer'

/**
 * `failed` exists because a channel that connected and then dropped is not the
 * same as a channel never wired up, and an owner told "pending" for a broken
 * webhook will wait forever. Beautiful UI's Task Rows draws all three.
 */
export type SetupStepState = 'done' | 'pending' | 'failed'

export type SetupStep = {
  key: SetupStepKey
  /** Khmer, rendered with the `km` class by the component. */
  label: string
  /** The short right-hand fact, Khmer digits. Never a duplicate of the label. */
  amount: string
  state: SetupStepState
  /** Only ever set on a `failed` row, and shown verbatim to the owner. */
  error: string | null
  /** Where this row sends the owner. Every row has one. */
  href: string
}

export type SetupProgressInput = {
  hasDescription: boolean
  hasCatalogue: boolean
  serviceCount: number
  channels: readonly { channel: string; status: string; lastError: string | null }[]
  hasFirstTransaction: boolean
}

/** A channel counts as wired only when a row says so. */
function channelState(channels: SetupProgressInput['channels']): {
  state: SetupStepState
  error: string | null
  amount: string
} {
  const connected = channels.find((c) => c.status === 'connected')
  if (connected) return { state: 'done', error: null, amount: 'ភ្ជាប់រួច' }

  // Only 'error' is a failure. 'connecting' and 'disconnected' are both
  // states an owner chose or is passing through, and a red mark on either
  // is a false alarm: it must mean something broke, never that a step is
  // unfinished. The status column is free text, so treat anything
  // unrecognised as pending rather than as broken.
  const broken = channels.find((c) => c.status === 'error')
  if (broken) return { state: 'failed', error: broken.lastError, amount: 'ដាច់' }

  return { state: 'pending', error: null, amount: 'មិនទាន់ភ្ជាប់' }
}

export function deriveSetupProgress(input: SetupProgressInput): SetupStep[] {
  const channel = channelState(input.channels)

  return [
    {
      key: 'describe',
      label: 'ពិពណ៌នាហាង',
      amount: input.hasDescription ? 'រួចរាល់' : 'មិនទាន់',
      state: input.hasDescription ? 'done' : 'pending',
      error: null,
      href: '/app/onboarding',
    },
    {
      key: 'catalogue',
      label: 'បញ្ជីសេវា',
      amount: input.hasCatalogue ? `${toKhmerDigits(input.serviceCount)} សេវា` : 'គ្មានសេវា',
      state: input.hasCatalogue ? 'done' : 'pending',
      error: null,
      href: '/app/onboarding',
    },
    {
      key: 'channel',
      label: 'ភ្ជាប់ Telegram',
      amount: channel.amount,
      state: channel.state,
      error: channel.error,
      href: '/app/channels',
    },
    {
      key: 'customer',
      label: 'អតិថិជនដំបូង',
      amount: input.hasFirstTransaction ? 'មកដល់ហើយ' : 'មិនទាន់មាន',
      state: input.hasFirstTransaction ? 'done' : 'pending',
      error: null,
      href: '/app/inbox',
    },
  ]
}

/** The spine stops rendering forever once this is true. */
export function setupComplete(steps: readonly SetupStep[]): boolean {
  return steps.every((step) => step.state === 'done')
}
