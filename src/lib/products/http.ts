import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiRequestError, validationPayload } from '../http/post.ts'
import { ProductError } from './write.ts'

/**
 * One failure shape for every product route.
 *
 * It lives here rather than in a route file because a Next route module may
 * only export its handlers and a short list of config values: exporting a
 * helper from one and importing it in a sibling fails the build's own type
 * check, which is how this ended up in its own module.
 */
export function productFailure(error: unknown) {
  if (error instanceof ProductError || error instanceof ApiRequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(validationPayload(error), { status: 400 })
  }
  console.error('[products]', error instanceof Error ? error.message : 'failed')
  return NextResponse.json({ error: 'that could not be saved' }, { status: 502 })
}
