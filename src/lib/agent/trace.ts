import { type CustomerTool } from '../types.ts'

/**
 * What the assistant actually did on one customer turn, in the owner's words.
 *
 * The owner's real question when she tries her own shop is not "is it polite",
 * it is "did that answer come from MY prices or did it make something up". The
 * agent is forbidden from stating a price it did not read from a tool, so the
 * tool calls are the evidence, and this turns them into something she can read.
 *
 * No `server-only`: the chat panel is a client component and the rules are
 * asserted in `db/test.mjs`.
 */

/**
 * `satisfies Record<CustomerTool, string>` is the whole point of this map.
 *
 * Its predecessor was a loose `Record<string, string>` in the component and it
 * had rotted: it carried labels for `list_services` and `reschedule_booking`,
 * neither of which has ever existed as a tool, while any real call it did not
 * recognise was dropped by a `.filter(Boolean)` and vanished from the trace
 * entirely. A tool with no label now fails the build, and a label with no tool
 * fails it too.
 */
const LABEL = {
  get_business: 'អានព័ត៌មានហាង សេវា និងតម្លៃ',
  search_catalogue: 'រកមើលអ្វីដែលហាងលក់',
  list_slots: 'ពិនិត្យពេលទំនេរពិតប្រាកដ',
  create_booking: 'កត់ការណាត់ក្នុងហាង',
  cancel_booking: 'លុបការណាត់',
  find_booking: 'រកការណាត់តាមលេខកូដ',
  create_payment: 'បង្កើត KHQR សម្រាប់បង់ប្រាក់',
  check_payment: 'ពិនិត្យថាតើប្រាក់មកដល់ឬនៅ',
  escalate_to_owner: 'ផ្ទេរសារមកអ្នក ហើយឈប់ឆ្លើយ',
} satisfies Record<CustomerTool, string>

/**
 * Handing over is not grounding. Every other tool reads or writes the shop's
 * own rows, so a reply that called one rests on data; a reply that called only
 * this one rests on nothing, and says so.
 */
const NOT_GROUNDING: ReadonlySet<string> = new Set<CustomerTool>(['escalate_to_owner'])

export type TurnTrace = {
  /** One line per tool call, in the order they happened, including repeats. */
  steps: string[]
  /** Did this answer rest on the shop's own rows? */
  grounded: boolean
}

export function describeTurn(toolCalls: ReadonlyArray<{ tool?: string }> | undefined): TurnTrace {
  const calls = (toolCalls ?? []).map((call) => call.tool ?? '').filter((tool) => tool.length > 0)
  return {
    steps: calls.map(
      // An unrecognised tool is NAMED rather than dropped. A step the owner
      // cannot read is still better than a step she never learns happened.
      (tool) => LABEL[tool as CustomerTool] ?? `ប្រើឧបករណ៍ ${tool}`,
    ),
    grounded: calls.some((tool) => !NOT_GROUNDING.has(tool)),
  }
}
