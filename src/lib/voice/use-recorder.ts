'use client'

/**
 * Hand built after the sourcing search in CLAUDE.md found nothing that fits.
 *
 * Searched 29 August 2026: shadcn/ui has no recorder. AI Elements, which
 * ARCHITECTURE.md section 3 said to check first, ships 30 components and not one
 * of them touches `getUserMedia` or `MediaRecorder`, so there is no voice
 * component there to adopt. On npm, `react-audio-voice-recorder` (the candidate
 * ARCHITECTURE.md named) has not been published since September 2023 and depends
 * on `@ffmpeg/ffmpeg`, which is a WASM build in the bundle to produce a format
 * we do not want; `react-media-recorder` is maintained but pulls the
 * `extendable-media-recorder` plus wav-encoder worklet chain for the same
 * reason; `use-audio-recorder` is a 2022 stub. All of them exist to transcode.
 * We want the browser's own Opus in webm and nothing else, so this is about
 * ninety lines instead of a dependency tree.
 *
 * What it does own is the part that is genuinely fiddly: permission states,
 * elapsed time, a hard duration cap, releasing the microphone, and refusing mp4.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'denied' | 'unsupported'

/**
 * In preference order. Opus in webm is what Gemini reads best and what Chrome
 * and Firefox produce natively.
 *
 * `audio/mp4` is absent deliberately and permanently. CLAUDE.md records a
 * provider silently ignoring it, which presents as a model that heard nothing.
 * Safari's MediaRecorder offers mp4 first, so on a browser that can produce
 * nothing else this hook reports `unsupported` and the owner is told to type.
 * A clear "not here" beats a transcript that is quietly always empty.
 */
const CANDIDATE_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/wav',
]

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  for (const type of CANDIDATE_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return null
}

export type VoiceRecorder = {
  state: RecorderState
  /** Whole seconds elapsed, for a counter the owner can watch. */
  seconds: number
  error: string
  start: () => void
  stop: () => void
  /** Throw the recording away and release the microphone. */
  cancel: () => void
}

export function useVoiceRecorder({
  onRecorded,
  maxSeconds = 120,
}: {
  onRecorded: (audio: Blob) => void
  maxSeconds?: number
}): VoiceRecorder {
  const [state, setState] = useState<RecorderState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<number | null>(null)
  const keepRef = useRef(true)
  // Held in a ref, and updated in an effect rather than during render, so that
  // a caller passing an inline arrow does not tear down and restart the
  // recorder on every keystroke elsewhere in the form.
  const onRecordedRef = useRef(onRecorded)
  useEffect(() => {
    onRecordedRef.current = onRecorded
  }, [onRecorded])

  const release = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    const recorder = recorderRef.current
    recorderRef.current = null
    recorder?.stream.getTracks().forEach((track) => track.stop())
  }, [])

  // The microphone must not stay live because a sheet closed or the owner
  // navigated away. The browser shows a recording indicator either way, and a
  // shop owner seeing one they did not start is a trust problem, not a bug.
  useEffect(() => release, [release])

  const start = useCallback(() => {
    if (recorderRef.current) return
    setError('')
    setSeconds(0)

    const mimeType = pickMimeType()
    if (!mimeType || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unsupported')
      setError('This browser cannot record here. Type the description instead.')
      return
    }

    keepRef.current = true
    setState('requesting')
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // The owner may have cancelled while the permission prompt was open.
        if (!keepRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          setState('idle')
          return
        }

        const recorder = new MediaRecorder(stream, { mimeType })
        chunksRef.current = []
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data)
        }
        recorder.onstop = () => {
          const keep = keepRef.current
          release()
          setState('idle')
          if (!keep) return
          const audio = new Blob(chunksRef.current, { type: mimeType })
          chunksRef.current = []
          if (audio.size > 0) onRecordedRef.current(audio)
        }

        recorderRef.current = recorder
        recorder.start()
        setState('recording')

        timerRef.current = window.setInterval(() => {
          setSeconds((current) => {
            const next = current + 1
            // A shop description is a minute of talking. The cap exists so a
            // pocket recording never becomes an expensive upload.
            if (next >= maxSeconds) recorderRef.current?.stop()
            return next
          })
        }, 1_000)
      })
      .catch((cause: unknown) => {
        const name = cause instanceof Error ? cause.name : ''
        setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'idle')
        setError(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'Moni needs permission to use the microphone.'
            : 'The microphone could not be started.',
        )
      })
  }, [maxSeconds, release])

  const stop = useCallback(() => {
    keepRef.current = true
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    else {
      release()
      setState('idle')
    }
  }, [release])

  const cancel = useCallback(() => {
    keepRef.current = false
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    else {
      release()
      setState('idle')
    }
    setSeconds(0)
  }, [release])

  return { state, seconds, error, start, stop, cancel }
}
