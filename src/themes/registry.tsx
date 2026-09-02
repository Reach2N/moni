import type { StorefrontData, ThemeModule } from './types.ts'
import { DAY_NAMES_KM, groupedItems, money, orderedHours } from './shared.ts'
import type { ThemeId } from '@/lib/types.ts'

/**
 * Four hand-built themes over one typed prop.
 *
 * `satisfies Record<ThemeId, ThemeModule>` at the bottom is the whole point: a
 * theme declared in `THEMES` and never implemented here is a COMPILE error, not
 * a runtime white screen on a real shop's public site.
 *
 * The model never reaches this file. It fills a validated `StorefrontContent`
 * object of plain strings and picks an id; the markup is ours. That is what
 * makes a bad generation read badly instead of breaking a shop.
 *
 * The markup below is ours and stays fixed. The colour, radius and rhythm it
 * renders in are seeded: classes like `bg-green` and the `--sf-radius` and
 * `sf-section` tokens used here resolve through the `.sf` remap in
 * globals.css, which `src/lib/storefront/style.ts` fills in per shop. A theme
 * never sees the seed and never computes a style: it only wears one.
 */

function Hours({ data }: { data: StorefrontData }) {
  const hours = orderedHours(data.shop.hours)
  if (hours.length === 0) return null
  return (
    <dl className="km grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {hours.map((day) => (
        <div key={day.dow} className="contents">
          <dt className="text-label-2">{DAY_NAMES_KM[day.dow]}</dt>
          <dd className="tnum">{day.open} ដល់ {day.close}</dd>
        </div>
      ))}
    </dl>
  )
}

function Action({ data, className }: { data: StorefrontData; className?: string }) {
  if (data.action.kind === 'none' || !data.action.href) {
    return <p className="km text-sm text-label-2">{data.action.label}</p>
  }
  return (
    <a href={data.action.href} className={className}>
      {data.content.callToAction}
    </a>
  )
}

/**
 * What the shop sells, grouped the way a menu reads.
 *
 * A photo is an enhancement and never the skeleton: a shop that uploaded
 * nothing gets a clean list of names and prices, which is what most shops will
 * have on their first day. The image is fixed size and cropped so one tall
 * photo cannot stretch a row and break the price column's alignment.
 */
