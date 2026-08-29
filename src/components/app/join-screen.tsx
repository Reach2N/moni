import Link from 'next/link'
import { ArrowRight, Clock, Mail } from 'lucide-react'
import { SignOutButton } from '@clerk/nextjs'

/**
 * The polite refusal. A signed-in account that is not on the founding shops list
 * lands here instead of the product (PLAN.md Phase 2).
 *
 * It is deliberately not an error page. Everyone who reaches it is someone who
 * wanted the product enough to make an account, which makes them the most
 * valuable visitor the site gets, so the only action offered is joining the list.
 */
export function JoinScreen({ email }: { email: string | null }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-5 py-12 text-label">
      <div className="w-full max-w-[30rem]">
        <span className="inline-flex items-center gap-2 rounded-full border border-separator px-3 py-1 text-[0.75rem] text-label-2">
          <Clock className="size-3.5" strokeWidth={1.75} aria-hidden />
          <span className="km">កំពុងរង់ចាំ</span>
        </span>

        <h1 className="km mt-5 text-2xl font-semibold tracking-tight">
          គណនីនេះមិនទាន់នៅក្នុងបញ្ជីហាងដំបូងទេ
        </h1>
        <p className="mt-2 text-lg text-label-2">
          This account is not on the founding shops list yet.
        </p>

        <p className="km mt-6 text-[0.9375rem] text-label-2">
          យើងកំពុងទទួលហាងដំបូងចំនួន ១០០ ម្តងមួយៗ ដោយដៃ។ ដាក់ពាក្យនៅទំព័រដើម
          រួចយើងនឹងទាក់ទងអ្នកនៅពេលដល់វេនហាងរបស់អ្នក។
        </p>
        <p className="mt-3 text-[0.9375rem] text-label-2">
          We are onboarding the first 100 shops by hand. Apply on the home page and we will
          write to you when it is your turn.
        </p>

        {email ? (
          <p className="mt-6 flex items-center gap-2 text-[0.8125rem] text-label-3">
            <Mail className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="break-all">Signed in as {email}</span>
          </p>
        ) : (
          <p className="km mt-6 text-[0.8125rem] text-label-3">
            គណនីនេះមិនទាន់មានអាសយដ្ឋានអ៊ីមែលដែលបានផ្ទៀងផ្ទាត់ទេ។
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-green px-5 py-2.5 text-[0.9375rem] font-medium text-on-green"
          >
            <span className="km">ដាក់ពាក្យចូលរួម</span>
            <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
          </Link>
          <SignOutButton redirectUrl="/">
            <button
              type="button"
              className="rounded-full border border-separator px-5 py-2.5 text-[0.9375rem] text-label-2"
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  )
}
