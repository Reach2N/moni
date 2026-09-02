'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, LoaderCircle, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'

/**
 * One product's picture: the one it has, a way to add one from a phone, and a
 * way to ask Moni to draw one.
 *
 * The generate button is expected to be refused on a free plan, so its refusal
 * is shown verbatim beside the upload input rather than as an error toast. The
 * message is already in the owner's language and already names her next move,
 * and the upload she can always do is right there.
 */
export function ProductPhoto({
  productId,
  photoUrl,
  name,
}: {
  productId: string
  photoUrl: string | null
  name: string
}) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'draw' | 'remove' | null>(null)
  const [notice, setNotice] = useState('')
  const [, startTransition] = useTransition()

  async function call(what: 'upload' | 'draw' | 'remove', file?: File) {
    setBusy(what)
    setNotice('')
    try {
      // The file goes up as raw bytes with its own type as the content type,
      // which is the contract the route takes: base64 would cost a third more
      // bytes on a phone.
      const response = await fetch(`/api/products/${productId}/photo`, {
        method: what === 'upload' ? 'POST' : what === 'draw' ? 'PUT' : 'DELETE',
        ...(file ? { headers: { 'content-type': file.type }, body: file } : {}),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'that did not work')
      startTransition(() => router.refresh())
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'that did not work')
    } finally {
      setBusy(null)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a Supabase Storage URL, sized here and never optimised through the image pipeline
          <img
            src={photoUrl}
            alt={name}
            width={64}
            height={64}
            loading="lazy"
            className="size-16 shrink-0 border border-hairline object-cover"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center border border-dashed border-hairline">
            <ImagePlus className="size-5 text-rule" strokeWidth={1.5} aria-hidden />
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            id={`photo-${productId}`}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void call('upload', file)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => input.current?.click()}
            className="km min-h-11 rounded-none"
          >
            {busy === 'upload' ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden /> : <ImagePlus data-icon="inline-start" aria-hidden />}
            បញ្ចូលរូប
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy !== null}
            onClick={() => void call('draw')}
            className="km min-h-11 rounded-none"
          >
            {busy === 'draw' ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden /> : <Sparkles data-icon="inline-start" aria-hidden />}
            ឱ្យ Moni គូរ
          </Button>
          {photoUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy !== null}
              onClick={() => void call('remove')}
              aria-label={`ដករូប ${name}`}
              className="min-h-11 rounded-none"
            >
              <Trash2 aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>

      {notice ? (
        <p className="km text-xs text-rule" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  )
}
