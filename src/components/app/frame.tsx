/**
 * The invitation's ruled frame and its kbach corner brackets, drawn as ruled right
 * angles rather than floral ornament. The finish review found these built but never
 * mounted, which left the world's premise, ornament held under discipline, at zero
 * density on screen.
 *
 * The discipline: at most two ornament instances per screen. The plate is one, the
 * ledger frame is the other. Nothing else gets brackets.
 */
/**
 * Two rule weights, which is what makes ornament read as ornament rather than as a
 * border. The frame is the light course; the bracket is the heavy one, in plate ink
 * rather than the rule grey, so it registers at 100% instead of dissolving into the
 * line it sits on.
 */
export function CornerBracket({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} className={className} aria-hidden>
      <path d="M0 10 V0 H10" fill="none" stroke="currentColor" strokeWidth={2} />
      <path d="M5 15 V5 H15" fill="none" stroke="currentColor" strokeWidth={0.9} />
    </svg>
  )
}

/** A ruled frame with all four kbach corners. */
export function Frame({
  children,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLElement> & { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative border border-rule/40 ${className}`} {...rest}>
      <CornerBracket className="pointer-events-none absolute -top-px -left-px text-ink" />
      <CornerBracket className="pointer-events-none absolute -top-px -right-px rotate-90 text-ink" />
      <CornerBracket className="pointer-events-none absolute -bottom-px -right-px rotate-180 text-ink" />
      <CornerBracket className="pointer-events-none absolute -bottom-px -left-px -rotate-90 text-ink" />
      {children}
    </section>
  )
}

/** The plate: the shop's name set centred at display scale under a hairline. */
export function Plate({ name, meta }: { name: string; meta: string }) {
  return (
    <Frame className="my-5 px-4 py-6 text-center">
      <h1 className="km text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{name}</h1>
      <hr className="mx-auto mt-4 w-20 border-0 border-t border-rule" />
      <p className="km tnum mt-3 text-xs text-rule">{meta}</p>
    </Frame>
  )
}
