import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SiteEditor } from '@/components/app/site-editor.tsx'
import type { StorefrontContent } from '@/lib/types.ts'

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
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/app" className="km inline-flex min-h-11 items-center gap-2 text-sm text-rule">
        <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង
      </Link>
      <h1 className="km mt-2 text-xl font-semibold text-ink">គេហទំព័រហាងរបស់អ្នក</h1>
      <p className="km mt-1 text-sm text-rule">
        Moni សរសេរសេចក្តីព្រាងពីអ្វីដែលអ្នកបានប្រាប់រួច។ អ្នកកែ រួចចុចផ្សាយ។ គ្មានអ្វីចេញទៅសាធារណៈមុនអ្នកសម្រេច។
      </p>
      <p className="km mt-1 text-xs text-rule">
        អាសយដ្ឋាន៖ {member.slug}.moni.cam
      </p>

      <div className="mt-6">
        <SiteEditor
          slug={member.slug}
          initialDraft={(row?.draft as StorefrontContent | null) ?? null}
          hasPublished={Boolean(row?.published)}
          publishedAt={row?.published_at ?? null}
        />
      </div>
    </main>
  )
}
