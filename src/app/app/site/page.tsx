import { SiteEditor } from '@/components/app/site-editor.tsx'
import { SeedPicker } from '@/components/app/seed-picker.tsx'
import { vibeOf, type StorefrontContent } from '@/lib/types.ts'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'គេហទំព័រហាង' }

export default async function SitePage() {
  const [{ requireMember }, { getStorefrontRow }] = await Promise.all([
    import('@/lib/auth/member.ts'),
    import('@/lib/queries/storefront.ts'),
  ])
  const member = await requireMember()
  const row = await getStorefrontRow(member.businessId)

  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        <h1 className="km text-xl font-semibold text-ink">គេហទំព័រហាងរបស់អ្នក</h1>
        <p className="km mt-1 text-sm text-rule">
          Moni សរសេរសេចក្តីព្រាងពីអ្វីដែលអ្នកបានប្រាប់រួច។ អ្នកកែ រួចចុចផ្សាយ។ គ្មានអ្វីចេញទៅសាធារណៈមុនអ្នកសម្រេច។
        </p>
        <p className="km mt-1 text-xs text-rule">
          អាសយដ្ឋាន៖ {member.slug}.moni.cam
        </p>

        {row?.draft || row?.published ? (
          <div className="mt-6">
            <SeedPicker
              seed={row.seed}
              vibe={vibeOf(row.draft ?? row.published)}
              theme={((row.draft ?? row.published) as StorefrontContent).theme}
              headline={((row.draft ?? row.published) as StorefrontContent).headline}
            />
          </div>
        ) : null}

        <div className="mt-6">
          <SiteEditor
            slug={member.slug}
            initialDraft={(row?.draft as StorefrontContent | null) ?? null}
            hasPublished={Boolean(row?.published)}
            publishedAt={row?.published_at ?? null}
          />
        </div>
      </div>
    </>
  )
}
