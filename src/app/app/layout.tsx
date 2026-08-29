/**
 * The Invitation world, scoped.
 *
 * Its ground and ink used to sit on <body> in the root layout, which meant the
 * public marketing surface inherited a retired design system. They live here
 * now, so the two worlds cannot bleed into each other while both exist.
 *
 * PLAN.md Phase 5 rebuilds this dashboard in the Apple palette. When it does,
 * this file and the Invitation tokens in globals.css go in the same commit.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper text-ink [color-scheme:light]">
      <div
        hidden
        dangerouslySetInnerHTML={{
          __html: `<!--
  THESIS: The owner sees what requires her now, tells Moni what to handle, and watches
  the shop plan change. Refuses a revenue CMS and a customer-booking-only dashboard.
  OWN-WORLD: Khmer wedding invitation. Note paper #F8FAFC as the single ground, plate
  ink #0F172A, ruled ornament #475569, one metallic ink #059669. Ruled frame, kbach
  corner brackets, centred plate, struck seals. One family, Busra.
  STORY: She sees what needs her now, gives Moni one task, then reads the changed day.
  FIRST VIEWPORT: a compact framed shop plate; one ink region for what needs her;
  one task-oriented Moni control; then the ruled day ledger with appointments and
  meaningful gaps. Bottom nav is Moni, Day, Inbox and stays pinned to the viewport.
  FORM: The Invitation, candidate 4 of the grounded list, seed f1fef148.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish
  review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
-->` }}
      />
      {children}
    </div>
  )
}
