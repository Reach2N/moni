import { SignUp } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'បង្កើតគណនី Moni' }

/**
 * An account is not access. Signing up is open; the waitlist gate in
 * `requireMember()` decides whether the account reaches the product, so a
 * curious visitor lands on the join screen rather than a dead end.
 *
 * The framing sits ABOVE the form, not under it. Someone deciding whether to
 * hand over an email address has already decided by the time they reach a
 * footnote, and "we onboard the first 100 shops by hand" is the reason they
 * would say yes.
 */
export default function SignUpPage() {
  return (
    <>
      <header className="mt-6 text-center">
        <h1 className="km text-[1.375rem] font-semibold tracking-tight">បង្កើតគណនីម្ចាស់ហាង</h1>
        <p className="km mx-auto mt-2 max-w-[20rem] text-[0.9375rem] text-[#3C3C4399]">
          យើងទទួលហាងដំបូង ១០០ ម្តងមួយៗ ដោយដៃ។
        </p>
      </header>

      <div className="mt-6">
        <SignUp fallbackRedirectUrl="/app" signInUrl="/sign-in" />
      </div>

      <p
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif' }}
        className="mt-5 text-center text-[0.8125rem] leading-relaxed text-[#3C3C4399]"
      >
        We onboard the first 100 shops by hand. Customers never sign in: they reach your shop
        through Telegram or Messenger.
      </p>
    </>
  )
}
