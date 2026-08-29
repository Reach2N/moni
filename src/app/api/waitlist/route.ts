import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  ApiRequestError,
  assertSameOriginBrowserPost,
  readJsonBody,
  validationPayload,
} from '@/lib/http/post.ts'
import { LOCALES } from '@/lib/marketing/copy.ts'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 2_048
const RATE_WINDOW_MS = 10 * 60 * 1_000
const RATE_LIMIT = 8

type RateEntry = { count: number; startedAt: number }
const attempts = new Map<string, RateEntry>()

const Body = z.object({
  // Deliberately looser than a full RFC 5322 matcher. A regex that rejects a
  // real Cambodian shop owner's address is a lost applicant.
  email: z.string().trim().toLowerCase().min(5).max(254).email(),
  locale: z.enum(LOCALES).default('km'),
  // The public route owns its source label. Keeping this optional preserves a
  // forwards-compatible JSON shape without allowing analytics poisoning.
  source: z.string().trim().max(64).optional(),
  note: z.string().trim().max(500).optional(),
  // A hidden field catches the simplest automated submissions without making a
  // Cambodian shop owner solve a CAPTCHA on a low-cost phone.
  website: z.string().trim().max(200).optional(),
})

function requestKey(req: Request, email: string): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const real = req.headers.get('x-real-ip')?.trim()
  return `${forwarded || real || 'unknown'}:${email}`
}

function enforceRateLimit(req: Request, email: string) {
  const key = requestKey(req, email)
  const now = Date.now()
  const previous = attempts.get(key)
  if (!previous || now - previous.startedAt >= RATE_WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: now })
  } else if (previous.count >= RATE_LIMIT) {
    throw new ApiRequestError(429, 'too many applications')
  } else {
    previous.count += 1
  }

  // Keep a single warm serverless instance from accumulating unbounded keys.
  if (attempts.size > 1_000) {
    for (const [entryKey, entry] of attempts) {
      if (now - entry.startedAt >= RATE_WINDOW_MS) attempts.delete(entryKey)
    }
  }
}

async function sendConfirmation(email: string, locale: 'km' | 'en'): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.info('[waitlist] stored, confirmation email skipped: RESEND_API_KEY not set')
    return false
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || 'Moni <hello@moni.cam>'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://app.moni.cam'
  const khmerFirst = locale === 'km'
  const subject = khmerFirst ? 'Moni៖ ពាក្យរបស់អ្នកបានទទួល' : 'Moni: your founding shop application'
  const heading = khmerFirst ? 'អរគុណដែលចូលរួមជាមួយ Moni' : 'Thank you for applying to Moni'
  const lead = khmerFirst
    ? 'យើងបានទទួលព័ត៌មានរបស់អ្នក ហើយនឹងទាក់ទងដើម្បីរៀបចំហាងជាមួយអ្នក។'
    : 'We received your application and will reply to arrange your shop setup.'
  const next = khmerFirst
    ? ['យើងអានព័ត៌មានហាងរបស់អ្នក', 'យើងទាក់ទងដើម្បីកំណត់ពេលរៀបចំ', 'យើងផ្ញើតំណចូលកម្មវិធីពេលដល់វេន']
    : ['We read about your shop', 'We reply to arrange setup', 'We send your owner-app link when your turn is ready']

  const html = `<!doctype html><html lang="${khmerFirst ? 'km' : 'en'}"><body style="margin:0;background:#f5f5f7;color:#1d1d1f;font-family:Arial,sans-serif;line-height:1.6"><main style="max-width:560px;margin:0 auto;padding:40px 24px"><div style="background:#fff;border:1px solid #d1d1d6;border-radius:16px;padding:32px"><p style="margin:0 0 18px;color:#087443;font-weight:700">Moni</p><h1 style="margin:0 0 12px;font-size:26px;line-height:1.25">${heading}</h1><p style="margin:0;color:#5a5a62">${lead}</p><ol style="padding-left:22px;color:#5a5a62">${next.map((item) => `<li style="margin:8px 0">${item}</li>`).join('')}</ol><p style="margin:24px 0 0"><a href="${appUrl}" style="display:inline-block;background:#34c759;color:#111113;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700">${khmerFirst ? 'កម្មវិធីម្ចាស់ហាង' : 'Open the owner app'}</a></p></div></main></body></html>`
  const text = `${heading}\n\n${lead}\n\n${next.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n${appUrl}`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject, html, text }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) {
      console.error('[waitlist] confirmation email rejected', response.status)
      return false
    }
    return true
  } catch (error) {
    console.error('[waitlist] confirmation email failed', error instanceof Error ? error.message : 'unknown error')
    return false
  }
}

export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const raw = await readJsonBody(req, MAX_BODY_BYTES)
    const parsed = Body.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(validationPayload(parsed.error), { status: 400 })
    }

    const { email, locale, note, website } = parsed.data
    enforceRateLimit(req, email)

    // Honeypot hits receive a harmless success response, but never reach the DB.
    if (website) return NextResponse.json({ ok: true }, { status: 201 })

    // Imported here, not at module scope. `db` builds its client on import and
    // throws when Supabase env is absent, which should be a request failure, not
    // a failed static build of the public page.
    const { db } = await import('@/lib/db.ts')

    const { data: existing, error: lookupError } = await db
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (lookupError) throw new Error(`waitlist lookup failed: ${lookupError.message}`)

    if (!existing) {
      const { error: insertError } = await db
        .from('waitlist')
        .insert({ email, locale, source: 'landing', note: note || null })
      // Two taps from two tabs can race the unique lower(email) index. That is
      // still one application, not a server error.
      if (insertError && insertError.code !== '23505') {
        throw new Error(`waitlist insert failed: ${insertError.message}`)
      }
    }

    // Send on every accepted request, including a retry for an existing row.
    // This makes a transient Resend outage recoverable without an outbox table.
    const confirmationSent = await sendConfirmation(email, locale)
    return NextResponse.json({ ok: true, confirmationSent }, { status: 201 })
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'waitlist failed'
    console.error('[waitlist]', message)
    return NextResponse.json({ error: 'could not save that right now' }, { status: 502 })
  }
}
