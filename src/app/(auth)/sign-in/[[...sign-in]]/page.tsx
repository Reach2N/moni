import { SignIn } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'ចូលគណនី Moni' }

/**
 * Owners sign in. Customers never do: they reach the shop through Telegram or
 * Messenger and are identified by `customer_identities`, not by an account.
 */
export default function SignInPage() {
  return (
    <div className="w-full max-w-[25rem]">
      <SignIn fallbackRedirectUrl="/app" signUpUrl="/sign-up" />
      <p className="km mt-6 text-center text-[0.8125rem] text-label-2">
        សម្រាប់ម្ចាស់ហាងដែលបានដាក់ពាក្យប៉ុណ្ណោះ។ អតិថិជនមិនចាំបាច់មានគណនីទេ។
      </p>
      <p className="mt-1 text-center text-[0.8125rem] text-label-3">
        For shop owners on the founding list. Customers never sign in.
      </p>
    </div>
  )
}
