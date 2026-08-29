import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
// The host rule lives in its own module so db/test.mjs can prove it. A mistake
// there takes the whole deployment down, not one page.
import { shopSlugFromHost } from '@/lib/hosting/subdomain.ts'

export { shopSlugFromHost }

/**
 * Next 16 renamed Middleware to Proxy. Same contents, new filename, which is the
 * one Clerk instruction that is easy to miss (CLAUDE.md records it).
 *
 * This file does two unrelated jobs and the ORDER is the design.
 *
 * 1. A shop's own subdomain is rewritten to its page. That is public, and a
 *    customer reading a menu must never be asked to sign in.
 * 2. Everything else may need Clerk, and Clerk is invoked ONLY on the paths that
 *    need it. The public marketing site therefore loads no Clerk script, does no
 *    session lookup, and still serves on a checkout with no Clerk keys, which is
 *    a property this project has protected since Phase 2 and would otherwise
 *    have lost the moment `/` joined the matcher for the rewrite.
 */

const isProtectedPage = createRouteMatcher(['/app', '/app/(.*)'])

/**
 * The paths Clerk is allowed to touch. Kept in step with `config.matcher` below,
 * which is the coarse filter; this is the fine one, and the difference between
 * them is exactly the apex `/`.
 */
const needsClerk = createRouteMatcher([
  '/app',
  '/app/(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  // Clerk's own auto-proxy endpoints. Without this the hosted sign-in and
  // sign-up flows 404 on their callbacks, which presents as a form that
  // submits and does nothing.
  '/__clerk(.*)',
  '/api/ask',
  '/api/setup',
  '/api/transcribe',
  '/api/chat',
  '/api/channels(.*)',
  '/api/conversations(.*)',
  '/api/storefront(.*)',
  '/api/orders(.*)',
  '/api/stream(.*)',
])

const withClerk = clerkMiddleware(
  async (auth, request) => {
    // Sign-in is enforced here; membership is enforced by `requireMember()`,
    // which needs the database and therefore cannot run in the proxy. Being
    // signed in is worth nothing on its own: the gate is the second door.
    if (isProtectedPage(request)) await auth.protect()
  },
  { signInUrl: '/sign-in', signUpUrl: '/sign-up' },
)

export default function proxy(request: NextRequest, event: Parameters<typeof withClerk>[1]) {
  const slug = shopSlugFromHost(request.headers.get('host'))
  if (slug) {
    const url = request.nextUrl.clone()
    if (!url.pathname.startsWith('/s/')) {
      url.pathname = `/s/${slug}${url.pathname === '/' ? '' : url.pathname}`
    }
    return NextResponse.rewrite(url)
  }
  if (!needsClerk(request)) return NextResponse.next()
  return withClerk(request, event)
}

export const config = {
  matcher: [
    // The apex path, so a shop subdomain's "/" reaches the rewrite above. It is
    // the only way a host-based rewrite can work at all, and it costs the
    // marketing page one proxy invocation that returns next() immediately.
    '/',
    '/app',
    '/app/:path*',
    '/sign-in/:path*',
    '/sign-up/:path*',
    '/__clerk/:path*',
    // Owner-facing endpoints. `auth()` inside a route handler returns nothing
    // unless the proxy has run for that path, so an endpoint left off this list
    // fails open into "signed out" rather than closed.
    '/api/ask',
    '/api/setup',
    '/api/transcribe',
    '/api/channels/:path*',
    '/api/conversations/:path*',
    '/api/storefront/:path*',
    '/api/orders/:path*',
    '/api/stream/:path*',
    // /api/chat is the customer endpoint and stays usable signed out, but it
    // has to run through the proxy so that an OWNER previewing their assistant
    // is recognised. Nothing on the public marketing site calls it.
    '/api/chat',
    // /api/webhooks/* is deliberately absent. Telegram and Meta carry no Clerk
    // session, and running the proxy there would 500 every inbound customer
    // message. Those routes prove their caller with a per-connection secret.
  ],
}
