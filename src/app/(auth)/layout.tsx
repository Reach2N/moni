import Link from 'next/link'
import { ClerkProvider } from '@clerk/nextjs'

/**
 * PLAN.md section 3 puts the system stack first for this world. It is applied to
 * the LATIN text only, never to a `.km` element: `--font-sans` leads with the
 * Khmer brand face, whose Latin is a serif and reads as a different product
 * beside Clerk's native looking sheet, but that same face is what draws Khmer
 * correctly and must keep doing so.
 */
const LATIN = { fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif' } as const

/**
 * Clerk is mounted here and in the product layout, never at the root.
 *
 * The public marketing site shows only the waitlist (PLAN.md Phase 1), so it
 * carries no auth script, no session round trip, and no dependency on keys a
 * clean checkout does not have. Scoping the provider to these two subtrees is
 * what keeps that true.
 *
 * These screens are deliberately LIGHT ONLY. Clerk's widget is a vendor
 * component whose palette we set explicitly, and a dark page ground under a
 * light card is the one combination that reads as broken rather than themed.
 * Giving Clerk a dark variant means the @clerk/themes dependency, which is not
 * worth it until the auth screens have a dark design of their own.
 */
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      /**
       * Restyled into the token system rather than shipped in its own look, per
       * the sourcing rule in CLAUDE.md. These are the light values of the Apple
       * palette in PLAN.md section 3.
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
          // The system stack, not --font-sans. Clerk's chrome is entirely Latin,
          // and PLAN.md section 3 puts the system stack first for this world;
          // --font-sans leads with the Khmer brand face, whose Latin is a serif
          // and reads as a different product inside a native looking sheet.
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
        },
        elements: {
          // Clerk's card IS the card. Wrapping it in our own bordered box drew
          // two nested rectangles, visibly offset, with the footer spilling out
          // of the bottom of the outer one. So the outer box is gone and this
          // carries our border, radius and elevation instead.
          // overflow-hidden so the footer's own tint stops at the radius
          // instead of squaring off the bottom corners.
          cardBox: 'w-full overflow-hidden rounded-[18px] border border-[#3C3C4349] shadow-[0_1px_2px_rgba(0,0,0,.04),0_12px_32px_-16px_rgba(0,0,0,.16)]',
          // Our own headings sit above the card, so Clerk's duplicate pair is
          // hidden rather than restyled.
          headerTitle: 'hidden',
          headerSubtitle: 'hidden',
          footerAction: 'text-[0.8125rem]',
          // 44px, the Apple minimum touch target, on everything tappable.
          socialButtonsBlockButton: 'min-h-11',
          formButtonPrimary: 'min-h-11 text-[0.9375rem] font-medium normal-case tracking-normal',
          formFieldInput: 'min-h-11',
        },
      }}
    >
      <div className="flex min-h-dvh flex-col bg-[#F5F5F7] text-[#1D1D1F] [color-scheme:light]">
        <main className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-[25rem]">
            <Link
              href="/"
              style={LATIN}
              className="mx-auto block w-fit text-[1.0625rem] font-semibold tracking-tight text-[#1D1D1F] no-underline"
            >
              Moni
            </Link>
            {children}
          </div>
        </main>
      </div>
    </ClerkProvider>
  )
}
