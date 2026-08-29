import { SignUp } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'បង្កើតគណនី Moni' }

/**
 * An account is not access. Signing up is free and open; the waitlist gate in
 * `requireMember()` decides whether the account reaches the product, so a
 * curious visitor lands on the join screen rather than a dead end.
 */
export default function SignUpPage() {
  return (
    <div className="w-full max-w-[25rem]">
      <SignUp fallbackRedirectUrl="/app" signInUrl="/sign-in" />
      <p className="km mt-6 text-center text-[0.8125rem] text-label-2">
        យើងកំពុងទទួលហាងដំបូងចំនួន ១០០ ម្តងមួយៗ។ បង្កើតគណនីរួច យើងនឹងពិនិត្យពាក្យរបស់អ្នក។
      </p>
      <p className="mt-1 text-center text-[0.8125rem] text-label-3">
        We onboard the first 100 shops by hand. Create an account and we will check your application.
      </p>
    </div>
  )
}
