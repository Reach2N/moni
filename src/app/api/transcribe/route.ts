import { NextResponse } from 'next/server'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost } from '@/lib/http/post.ts'
import { MAX_VOICE_BYTES, VoiceNoteError, transcribeVoiceNote } from '@/lib/ai/voice.ts'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Voice note to text, for the onboarding composer.
 *
 * The body is the raw audio, not JSON and not multipart: base64 in JSON costs a
 * third more bytes on a phone connection in Takeo for nothing, and multipart
 * costs a parser. The browser sends the blob with its own content type, which is
 * also the media type the model needs.
 *
 * Authenticated before a byte is read, like every other owner endpoint: audio is
 * the most expensive request this product makes, so an open one is a bill.
 */
export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    await requireMemberApi()

    const declared = Number(req.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_VOICE_BYTES) {
      throw new ApiRequestError(413, 'the recording is too long')
    }

    const audio = new Uint8Array(await req.arrayBuffer())
    const transcript = await transcribeVoiceNote(audio, req.headers.get('content-type'))
    return NextResponse.json(transcript)
  } catch (error) {
    if (error instanceof VoiceNoteError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[transcribe]', error instanceof Error ? error.message : 'transcribe failed')
    return NextResponse.json({ error: 'that recording could not be transcribed' }, { status: 502 })
  }
}
