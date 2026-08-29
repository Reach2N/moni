import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { InboxView } from '@/components/app/inbox-view.tsx'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'សារអតិថិជន' }

export default async function InboxPage() {
  const [{ requireMember }, { getInbox, getTranscript }] = await Promise.all([
    import('@/lib/auth/member.ts'),
    import('@/lib/queries/inbox.ts'),
  ])
  const member = await requireMember()
  const rows = await getInbox(member.businessId)
  // Render the first thread on the server so the inbox opens on a conversation
  // rather than a spinner. Escalations sort first, so this is the one that needs
  // the owner most.
  const first = rows[0] ? await getTranscript(member.businessId, rows[0].id) : null

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/app" className="km inline-flex min-h-11 items-center gap-2 text-sm text-rule">
        <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង
      </Link>
      <h1 className="km mt-2 text-xl font-semibold text-ink">សារអតិថិជន</h1>
      <p className="km mt-1 text-sm text-rule">
        គ្រប់បណ្តាញនៅកន្លែងតែមួយ។ អ្នកអានអ្វីដែល Moni បានសន្យាជំនួសអ្នក ហើយឆ្លើយដោយខ្លួនឯងបានគ្រប់ពេល។
      </p>
      <div className="mt-6">
        <InboxView rows={rows} initialTranscript={first} />
      </div>
    </main>
  )
}
