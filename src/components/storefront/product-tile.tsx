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
 *
 * `spec.density` sets the count of repeated elements this draws (grid cells
 * per axis, dot rows, bar count, wave count, arc count, chevron count), always
 * from an evenly spaced position list whose low and high bound sum to 56, the
 * tile's own width and height. That is what keeps a `grid` or `dots` tile
 * genuinely the same picture under every rotation, and a `bars` or `waves`
 * tile genuinely the same picture after 180 degrees, at every density:
 * `tile.ts`'s `ROTATIONS_FOR` only promises that symmetry, this is what makes
 * it true.
 */
const TINTS = ['8%', '14%', '22%'] as const

/**
 * `count` positions spaced evenly across [lo, hi]. Callers whose pattern needs
 * to stay symmetric about the tile's centre pass a range that sums to 56, so
 * the list is its own mirror image and a rotation that should be a no-op
 * actually is one.
 */
function evenly(count: number, lo: number, hi: number): number[] {
  if (count === 1) return [(lo + hi) / 2]
  const step = (hi - lo) / (count - 1)
  return Array.from({ length: count }, (_, i) => lo + i * step)
}

export function ProductTile({ spec, className }: { spec: TileSpec; className?: string }) {
  const paint = { color: `color-mix(in srgb, var(--sf-accent) ${TINTS[spec.tint]}, transparent)` }
  const n = spec.density
  const dotRadius = n >= 5 ? 2 : n === 4 ? 2.5 : 3
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ ...paint, background: `color-mix(in srgb, var(--sf-accent) 6%, var(--sf-surface))` }}
    >
      <svg viewBox="0 0 56 56" width="56" height="56" style={{ transform: `rotate(${spec.rotation}deg)` }}>
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          {spec.pattern === 'bars' && evenly(n, 10, 46).map((x) => <line key={x} x1={x} y1="8" x2={x} y2="48" />)}
          {spec.pattern === 'arcs' && evenly(n, 14, 38).map((r) => <path key={r} d={`M ${28 - r} 44 A ${r} ${r} 0 0 1 ${28 + r} 44`} />)}
          {spec.pattern === 'grid' && evenly(n, 14, 42).flatMap((v) => [
            <line key={`h${v}`} x1="8" y1={v} x2="48" y2={v} />,
            <line key={`v${v}`} x1={v} y1="8" x2={v} y2="48" />,
          ])}
          {spec.pattern === 'chevron' && evenly(n, 10, 38).map((y) => <path key={y} d={`M 12 ${y + 10} L 28 ${y} L 44 ${y + 10}`} />)}
          {spec.pattern === 'dots' && evenly(n, 14, 42).flatMap((cy) =>
            evenly(n, 14, 42).map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={dotRadius} fill="currentColor" stroke="none" />),
          )}
          {spec.pattern === 'waves' && evenly(n, 16, 40).map((y) => (
            <path key={y} d={`M 8 ${y} Q 18 ${y - 7} 28 ${y} T 48 ${y}`} />
          ))}
        </g>
      </svg>
    </span>
  )
}
