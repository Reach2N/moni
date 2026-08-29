import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * Next 16 renamed Middleware to Proxy. Same contents, new filename, which is the
 * one Clerk instruction that is easy to miss (CLAUDE.md records it).
 *
 * The matcher below is deliberately narrow. The public marketing site at the
 * apex domain shows only the waitlist (PLAN.md Phase 1) and must not depend on
 * Clerk at all: no Clerk script, no session lookup, and no failure when the
 * Clerk keys are absent from a clean checkout. So Clerk runs on the product
 * surface and the auth screens, and nowhere else.
 */
const isProtectedPage = createRouteMatcher(['/app', '/app/(.*)'])

export default clerkMiddleware(
  async (auth, request) => {
    // Sign-in is enforced here; membership is enforced by `requireMember()`,
    // which needs the database and therefore cannot run in the proxy. Being
    // signed in is worth nothing on its own: the gate is the second door.
    if (isProtectedPage(request)) await auth.protect()
  },
  { signInUrl: '/sign-in', signUpUrl: '/sign-up' },
)

export const config = {
  matcher: [
    '/app',
    '/app/:path*',
    '/sign-in/:path*',
    '/sign-up/:path*',
    // Owner-facing endpoints. `auth()` inside a route handler returns nothing
    // unless the proxy has run for that path, so an endpoint left off this list
    // fails open into "signed out" rather than closed.
    '/api/ask',
    '/api/setup',
    '/api/transcribe',
    // /api/chat is the customer endpoint and stays usable signed out, but it
    // has to run through the proxy so that an OWNER previewing their assistant
    // is recognised. Nothing on the public marketing site calls it.
    '/api/chat',
  ],
}
