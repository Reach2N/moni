'use client'

import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { CompactPlate } from '@/components/app/frame.tsx'

/**
 * The plate no longer names a shop. This screen renders when the shop could not
 * be read, so printing "ហាងកាត់សក់ សុខា" was asserting the one fact the page had
 * just failed to establish, and it flickered into a different name on recovery.
 *
 * The copy no longer blames her internet either. The read can fail at the
 * network or at the database and this component cannot tell which, so it states
 * what it does know: nothing in the shop changed, and pressing this tries again.
 */
export default function OwnerCommandCentreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex h-14 items-center border-b border-rule/70 px-3 sm:px-4">
        <div className="w-full max-w-md">
          <CompactPlate name="Moni" meta="មិនអាចបើកបាន" shortMeta="មិនអាចបើកបាន" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 py-6">
        <Alert>
          <TriangleAlert strokeWidth={2} aria-hidden />
          <AlertTitle>មិនអាចបើកទិន្នន័យហាងបានទេ</AlertTitle>
          <AlertDescription>
            <p>ការណាត់ និងសាររបស់អ្នកនៅដដែល គ្មានអ្វីបាត់ ឬប្តូរទេ។</p>
            <Button type="button" onClick={reset} className="km mt-3 min-h-11 rounded-none">
              <RotateCcw data-icon="inline-start" aria-hidden />
              បើកម្តងទៀត
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    </div>
  )
}
