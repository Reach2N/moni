/**
 * A shop owner's voice note, turned into text.
 *
 * The owner describes the shop by speaking, which is the whole point of the
 * onboarding screen: most Cambodian shop owners type Khmer slowly and speak it
 * fluently. Audio goes up as an AI SDK `file` part (raw bytes plus a media
 * type), which the gateway passes through to Gemini without a format allowlist.
 * That pass-through is the reason Vercel AI Gateway replaced OpenRouter.
 *
 * Transcription is deliberately a separate step from parsing. The owner reads
 * the transcript, fixes it if the model misheard a price, and only then does it
 * become a catalogue. One model call that both hears and structures would hide a
 * mishearing inside a plausible looking price list, which is the failure that
 * loses a shop.
 */
import { generateText } from 'ai'
import { costMicroUsd, withFallback } from './models.ts'

/**
 * Formats a browser may hand us from MediaRecorder.
 *
 * `audio/mp4` is refused on purpose. CLAUDE.md records it being silently
 * ignored by a provider, which looks exactly like a model that heard nothing,
 * and Safari's MediaRecorder reaches for it first. Refusing loudly here means
 * the recorder is fixed, not the transcript quietly blamed.
 */
export const ACCEPTED_AUDIO = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/x-wav'] as const

/** A minute of Opus is about 100KB, so this is generous for a shop description. */
export const MAX_VOICE_BYTES = 8 * 1024 * 1024

export class VoiceNoteError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'VoiceNoteError'
    this.status = status
  }
}

/**
 * Normalises what a browser sends. MediaRecorder reports a full codec string
 * ("audio/webm;codecs=opus"), and the parameters are not part of the type.
 */
export function normalizeAudioType(raw: string | null | undefined): string {
  return (raw ?? '').split(';')[0]!.trim().toLowerCase()
}

/** Throws with the status the route should return. Pure, so db/test.mjs proves it. */
export function assertVoiceNote(mediaType: string | null | undefined, byteLength: number): string {
  const type = normalizeAudioType(mediaType)
  if (!type) throw new VoiceNoteError(415, 'the recording did not say what format it is')
  if (type === 'audio/mp4' || type === 'video/mp4') {
    throw new VoiceNoteError(415, 'record webm or wav, never mp4')
  }
  if (!(ACCEPTED_AUDIO as readonly string[]).includes(type)) {
    throw new VoiceNoteError(415, `unsupported audio format: ${type}`)
  }
  if (byteLength === 0) throw new VoiceNoteError(400, 'the recording is empty')
  if (byteLength > MAX_VOICE_BYTES) throw new VoiceNoteError(413, 'the recording is too long')
  return type
}

const SYSTEM = `You transcribe a voice recording made by a small business owner in Cambodia. You output the transcript and nothing else.

Rules:
- Write exactly what was said, in the language it was said in. Khmer stays in Khmer script. English stays in English. If they mixed, keep the mix.
- Never translate. Never summarise. Never answer or comment on what was said.
- Write numbers as digits, in the script the speaker used, and keep the currency word they used ("riel", "៛", "dollars", "$").
- Punctuate lightly so it reads as sentences.
- Never write an em dash. Use a comma or a full stop.
- If the audio is silent or you cannot make out any speech, output exactly: (no speech)`

export type Transcript = {
  text: string
  model: string
  cost_micro_usd: number
  tokens_in: number
  tokens_out: number
}

export async function transcribeVoiceNote(audio: Uint8Array, mediaType: string | null): Promise<Transcript> {
  const type = assertVoiceNote(mediaType, audio.byteLength)

  const { result, ref } = await withFallback('transcribe', (model) =>
    generateText({
      model,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe this recording.' },
            { type: 'file', mediaType: type, data: audio },
          ],
        },
      ],
      temperature: 0,
    }),
  )

  const text = result.text.trim()
  if (!text || text === '(no speech)') {
    throw new VoiceNoteError(422, 'nothing could be heard in that recording')
  }

  const tokensIn = result.usage?.inputTokens ?? 0
  const tokensOut = result.usage?.outputTokens ?? 0
  return {
    text,
    model: ref,
    cost_micro_usd: costMicroUsd(ref, tokensIn, tokensOut),
    tokens_in: tokensIn,
    tokens_out: tokensOut,
  }
}
