import { ClerkProvider } from '@clerk/nextjs'
import { JoinScreen } from '@/components/app/join-screen.tsx'
import { memberGate } from '@/lib/auth/member.ts'

/**
 * The Invitation world, scoped.
 *
 * Its ground and ink used to sit on <body> in the root layout, which meant the
 * public marketing surface inherited a retired design system. They live here
 * now, so the two worlds cannot bleed into each other while both exist.
 *
 * PLAN.md Phase 5 rebuilds this dashboard in the Apple palette. When it does,
 * this file and the Invitation tokens in globals.css go in the same commit.
 *
 * This is also THE call site of the waitlist gate (PLAN.md Phase 2). Signing in
 * is enforced earlier, by `proxy.ts`; membership is enforced here, because it
 * needs the database. At launch the gate is deleted by removing the `refused`
 * branch below and nothing else.
 */
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const gate = await memberGate()

  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      {gate.status === 'member' ? (
        <div className="moni-invitation min-h-dvh bg-paper text-ink [color-scheme:light]">
          {children}
        </div>
      ) : (
        // `signed_out` cannot normally reach here (the proxy redirects first),
        // but rendering the join screen rather than the dashboard is the safe
        // failure: a stranger never sees a shop's bookings.
        <JoinScreen email={gate.status === 'refused' ? gate.email : null} />
      )}
    </ClerkProvider>
  )
}
