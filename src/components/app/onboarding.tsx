'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Send } from 'lucide-react'
import { ChatPanel } from './chat-panel.tsx'
import { ShopSetup } from './shop-setup.tsx'

/**
 * The first screen a member sees, and the whole product in one sitting: say what
 * the shop is, check what Moni understood, then talk to the assistant it built.
 *
 * It reuses ShopSetup rather than growing a second describe-parse-review-save
 * implementation. The dashboard sheet and this screen are the same job at
 * different moments, and two copies of the parse flow is exactly how the earlier
 * iteration drifted.
 */
export function Onboarding({
  shopName,
  initialInstructions,
  hasCatalogue,
}: {
  shopName: string
  initialInstructions: string | null
  hasCatalogue: boolean
}) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      {saved ? (
        <>
          <div className="flex items-start gap-3">
            <Check className="mt-1 size-6 shrink-0 text-seal-text" strokeWidth={1.75} aria-hidden />
            <div>
              <h1 className="km text-xl font-semibold text-ink">ជំនួយការរបស់អ្នកដំណើរការហើយ</h1>
              <p className="km mt-1 text-sm text-rule">
                សាកសួរដូចអតិថិជនម្នាក់ខាងក្រោម។ Moni ឆ្លើយតាមតម្លៃ និងម៉ោងដែលអ្នកទើបរក្សាទុក។
              </p>
            </div>
          </div>

          <div className="mt-6 border border-rule/70">
            <header className="border-b border-hairline px-3 py-2">
              <h2 className="km text-sm font-semibold text-ink">សាកជាអតិថិជន</h2>
            </header>
            <ChatPanel />
          </div>

          <div className="mt-6 border border-rule/70 px-3 py-3">
            <p className="km flex items-center gap-2 text-sm font-semibold text-ink">
              <Send className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              បន្ទាប់៖ ភ្ជាប់ Telegram
            </p>
            <p className="km mt-1 text-sm text-rule">
              អតិថិជននឹងសរសេរមក Telegram ហើយ Moni ឆ្លើយជំនួសអ្នក។ ការភ្ជាប់មិនទាន់រួចរាល់នៅឡើយទេ។
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
            <Link
              href="/app"
              className="km inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-sm text-on-ink"
            >
              ទៅផ្ទាំងគ្រប់គ្រង
              <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setSaved(false)}
              className="km min-h-11 px-1 text-sm text-rule underline underline-offset-4"
            >
              កែពិពណ៌នាម្តងទៀត
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 className="km text-xl font-semibold text-ink">
            {hasCatalogue ? 'កែពិពណ៌នាហាង' : `សូមស្វាគមន៍ ${shopName}`}
          </h1>
          <p className="km mt-1 text-sm text-rule">
            ប្រាប់ Moni ពីហាងរបស់អ្នកម្តង ដោយនិយាយ ឬវាយបញ្ចូល។ Moni រៀបចំសេវា តម្លៃ ម៉ោងបើក
            និងចំនួនបុគ្គលិកឱ្យអ្នកពិនិត្យ។
          </p>

          <ol className="km mt-4 flex flex-wrap gap-x-4 gap-y-1 border-y border-hairline py-2 text-xs text-rule">
            <li>១. ពិពណ៌នា</li>
            <li>២. ពិនិត្យ និងរក្សាទុក</li>
            <li>៣. សាកជាអតិថិជន</li>
          </ol>

          <div className="mt-4 -mx-4 sm:mx-0">
            <ShopSetup
              initialInstructions={initialInstructions}
              onSaved={() => {
                setSaved(true)
                router.refresh()
              }}
            />
          </div>
        </>
      )}
    </main>
  )
}
