'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CircleAlert, Link2Off, LoaderCircle, QrCode, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'

/**
 * Paste the Bakong account, scan your own card, and the shop can be paid.
 *
 * The same shape as `TelegramConnect`, and for the same reason: an owner does
 * one thing on this screen and it is a paste. The card below the form is not
 * decoration, it is the check. Her own banking app reading her own account
 * name off it is the whole verification this product can offer from outside
 * Cambodia, and it is a better one than a relay: she trusts that app already.
 *
 * Nothing here formats money or builds a QR. The card is drawn by
 * /api/money/test-card, and the account is saved by /api/money.
 */
export type MoneySettingsView = {
  raw: { accountId: string | null; merchantName: string | null; merchantCity: string | null }
  account: { accountId: string; merchantName: string; merchantCity: string } | null
  shopName: string
  currency: 'KHR' | 'USD'
}

export function MoneyAccount({ settings }: { settings: MoneySettingsView }) {
  const router = useRouter()
  const [accountId, setAccountId] = useState(settings.raw.accountId ?? '')
  const [merchantName, setMerchantName] = useState(settings.raw.merchantName ?? '')
  const [merchantCity, setMerchantCity] = useState(settings.raw.merchantCity ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cardVersion, setCardVersion] = useState(0)
  const [, startTransition] = useTransition()

  const connected = settings.account !== null

  async function submit(method: 'POST' | 'DELETE') {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/money', {
        method,
        headers: { 'content-type': 'application/json' },
        body:
          method === 'POST'
            ? JSON.stringify({
                account_id: accountId.trim(),
                merchant_name: merchantName.trim() || null,
                merchant_city: merchantCity.trim() || null,
              })
            : undefined,
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'request failed')
      if (method === 'DELETE') {
        setAccountId('')
        setMerchantName('')
        setMerchantCity('')
      }
      setCardVersion((current) => current + 1)
      startTransition(() => router.refresh())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The account could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="border border-rule/70">
        <header className="flex items-center gap-2 border-b border-hairline px-3 py-2">
          <Wallet className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <h2 className="km text-sm font-semibold text-ink">គណនី Bakong របស់ហាង</h2>
          {connected ? (
            <span className="km ml-auto inline-flex items-center gap-1 text-xs text-seal-text">
              <Check className="size-3.5" strokeWidth={1.75} aria-hidden />
              រួចរាល់
            </span>
          ) : null}
        </header>

        <form
          className="flex flex-col gap-3 px-3 py-3"
          onSubmit={(event) => {
            event.preventDefault()
            void submit('POST')
          }}
        >
          <p className="km text-sm text-ink">
            {connected
              ? `អតិថិជនស្កេន KHQR ហើយប្រាក់ចូល ${settings.account?.accountId} ផ្ទាល់។ Moni មិនកាន់ប្រាក់ទេ។`
              : 'បើកកម្មវិធីធនាគាររបស់អ្នក ចម្លងគណនី Bakong (ដូចជា sokha@wing) រួចបិទភ្ជាប់នៅទីនេះ។'}
          </p>

          <label className="km text-xs font-semibold text-rule">
            គណនី Bakong
            <Input
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              placeholder="sokha@wing"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              required
              disabled={busy}
              className="mt-1 min-h-11 rounded-none border-rule/70 bg-paper font-mono text-base shadow-none"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="km text-xs font-semibold text-rule">
              ឈ្មោះលើ QR
              <Input
                value={merchantName}
                onChange={(event) => setMerchantName(event.target.value)}
                placeholder={settings.shopName}
                maxLength={25}
                disabled={busy}
                className="km mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none"
              />
            </label>
            <label className="km text-xs font-semibold text-rule">
              ទីក្រុង
              <Input
                value={merchantCity}
                onChange={(event) => setMerchantCity(event.target.value)}
                placeholder="Phnom Penh"
                maxLength={25}
                disabled={busy}
                className="km mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none"
              />
            </label>
          </div>

          {error ? (
            <p className="km flex items-start gap-2 text-sm text-ink" role="alert">
              <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={busy || !accountId.trim()} className="km min-h-11 rounded-none">
              {busy ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden /> : <QrCode data-icon="inline-start" aria-hidden />}
              {connected ? 'រក្សាទុកការកែ' : 'រក្សាទុក និងបង្កើតកាតសាកល្បង'}
            </Button>
            {connected ? (
              <Button type="button" variant="ghost" onClick={() => void submit('DELETE')} disabled={busy} className="km min-h-11 rounded-none">
                <Link2Off data-icon="inline-start" aria-hidden />
                ដកគណនីចេញ
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      {connected ? (
        <section className="border border-rule/70">
          <header className="border-b border-hairline px-3 py-2">
            <h2 className="km text-sm font-semibold text-ink">សាកស្កេនដោយខ្លួនឯង</h2>
            <p className="km text-xs text-rule">
              បើកកម្មវិធីធនាគាររបស់អ្នក ស្កេនកាតនេះ។ បើវាបង្ហាញឈ្មោះគណនីរបស់អ្នក អតិថិជនគ្រប់រូបនឹងបង់ចូលត្រូវកន្លែង។
              កាតនេះមិនមែនជាការទូទាត់ពិតទេ។
            </p>
          </header>
          <div className="px-3 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- an SVG document from our own route, redrawn on every save */}
            <img
              key={cardVersion}
              src={`/api/money/test-card?v=${cardVersion}`}
              alt={`KHQR សាកល្បង ចូលគណនី ${settings.account?.accountId ?? ''}`}
              width={300}
              height={450}
              className="h-auto w-full max-w-[18rem] border border-hairline"
            />
          </div>
        </section>
      ) : null}

      <section className="border border-rule/70 px-3 py-3">
        <h2 className="km text-sm font-semibold text-ink">ពេលអតិថិជនបង់ប្រាក់</h2>
        <ol className="km mt-1 list-decimal space-y-1 pl-5 text-sm text-rule">
          <li>Moni ផ្ញើ KHQR ទៅអតិថិជនក្នុង Telegram ឬ Messenger ដោយស្វ័យប្រវត្តិ។</li>
          <li>អតិថិជនស្កេន ហើយប្រាក់ចូលគណនីរបស់អ្នកផ្ទាល់។ កម្មវិធីធនាគាររបស់អ្នកជូនដំណឹង។</li>
          <li>អ្នកចុច «បានទទួលប្រាក់ហើយ» ក្នុងសារ ឬប្រាប់ Moni ថា «លេខកូដ … បង់ហើយ»។ Moni បញ្ជាក់ការណាត់ និងប្រាប់អតិថិជន។</li>
        </ol>
      </section>
    </div>
  )
}
