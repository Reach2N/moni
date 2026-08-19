import { NextResponse } from 'next/server'
import { parseShop } from '@/lib/ai/parse.ts'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: Request) {
  let text: unknown
  try {
    ({ text } = await req.json())
  } catch {
    return NextResponse.json({ error: 'expected JSON body { text }' }, { status: 400 })
  }
  if (typeof text !== 'string') {
    return NextResponse.json({ error: 'text must be a string' }, { status: 400 })
  }

  try {
    const parsed = await parseShop(text)
    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'parse failed'
    // 4xx for the caller's problem, 5xx for ours, so the client knows whether
    // retrying is worth anything.
    const clientFault = /too short|too long|must be a string/.test(message)
    console.error('[parse]', message)
    return NextResponse.json({ error: message }, { status: clientFault ? 400 : 502 })
  }
}
