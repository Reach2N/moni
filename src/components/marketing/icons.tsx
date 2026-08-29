/**
 * Moni's own marks.
 *
 * Authored rather than taken from lucide, per rule 10 in CLAUDE.md: icons only,
 * never emoji, and an authored SVG must be drawn in the world's own stroke
 * weight. This world is the printed matter of a small shop, so the whole set is
 * drawn on a 24 unit grid at 1.5 stroke with BUTT caps and MITER joins. Lucide
 * is round-cap and round-join throughout; mixing the two reads as two icon sets
 * on one page, which is exactly the tell that made the first pass look generic.
 *
 * There is deliberately no sparkle, no wand and no robot here. Those are the
 * house style of AI marketing, and Moni is sold as a shop's own equipment.
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
      strokeWidth={1.5}
      strokeLinecap="butt"
      strokeLinejoin="miter"
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
      <path d="M3 8.5 4.5 4h15L21 8.5" />
      <path d="M3 8.5h18" />
      <path d="M4.5 8.5V20h15V8.5" />
      <path d="M4.5 20h15" />
      <path d="M8.5 20v-6h7v6" />
    </Frame>
  )
}

/** A squared speech mark. A customer message, not a chat bubble. */
export function IconMessage(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M3.5 4.5h17v12h-11l-4 3.5v-3.5h-2z" />
      <path d="M7 9h10" />
      <path d="M7 12.5h6" />
    </Frame>
  )
}

/** A ruled day with one slot struck. Availability and bookings. */
export function IconSlot(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M3.5 5.5h17v15h-17z" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
      <path d="M6.5 13h11M6.5 17h11" />
      <path d="M6.5 13h5v4h-5z" fill="currentColor" stroke="none" />
    </Frame>
  )
}

/** A note with the riel mark. Money, always in the local unit. */
export function IconRiel(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M2.5 6.5h19v11h-19z" />
      <path d="M9.5 9.5h5M9.5 14.5h5M12 9.5v5M10 12h4" />
      <path d="M5.5 12h1M17.5 12h1" />
    </Frame>
  )
}

/** The three finder squares of a QR. KHQR, the payment rail. */
export function IconQr(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7z" />
      <path d="M6 6h2v2h-2zM16 6h2v2h-2zM6 16h2v2h-2z" fill="currentColor" stroke="none" />
      <path d="M13.5 13.5h3v3h-3zM18 18h2.5v2.5h-2.5zM13.5 19h2M19 13.5v2" />
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
      <path d="M3.5 9.5h17v11h-17z" />
      <path d="M3.5 9.5 6 4h12l2.5 5.5" />
      <path d="M12 4v5.5" />
      <path d="M9.5 13.5h5" />
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
      <path d="M5 16.5h14v-2a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" />
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
