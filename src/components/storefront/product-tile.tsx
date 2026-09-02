import type { Primitive, TileSpec } from '@/lib/media/tile.ts'
import { patternGeometry } from '@/lib/media/tile.ts'

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
 * This component only renders. The coordinates come from `patternGeometry` in
 * `tile.ts`, kept pure and separate so `db/test.mjs` can rotate the real
 * shapes and prove `ROTATIONS_FOR` true about the art, not about this file.
 */
const TINTS = ['8%', '14%', '22%'] as const

function pathD(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function drawPrimitive(primitive: Primitive, key: number) {
  if (primitive.kind === 'line') {
    return <line key={key} x1={primitive.x1} y1={primitive.y1} x2={primitive.x2} y2={primitive.y2} />
  }
  if (primitive.kind === 'circle') {
    return <circle key={key} cx={primitive.cx} cy={primitive.cy} r={primitive.r} fill="currentColor" stroke="none" />
  }
  return <path key={key} d={pathD(primitive.points)} />
}

export function ProductTile({ spec, className }: { spec: TileSpec; className?: string }) {
  const paint = { color: `color-mix(in srgb, var(--sf-accent) ${TINTS[spec.tint]}, transparent)` }
  const primitives = patternGeometry(spec.pattern, spec.density)
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ ...paint, background: `color-mix(in srgb, var(--sf-accent) 6%, var(--sf-surface))` }}
    >
      <svg viewBox="0 0 56 56" width="56" height="56" style={{ transform: `rotate(${spec.rotation}deg)` }}>
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          {primitives.map((primitive, i) => drawPrimitive(primitive, i))}
        </g>
      </svg>
    </span>
  )
}
