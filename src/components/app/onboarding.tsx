'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Send } from 'lucide-react'
import { SetupTasks } from '@/components/agent/setup-tasks.tsx'
import { setupComplete, type SetupStep } from '@/lib/queries/setup-progress.ts'
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
 *
 * This is the one /app screen on the Apple palette. It is the first thing a
 * founding shop sees after the site that sold them, and until PLAN.md Phase 5
 * rebuilds the dashboard the two would not match. `.moni-hig` carries the palette
 * and the type, `.moni-app-hig` re-points the Invitation's fixed inks so the
 * shared agent components come with it: see the comment on that class in
 * globals.css. Both go away in Phase 5, when the whole surface is one world.
 */
export function Onboarding({
  shopName,
  initialInstructions,
  hasCatalogue,
  steps,
}: {
  shopName: string
  initialInstructions: string | null
  hasCatalogue: boolean
  steps: readonly SetupStep[]
}) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)

  return (
    <div className="moni-hig moni-app-hig min-h-dvh bg-surface text-label">
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      {saved ? (
        <>
          {/* No spine on this branch. `steps` is a server prop snapshotted before
              the save, so rendering it here shows the owner "មិនទាន់" against the
              two rows they just completed, for as long as router.refresh() takes.
              The Telegram card below already names what is next. */}
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
              អតិថិជននឹងសរសេរមក Telegram ហើយ Moni ឆ្លើយជំនួសអ្នក។ ត្រូវការតែលេខសម្ងាត់ពី BotFather ប៉ុណ្ណោះ។
            </p>
            <Link
              href="/app/channels"
              className="km mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-ink underline underline-offset-4"
            >
              ភ្ជាប់ Telegram ឥឡូវ
              <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
            </Link>
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
          {!setupComplete(steps) && (
            <div className="mb-6">
              <SetupTasks steps={steps} retryLabel="សាកម្តងទៀត" detailLabel="មើលកំហុស" />
            </div>
          )}
          <h1 className="km text-xl font-semibold text-ink">
            {hasCatalogue ? 'កែពិពណ៌នាហាង' : `សូមស្វាគមន៍ ${shopName}`}
          </h1>
          <p className="km mt-1 text-sm text-rule">
            ប្រាប់ Moni ពីហាងរបស់អ្នកម្តង ដោយនិយាយ ឬវាយបញ្ចូល។ Moni រៀបចំសេវា តម្លៃ ម៉ោងបើក
            និងចំនួនបុគ្គលិកឱ្យអ្នកពិនិត្យ។
          </p>

          <div className="mt-4 -mx-4 sm:mx-0">
            <ShopSetup
              initialInstructions={initialInstructions}
              initialShopName={shopName}
              onSaved={() => {
                setSaved(true)
                router.refresh()
              }}
            />
          </div>
        </>
      )}
      </main>
    </div>
  )
}
