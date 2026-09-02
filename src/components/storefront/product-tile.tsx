import type { TileSpec } from '@/lib/media/tile.ts'

/**
 * The drawing half of `tileFor`. Six authored patterns, in the world's own
 * stroke weight, at the same size as the photo they stand in for and in the
 * same rounded box, so a half photographed menu has one alignment and one
 * rhythm rather than two.
 *
 * Every pattern is geometric on purpose. It must not resemble a photograph: a
 * customer who thinks she is looking at a picture of the food has been misled,
 * which is the failure this whole approach exists to avoid.
 */
const TINTS = ['8%', '14%', '22%'] as const

export function ProductTile({ spec, className }: { spec: TileSpec; className?: string }) {
  const paint = { color: `color-mix(in srgb, var(--sf-accent) ${TINTS[spec.tint]}, transparent)` }
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ ...paint, background: `color-mix(in srgb, var(--sf-accent) 6%, var(--sf-surface))` }}
    >
      <svg viewBox="0 0 56 56" width="56" height="56" style={{ transform: `rotate(${spec.rotation}deg)` }}>
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          {spec.pattern === 'bars' && [10, 20, 30, 40].map((x) => <line key={x} x1={x} y1="8" x2={x} y2="48" />)}
          {spec.pattern === 'arcs' && [14, 26, 38].map((r) => <path key={r} d={`M ${28 - r} 44 A ${r} ${r} 0 0 1 ${28 + r} 44`} />)}
          {spec.pattern === 'grid' && [14, 28, 42].flatMap((v) => [
            <line key={`h${v}`} x1="8" y1={v} x2="48" y2={v} />,
            <line key={`v${v}`} x1={v} y1="8" x2={v} y2="48" />,
          ])}
          {spec.pattern === 'chevron' && [10, 24, 38].map((y) => <path key={y} d={`M 12 ${y + 10} L 28 ${y} L 44 ${y + 10}`} />)}
          {spec.pattern === 'dots' && [14, 28, 42].flatMap((cy) =>
            [14, 28, 42].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="currentColor" stroke="none" />),
          )}
          {spec.pattern === 'waves' && [16, 28, 40].map((y) => (
            <path key={y} d={`M 8 ${y} Q 18 ${y - 7} 28 ${y} T 48 ${y}`} />
          ))}
        </g>
      </svg>
    </span>
  )
}
