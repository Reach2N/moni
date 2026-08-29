import Link from 'next/link'
import { ClerkProvider } from '@clerk/nextjs'

/**
 * Clerk is mounted here and in the product layout, never at the root.
 *
 * The public marketing site shows only the waitlist (PLAN.md Phase 1), so it
 * carries no auth script, no session round trip, and no dependency on keys a
 * clean checkout does not have. Scoping the provider to these two subtrees is
 * what keeps that true.
 */
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      /**
       * Clerk's widget is a vendor component, so it gets restyled into the token
       * system rather than shipped in its own look, per the sourcing rule in
       * CLAUDE.md. These are the light values of the Apple palette in PLAN.md
       * section 3; a dark variant needs @clerk/themes and is not worth a
       * dependency until the auth screens have a dark design of their own.
       */
      appearance={{
        variables: {
          colorPrimary: '#34C759',
          colorPrimaryForeground: '#0B2E16',
          colorForeground: '#1D1D1F',
          colorMutedForeground: 'rgba(60, 60, 67, 0.60)',
          colorBackground: '#FFFFFF',
          colorInput: '#F5F5F7',
          colorBorder: 'rgba(60, 60, 67, 0.29)',
          borderRadius: '12px',
          fontFamily: 'var(--font-sans)',
        },
        elements: {
          cardBox: 'shadow-none border border-separator rounded-[14px]',
          footerAction: 'text-[0.8125rem]',
        },
      }}
    >
      <div className="flex min-h-dvh flex-col bg-surface text-label">
        <header className="px-5 pt-6">
          <Link href="/" className="text-[0.9375rem] font-semibold tracking-tight">
            Moni
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-5 py-10">{children}</main>
      </div>
    </ClerkProvider>
  )
}
