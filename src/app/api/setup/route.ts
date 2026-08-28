import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { persistDemoSetup } from '@/lib/setup/persist.ts'
import { SetupRequestSchema } from '@/lib/setup/schema.ts'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const input = SetupRequestSchema.parse(await readJsonBody(req, 48_000))
    return NextResponse.json(await persistDemoSetup(input))
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(validationPayload(error), { status: 400 })
    }
    console.error('[setup]', error instanceof Error ? error.message : 'setup failed')
    return NextResponse.json({ error: 'setup could not be saved' }, { status: 500 })
  }
}
