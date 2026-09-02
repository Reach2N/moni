'use client'

import { useState } from 'react'
import { CircleAlert, LoaderCircle, Mic, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { useVoiceRecorder } from '@/lib/voice/use-recorder.ts'
import { toKhmerDigits } from './dashboard-format.ts'

/**
 * Speak the shop instead of typing it.
 *
 * Most Cambodian shop owners type Khmer slowly and speak it fluently, so this is
 * the primary input on the onboarding screen and typing is the fallback, not the
 * other way round.
 *
 * Press to start, press to stop, rather than the hold-to-record in PLAN.md. A
 * shop description runs to about a minute, and holding a button on a phone for a
 * minute is its own small ordeal; a press target also survives a screen reader,
 * where a pointer-held gesture does not. PLAN.md carries the correction.
 *
 * The transcript is never sent straight to the parser. It lands in the
 * description box the owner is already looking at, so a misheard price is
 * corrected by them before it becomes a price list.
 */
const MM_SS = (seconds: number) =>
  `${toKhmerDigits(Math.floor(seconds / 60))}:${toKhmerDigits(String(seconds % 60).padStart(2, '0'))}`

export function VoiceNote({
  onTranscript,
  disabled = false,
}: {
  onTranscript: (text: string) => void
  disabled?: boolean
}) {
  const [transcribing, setTranscribing] = useState(false)
  const [failure, setFailure] = useState('')

  const recorder = useVoiceRecorder({
    maxSeconds: 120,
    onRecorded: async (audio) => {
      setTranscribing(true)
      setFailure('')
      try {
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          // The blob's own type IS the media type the model needs, so it is the
          // whole request: no multipart parser, no base64, no third more bytes.
          headers: { 'content-type': audio.type },
          body: audio,
        })
        const body = await response.json()
        if (!response.ok || body.error) throw new Error(body.error ?? 'transcribe failed')
        onTranscript(String(body.text ?? '').trim())
      } catch {
        setFailure('Moni មិនអាចស្តាប់សំឡេងនេះបានទេ។ សូមថតម្តងទៀត ឬវាយបញ្ចូល។')
      } finally {
        setTranscribing(false)
      }
    },
  })

  const busy = disabled || transcribing
  const recording = recorder.state === 'recording' || recorder.state === 'requesting'
  const message = failure || recorder.error

  if (recorder.state === 'unsupported') {
    return (
      <p className="km flex items-start gap-2 text-xs text-rule">
        <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        កម្មវិធីរុករកនេះថតសំឡេងមិនបានទេ។ សូមវាយពិពណ៌នាខាងក្រោម។
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={recording ? 'default' : 'outline'}
          onClick={() => (recording ? recorder.stop() : recorder.start())}
          disabled={busy}
          aria-label={recording ? 'ឈប់ថត' : 'ថតសំឡេង'}
          className="km min-h-11 flex-1 rounded-none"
        >
          {transcribing ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden />
          ) : recording ? (
            <Square data-icon="inline-start" aria-hidden />
          ) : (
            <Mic data-icon="inline-start" aria-hidden />
          )}
          {transcribing ? 'Moni កំពុងស្តាប់' : recording ? 'ឈប់ថត' : 'និយាយប្រាប់ជំនួស'}
        </Button>

        {recording ? (
          <>
            <p className="km tnum text-sm text-rule" aria-live="off">{MM_SS(recorder.seconds)}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              onClick={() => recorder.cancel()}
              aria-label="បោះបង់ការថត"
              className="size-11 rounded-none"
            >
              <X aria-hidden />
            </Button>
          </>
        ) : null}
      </div>

      {message ? (
        <p role="alert" className="km flex items-start gap-2 text-xs text-rule">
          <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          {message}
        </p>
      ) : null}
    </div>
  )
}
