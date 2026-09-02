import { ClerkProvider } from '@clerk/nextjs'
import { AppShell } from '@/components/app/app-shell.tsx'
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
 *
 * The shell lives HERE and not in each page, which is the whole point of a
 * layout: Next does not re-render it on a navigation between two pages that
 * share it. Built per page, the rail and the header were torn down and rebuilt
 * on every link, so switching screens flashed a skeleton with no navigation in
 * it and the app looked like it was reloading from scratch each time.
 */
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const gate = await memberGate()
  // Loaded only for a real member, and only the two things the chrome shows.
  // The dynamic imports keep database configuration out of the build-time module
  // graph, so a clean clone still builds the public site.
  const chrome =
    gate.status === 'member'
      ? await (async () => {
          const [{ getBusinessById }, { loadShellCounts }] = await Promise.all([
            import('@/lib/queries/business.ts'),
            import('@/lib/queries/shell.ts'),
          ])
          const [business, counts] = await Promise.all([
            getBusinessById(gate.member.businessId),
            loadShellCounts(gate.member.businessId),
          ])
          return { business, counts }
        })()
      : null

  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      {gate.status === 'member' && chrome ? (
        <div className="moni-invitation min-h-dvh bg-paper text-ink [color-scheme:light]">
          <AppShell
            shop={{ name: chrome.business.name, place: chrome.business.province ?? chrome.business.address }}
            inboxCount={chrome.counts.inboxCount}
          >
            {children}
          </AppShell>
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
