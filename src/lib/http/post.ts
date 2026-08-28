import { z } from 'zod'

export class ApiRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

function forwardedOrigin(req: Request): string | null {
  const host = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  if (!host) return null
  const protocol = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
  return `${protocol}://${host}`
}

/**
 * Browser mutation requests must originate from this deployment. This is the
 * no-auth demo's CSRF boundary, not a substitute for real owner authentication.
 */
export function assertSameOriginBrowserPost(req: Request) {
  const origin = req.headers.get('origin')
  if (!origin) throw new ApiRequestError(403, 'browser origin required')

  let normalized: string
  try {
    normalized = new URL(origin).origin
  } catch {
    throw new ApiRequestError(403, 'invalid browser origin')
  }

  const allowed = new Set([new URL(req.url).origin])
  const forwarded = forwardedOrigin(req)
  if (forwarded) allowed.add(forwarded)
  if (!allowed.has(normalized)) throw new ApiRequestError(403, 'cross-origin request blocked')

  const fetchSite = req.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin') {
    throw new ApiRequestError(403, 'cross-site request blocked')
  }
}

export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown> {
  if (!req.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new ApiRequestError(415, 'content-type must be application/json')
  }

  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ApiRequestError(413, 'request body is too large')
  }

  const body = await req.text()
  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new ApiRequestError(413, 'request body is too large')
  }

  try {
    return JSON.parse(body)
  } catch {
    throw new ApiRequestError(400, 'expected a JSON request body')
  }
}

export function validationPayload(error: z.ZodError) {
  return {
    error: 'invalid request',
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  }
}
