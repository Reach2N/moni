import { ProductList } from '@/components/app/product-list.tsx'
import { sellsFor } from '@/lib/types.ts'
import { toKhmerDigits } from '@/lib/format/khmer.ts'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'អ្វីដែលលក់' }

/**
 * The catalogue: services and products in one place, which is the point of
 * `v_catalog`. Scope E of the products design
 * (docs/superpowers/specs/2026-09-02-products-photos-menu-design.md).
 */
export default async function ProductsPage() {
  const [{ requireMember }, { listCatalogue }, { getBusinessById }, { publicMediaUrl }] = await Promise.all([
    import('@/lib/auth/member.ts'),
    import('@/lib/queries/catalogue.ts'),
    import('@/lib/queries/business.ts'),
    import('@/lib/media/storage.ts'),
  ])
  const member = await requireMember()
  const [items, business] = await Promise.all([
    listCatalogue(member.businessId, { includeInactive: true }),
    getBusinessById(member.businessId),
  ])
  // Services always carry photo_path null (db/schema.sql v_catalog), so only
  // products count here: matches the `products` table query pinned in db/test.mjs.
  const withoutPhoto = items.filter((item) => item.kind === 'product' && item.active && !item.photo_path).length

  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <h1 className="km text-xl font-semibold text-ink">អ្វីដែលហាងលក់</h1>
        <p className="km mt-1 text-sm text-rule">
          មុខទំនិញ និងសេវានៅកន្លែងតែមួយ។ អ្វីដែលនៅទីនេះគឺជាអ្វីដែល Moni ប្រាប់អតិថិជន និងបង្ហាញលើគេហទំព័រហាង។
        </p>
        {withoutPhoto > 0 ? (
          <p className="km mt-2 text-xs text-rule">
            មុខទំនិញ {toKhmerDigits(String(withoutPhoto))} មិនទាន់មានរូប។ បើគ្មានរូប គេហទំព័រនឹងគូរលំនាំជំនួស។
          </p>
        ) : null}
        <div className="mt-6">
          <ProductList
            items={items.map((item) => ({ ...item, photo_url: publicMediaUrl(item.photo_path) }))}
            leadWith={sellsFor(business.business_type)}
          />
        </div>
      </div>
    </>
  )
}
