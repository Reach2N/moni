/**
 * Moni's own marks.
 *
 * Authored rather than taken from lucide, per rule 10 in CLAUDE.md: icons only,
 * never emoji, and an authored SVG must be drawn in the world's own stroke
 * weight. Drawn on a 24 unit grid at 1.75 stroke with ROUND caps and ROUND
 * joins, which is SF Symbols' geometry and what PLAN.md section 3 means by
 * Apple-native. An earlier pass drew them butt-cap and miter for a printed
 * look; against continuous 14px radii that read as a second icon set pasted
 * onto the page.
 *
 * There is deliberately no sparkle, no wand and no robot here. Those are the
 * house style of AI marketing. Moni's agent is shown by what it DOES: it reads
 * the price list, checks the calendar, answers, and hands back when unsure.
 */

type IconProps = {
  className?: string
  /** Decorative by default. Pass a title only when the mark carries meaning alone. */
  title?: string
}

function Frame({ className, title, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

/** A shopfront: awning over a counter. Stands for the business itself. */
export function IconShopfront(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M3 9 4.75 4.5h14.5L21 9a2.5 2.5 0 0 1-4.5 1.5A2.5 2.5 0 0 1 12 10.5a2.5 2.5 0 0 1-4.5 0A2.5 2.5 0 0 1 3 9Z" />
      <path d="M4.75 11.5V20h14.5v-8.5" />
      <path d="M9.5 20v-5.5h5V20" />
    </Frame>
  )
}

/** A speech mark with lines in it. An incoming customer message. */
export function IconMessage(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H9.5L5 20v-3.5H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5Z" />
      <path d="M6.5 9.5h11M6.5 12.75h7" />
    </Frame>
  )
}

/**
 * A speech mark answering, with three beats in it.
 *
 * This is the agent's own mark. It is a reply, not a robot: the claim the page
 * makes is that Moni does the talking, so the glyph for it is a message going
 * back out, mirrored from IconMessage so the pair reads as a conversation.
 */
export function IconAgentReply(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M20 5.5H4A1.5 1.5 0 0 0 2.5 7v8A1.5 1.5 0 0 0 4 16.5h10.5L19 20v-3.5h1a1.5 1.5 0 0 0 1.5-1.5V7A1.5 1.5 0 0 0 20 5.5Z" />
      <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth={2.25} />
    </Frame>
  )
}

/** A clock face. Real availability, checked rather than guessed. */
export function IconClock(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Frame>
  )
}

/** A shield. The guardrail: Moni stops rather than inventing an answer. */
export function IconShield(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M12 2.75 4.5 6v6c0 4.2 3.1 7.6 7.5 9.25 4.4-1.65 7.5-5.05 7.5-9.25V6z" />
      <path d="m8.75 12 2.25 2.25L15.5 9.75" />
    </Frame>
  )
}

/** A day with one slot taken. Availability and bookings. */
export function IconSlot(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.75h17" />
      <path d="M8 3v3.5M16 3v3.5" />
      <path d="m9 15 2 2 4-4" />
    </Frame>
  )
}

/** A note with the riel mark. Money, always in the local unit. */
export function IconRiel(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M9.5 9.5h5M9.5 14.5h5M12 9.5v5M10 12h4" />
      <path d="M5.75 12h.5M17.75 12h.5" strokeWidth={2.25} />
    </Frame>
  )
}

/** The three finder squares of a QR. KHQR, the payment rail. */
export function IconQr(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <path d="M6.25 6.25h1.5v1.5h-1.5zM16.25 6.25h1.5v1.5h-1.5zM6.25 16.25h1.5v1.5h-1.5z" fill="currentColor" stroke="none" />
      <path d="M13.5 13.75v2.5M17 13.5h.01M20.5 13.5h.01M13.5 20.5h.01M17 17.5v3M20.5 17.5v3" strokeWidth={2} />
    </Frame>
  )
}

/** A struck check. Confirmation, and only confirmation. */
export function IconCheck(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="m4 12.5 5 5L20 6.5" />
    </Frame>
  )
}

/** A spoken waveform. The owner describing the shop out loud. */
export function IconVoice(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M3 10.5v3M7 7v10M11 4.5v15M15 8.5v7M19 11v2" />
    </Frame>
  )
}

/** An arrow turning back. Moni handing an uncertain message to the owner. */
export function IconHandBack(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M20.5 6.5v4a4 4 0 0 1-4 4H4.5" />
      <path d="m9 9.5-4.5 5L9 19.5" />
    </Frame>
  )
}

/** A stack of goods. Products, as opposed to time-based services. */
export function IconGoods(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="3.5" y="9.5" width="17" height="11" rx="2" />
      <path d="M3.5 9.5 6 4.5h12l2.5 5" />
      <path d="M12 4.5v5" />
      <path d="M9.5 14h5" />
    </Frame>
  )
}

/** A bed under a roof. Rooms and overnight stays. */
export function IconRoom(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M2.5 11 12 4l9.5 7" />
      <path d="M5 12.5v8M19 12.5v8" />
      <path d="M5 20.5h14" />
      <path d="M5 16.5h14v-2a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2Z" />
    </Frame>
  )
}

/** A plus that becomes a minus when its group is open. Disclosure, not decoration. */
export function IconPlus(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M12 5v14" className="origin-center transition-transform duration-200 group-open:scale-y-0" />
      <path d="M5 12h14" />
    </Frame>
  )
}
