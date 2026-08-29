/**
 * The waitlist gate, as pure rules.
 *
 * PLAN.md Phase 2: after Clerk sign-in the email must be in `waitlist`, or have
 * been approved by us by hand. Nothing here touches Clerk or the database, so
 * `db/test.mjs` can prove the rules against a real Postgres with no server and
 * no network, which is the acceptance check this phase is measured by.
 *
 * Deleting the gate at launch is deleting `requireMember`'s call site. These
 * rules stay, because slug reservation and email normalisation outlive it.
 */

/** A waitlist row, narrowed to the two columns the gate actually reads. */
export type WaitlistEntry = {
  approved_at: string | null
  converted_business_id: string | null
}

/**
 * Lower case and trim, matching the `waitlist_email_uniq` index on `lower(email)`
 * and the landing page's zod `.toLowerCase()`. One normalisation, or the gate
 * and the unique index disagree about who is already on the list.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/**
 * On the list is enough. `approved_at` is recorded for us, not required of them,
 * because the founding shops are onboarded by hand and being made to wait twice
 * is how an applicant is lost. Tightening this to approvals only is one line.
 */
export function passesGate(entry: WaitlistEntry | null | undefined): boolean {
  return entry != null
}

/** True once we have approved the row by hand, which is a stronger claim than passing. */
export function isApproved(entry: WaitlistEntry | null | undefined): boolean {
  return entry?.approved_at != null
}

/**
 * PostgREST `ilike` treats % and _ as wildcards, so an address containing either
 * would match rows that are not it. Emails may legally contain both.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`)
}

/**
 * Slugs become subdomains in Phase 7 (`{slug}.moni.cam`), so the names the
 * platform needs for itself can never be handed to a shop. Reserved now, while
 * it costs nothing, rather than after a member owns one.
 */
export const RESERVED_SLUGS = [
  'admin', 'api', 'app', 'assets', 'auth', 'blog', 'cdn', 'dashboard', 'demo',
  'dev', 'docs', 'files', 'help', 'mail', 'moni', 'new', 'owner', 'pay',
  'shop', 'sign-in', 'sign-up', 'static', 'status', 'support', 'www',
] as const

const SLUG_MAX = 40

/**
 * A first slug for a member's shop, derived from the email local part. It is a
 * placeholder: onboarding (Phase 3) lets the owner name the shop, and this only
 * has to be legal, stable and free of collisions until then.
 */
export function slugFromEmail(email: string): string {
  const local = normalizeEmail(email).split('@')[0] ?? ''
  const cleaned = local
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '')
  if (cleaned.length < 3) return 'shop'
  if ((RESERVED_SLUGS as readonly string[]).includes(cleaned)) return `${cleaned}-shop`
  return cleaned
}

/**
 * Collision escape hatch. `businesses.slug` is unique, so an insert can lose the
 * race; the caller retries with the next candidate rather than failing a member's
 * first sign-in on a name they never chose and will never see.
 */
export function slugAttempt(base: string, attempt: number): string {
  if (attempt === 0) return base
  const suffix = `-${attempt + 1}`
  return `${base.slice(0, SLUG_MAX - suffix.length)}${suffix}`
}