function Items({ data, className }: { data: StorefrontData; className?: string }) {
  const groups = groupedItems(data.items)
  return (
    <div className={className}>
      {groups.map((group) => (
        <section key={group.category ?? 'ungrouped'} className="sf-section">
          {group.category ? (
            <h3 className="km mb-1 text-sm font-semibold tracking-wide text-label-2">{group.category}</h3>
          ) : null}
          <ul>
            {group.rows.map((item) => (
              <li
                key={item.id}
                className="sf-row flex items-center gap-3"
              >
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a Supabase Storage URL on a public page, sized here rather than through the image pipeline
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    width={56}
                    height={56}
                    loading="lazy"
                    className="size-14 shrink-0 rounded-[calc(var(--sf-radius)*0.75)] object-cover"
                  />
                ) : null}
                <span className="km min-w-0 flex-1">
                  <span className="block truncate">{item.name}</span>
                  {item.nameEn ? <span className="block truncate text-xs text-label-2">{item.nameEn}</span> : null}
                </span>
                <span className="tnum shrink-0 text-right">{money(item)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** Soft and service led: hair, beauty, nails. */
function SalonStorefront({ data }: { data: StorefrontData }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12">
      <p className="km text-sm tracking-wide text-label-2">{data.shop.province ?? 'កម្ពុជា'}</p>
      <h1 className="km mt-1 text-3xl font-semibold">{data.content.headline}</h1>
      <p className="km mt-3 text-lg text-label-2">{data.content.subhead}</p>
      <Action data={data} className="km mt-6 inline-flex min-h-11 items-center rounded-[var(--sf-radius)] bg-green px-6 text-[0.9375rem] font-medium text-on-green" />

      <h2 className="km mt-12 text-sm font-semibold tracking-wide text-label-2">សេវា និងតម្លៃ</h2>
      <Items data={data} className="mt-2" />

      <h2 className="km mt-10 text-sm font-semibold tracking-wide text-label-2">អំពីយើង</h2>
      <p className="km mt-2 text-[0.9375rem] leading-relaxed">{data.content.about}</p>

      <h2 className="km mt-10 text-sm font-semibold tracking-wide text-label-2">ម៉ោងបើក</h2>
      <div className="mt-2"><Hours data={data} /></div>
    </div>
  )
}

/** Rooms and nights: guesthouses and hotels. */
function StayStorefront({ data }: { data: StorefrontData }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <header className="border-b border-separator pb-8">
        <h1 className="km text-4xl font-semibold tracking-tight">{data.content.headline}</h1>
        <p className="km mt-3 max-w-xl text-lg text-label-2">{data.content.subhead}</p>
        <Action data={data} className="km mt-6 inline-flex min-h-11 items-center rounded-[var(--sf-radius)] bg-green px-6 text-[0.9375rem] font-medium text-on-green" />
      </header>

      <div className="mt-8 grid gap-10 sm:grid-cols-2">
        <section>
          <h2 className="km text-sm font-semibold tracking-wide text-label-2">បន្ទប់ និងតម្លៃ</h2>
          <Items data={data} className="mt-2" />
        </section>
        <section>
          <h2 className="km text-sm font-semibold tracking-wide text-label-2">អំពីកន្លែងស្នាក់នៅ</h2>
          <p className="km mt-2 text-[0.9375rem] leading-relaxed">{data.content.about}</p>
          <ul className="km mt-4 flex flex-col gap-1 text-sm text-label-2">
            {data.content.highlights.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <h2 className="km mt-8 text-sm font-semibold tracking-wide text-label-2">ការទទួលភ្ញៀវ</h2>
          <div className="mt-2"><Hours data={data} /></div>
        </section>
      </div>
    </div>
  )
}

/** Jobs booked in and collected: repairs, tailoring. */
function WorkshopStorefront({ data }: { data: StorefrontData }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12">
      <h1 className="km text-3xl font-semibold">{data.content.headline}</h1>
      <p className="km mt-3 text-lg text-label-2">{data.content.subhead}</p>

      <ol className="km mt-8 flex flex-col gap-3 border-y border-separator py-6">
        {data.content.highlights.map((line, index) => (
          <li key={line} className="flex gap-3 text-[0.9375rem]">
            <span className="tnum shrink-0 text-label-3">{index + 1}</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>

      <h2 className="km mt-8 text-sm font-semibold tracking-wide text-label-2">ការងារ និងតម្លៃ</h2>
      <Items data={data} className="mt-2" />
      <p className="km mt-8 text-[0.9375rem] leading-relaxed">{data.content.about}</p>
      <Action data={data} className="km mt-6 inline-flex min-h-11 items-center rounded-[var(--sf-radius)] bg-green px-6 text-[0.9375rem] font-medium text-on-green" />
      <div className="mt-10"><Hours data={data} /></div>
    </div>
  )
}

/** Walk in and order: food, drinks, retail. */
function CounterStorefront({ data }: { data: StorefrontData }) {
  return (
    <div className="mx-auto w-full max-w-xl px-5 py-10">
      <h1 className="km text-2xl font-semibold">{data.content.headline}</h1>
      <p className="km mt-2 text-[0.9375rem] text-label-2">{data.content.subhead}</p>

      <h2 className="km mt-8 text-sm font-semibold tracking-wide text-label-2">មុខម្ហូប និងតម្លៃ</h2>
      <Items data={data} className="mt-2" />

      <div className="mt-8 border-t border-separator pt-6">
        <Hours data={data} />
        <p className="km mt-4 text-[0.9375rem] leading-relaxed">{data.content.about}</p>
        <Action data={data} className="km mt-6 inline-flex min-h-11 items-center rounded-[var(--sf-radius)] bg-green px-6 text-[0.9375rem] font-medium text-on-green" />
      </div>
    </div>
  )
}

export const THEME_REGISTRY = {
  salon: { id: 'salon', name: 'Salon', Storefront: SalonStorefront },
  stay: { id: 'stay', name: 'Stay', Storefront: StayStorefront },
  workshop: { id: 'workshop', name: 'Workshop', Storefront: WorkshopStorefront },
  counter: { id: 'counter', name: 'Counter', Storefront: CounterStorefront },
} satisfies Record<ThemeId, ThemeModule>

/**
 * A stored theme id is text in the database (taxonomies that grow are text, per
 * CLAUDE.md rule 5), so it can be a value this build does not know. Falling back
 * beats a crash: a shop whose site renders in the wrong theme is embarrassing,
 * a shop whose site is a 500 is closed.
 */
export function themeFor(id: string): ThemeModule {
  return THEME_REGISTRY[id as ThemeId] ?? THEME_REGISTRY.salon
}
