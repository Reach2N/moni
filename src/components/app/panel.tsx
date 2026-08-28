/**
 * The panel grammar, extracted.
 *
 * DESIGN.md records one header pattern and one row pattern for the whole owner
 * surface, and the tree had five hand-typed copies of each, already drifting:
 * two padding scales, two badge shapes, and a count that was square in one panel
 * and absent in the next. These are those patterns as components, so the rules
 * that hold the world together live in one file instead of in five memories.
 *
 * Component sourcing, searched in order before building: shadcn's Card is the
 * closest fit and is disqualified by the world itself, which has no cards, no
 * shadows, and no radius (DESIGN.md, The Rule Is the Separator Rule). Adopting
 * it would mean overriding every one of its own decisions, which is a fork
 * wearing a dependency's name.
 */
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import { toKhmerDigits } from '@/lib/format/khmer.ts'

/**
 * The field container: a 70 percent rule, no brackets. Ornament frames with kbach
 * corners are `Frame`, and they are rationed to two per screen.
 */
export function Panel({
  className,
  ...rest
}: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn('border border-rule/70', className)} {...rest} />
}

/**
 * The count badge. Ink on seal measures 4.75:1 and paper on seal measures 3.61:1,
 * so the label is ink even though it sits on the accent: this is the one place a
 * count is small text on a coloured fill, and it has to survive daylight.
 */
export function PanelCount({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        'tnum inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-seal px-1.5 text-xs font-semibold text-ink',
        className,
      )}
    >
      {toKhmerDigits(value)}
    </span>
  )
}

/**
 * A panel header: a 16px lucide glyph at stroke 1.75 in rule grey, a label-grade
 * Khmer heading in plate ink, an optional count, closed by a hairline.
 */
export function PanelHeader({
  icon: Icon,
  title,
  titleId,
  note,
  count,
  trailing,
  className,
}: {
  icon: LucideIcon
  title: string
  titleId: string
  note?: string
  count?: number
  trailing?: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex min-h-12 items-center justify-between gap-3 border-b border-hairline px-3 py-1.5 sm:px-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-rule" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0">
          <h2 id={titleId} className="km truncate text-sm font-semibold text-ink">
            {title}
          </h2>
          {note ? <p className="km truncate text-xs text-rule">{note}</p> : null}
        </div>
      </div>
      {trailing ?? (count === undefined ? null : <PanelCount value={count} />)}
    </header>
  )
}

/** A list of rows, hairline divided, first divider suppressed. */
export function PanelRows({ className, ...rest }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn('', className)} {...rest} />
}

export function PanelRow({ className, ...rest }: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className={cn('border-t border-hairline first:border-t-0', className)} {...rest} />
}

/**
 * The note. DESIGN.md pins this shape for empty states and for errors alike: full
 * width on paper, plate ink text, a glyph in rule grey, and no red, because the
 * palette has no error colour and the system does not invent one.
 */
export function PanelNote({
  icon: Icon,
  title,
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { icon?: LucideIcon; title?: string }) {
  return (
    <div className={cn('flex items-start gap-3 px-3 py-3 sm:px-4', className)} {...rest}>
      {Icon ? <Icon className="mt-1 size-4 shrink-0 text-rule" strokeWidth={1.75} aria-hidden /> : null}
      <div className="min-w-0 flex-1">
        {title ? <p className="km text-sm font-semibold text-ink">{title}</p> : null}
        {children}
      </div>
    </div>
  )
}
