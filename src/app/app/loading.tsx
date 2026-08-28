import { CompactPlate, Frame } from '@/components/app/frame.tsx'

/**
 * The skeleton named a specific shop, which flickered into a different name once
 * the real snapshot landed. It now says only what is true while it is true: this
 * is Moni, and it is fetching.
 */
export default function LoadingOwnerCommandCentre() {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex h-14 items-center border-b border-rule/70 px-3 sm:px-4">
        <div className="w-full max-w-md">
          <CompactPlate name="Moni" meta="កំពុងបើក" shortMeta="កំពុងបើក" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-3 sm:px-4">
        <section className="bg-ink px-4 py-4 text-on-ink" aria-live="polite">
          <p className="km text-sm font-semibold">កំពុងបើកហាងរបស់អ្នក</p>
          <p className="km mt-1 text-sm text-on-ink-dim">Moni កំពុងយកការណាត់ថ្ងៃនេះ និងសារដែលរង់ចាំអ្នក។</p>
        </section>
        <Frame className="min-h-32 px-4 py-4">
          <p className="km text-sm font-semibold text-ink">ថ្ងៃនេះ</p>
          <p className="km mt-2 text-sm text-rule">កំពុងរៀបចំការណាត់តាមម៉ោង</p>
        </Frame>
      </main>
    </div>
  )
}
