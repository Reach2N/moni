import { SignIn } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'ចូលគណនី Moni' }

/**
 * Owners sign in. Customers never do: they reach the shop through Telegram or
 * Messenger and are identified by `customer_identities`, not by an account.
 */
export default function SignInPage() {
  return (
    <>
      <header className="mt-6 text-center">
        <h1 className="km text-[1.375rem] font-semibold tracking-tight">ចូលទៅកាន់ហាងរបស់អ្នក</h1>
        <p className="km mx-auto mt-2 max-w-[22rem] text-[0.9375rem] text-[#3C3C4399]">
          សម្រាប់ម្ចាស់ហាងដែលបានដាក់ពាក្យប៉ុណ្ណោះ។
        </p>
      </header>

      <div className="mt-6">
        <SignIn fallbackRedirectUrl="/app" signUpUrl="/sign-up" />
      </div>

      <p
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif' }}
        className="mt-5 text-center text-[0.8125rem] leading-relaxed text-[#3C3C4399]"
      >
        For shop owners on the founding list. Customers never sign in.
      </p>
    </>
  )
}
