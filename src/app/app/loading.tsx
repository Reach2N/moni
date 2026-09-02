/**
 * What fills the content area while a screen loads.
 *
 * It used to render a whole page: its own header, its own plate, and a block of
 * dashboard-shaped copy about today's bookings, with no navigation in it at all.
 * Every link between two owner screens therefore replaced the entire app with a
 * skeleton of a different screen, which is why switching pages read as a full
 * reload. The shell now lives in the layout, which Next does not re-render on a
 * navigation, so this sits inside the chrome that stays put and says only what
 * is true: something is on its way.
 */
export default function LoadingOwnerScreen() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6" aria-live="polite" aria-busy="true">
      <p className="km text-sm text-rule">កំពុងបើក…</p>
      {/* Three quiet bars at the shape of a heading and two rows. No numbers and
          no shop name: a skeleton that guesses at content flickers into
          different content the moment the real data lands. */}
      <div className="mt-4 space-y-3" aria-hidden>
        <div className="h-6 w-2/5 animate-pulse bg-ink/5" />
        <div className="h-24 w-full animate-pulse bg-ink/5" />
        <div className="h-24 w-full animate-pulse bg-ink/5" />
      </div>
    </div>
  )
}
