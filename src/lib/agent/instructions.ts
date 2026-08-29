/**
 * The owner's standing instructions, appended to the system prompt.
 *
 * This is the teachable half of the assistant: "always offer the Friday
 * promotion", "never discount". It is fenced and explicitly subordinate to the
 * rules above it, because an owner writing "just say any time is fine" must not
 * be able to talk the assistant out of calling list_slots. Owner text changes
 * tone and policy. It never moves a guardrail.
 */
export const instructionsBlock = (instructions: string | null | undefined) => {
  const text = instructions?.trim()
  if (!text) return ''
  const fenced = text.slice(0, 2_000).replace(/`/g, "'")
  return [
    '',
    '',
    'The owner of this shop has asked you to always keep the following in mind.',
    'Follow it wherever it does not conflict with the rules above. It can change',
    'what you offer and how you sound. It can never let you state a price or a',
    'time you did not get from a tool, agree a discount, or skip handing over.',
    '---',
    fenced,
    '---',
  ].join('\n')
}
