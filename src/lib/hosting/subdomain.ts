import { RESERVED_SLUGS } from '../auth/gate.ts'

/**
 * Which shop a request is for, read from the Host header.
 *
 * Lives here rather than in `proxy.ts` for the same reason `gate.ts` and
 * `instructions.ts` do: `db/test.mjs` can import a module with relative imports
 * and no framework, and this rule is one where a mistake takes the whole
 * deployment down rather than one page.
 */

/**
 * Every host that is US rather than a shop. `localhost` and the Vercel preview
 * domains are here because a preview URL's first label looks exactly like a
 * slug, and rewriting `moni-git-main-reach2n.vercel.app` to a shop called
 * `moni-git-main-reach2n` would take the whole deployment down.
 */
export const APEX_HOSTS = new Set(['moni.cam', 'www.moni.cam', 'localhost'])

export function shopSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null
  const hostname = host.split(':')[0]!.trim().toLowerCase()
  if (!hostname || APEX_HOSTS.has(hostname)) return null
  if (hostname.endsWith('.vercel.app')) return null

  const suffix = hostname.endsWith('.moni.cam')
    ? '.moni.cam'
    // Local development: `sokha-beauty.localhost:3000` resolves on most systems,
    // so the whole subdomain path is exercisable with no DNS and no deploy.
    : hostname.endsWith('.localhost')
      ? '.localhost'
      : null
  if (!suffix) return null

  const label = hostname.slice(0, -suffix.length)
  if (!label || label.includes('.')) return null
  // Shared with sign-up, so a name the platform needs can never have been handed
  // to a shop in the first place.
  if ((RESERVED_SLUGS as readonly string[]).includes(label)) return null
  return label
}
