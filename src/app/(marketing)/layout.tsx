/**
 * The public surface. Apple palette, light and dark.
 *
 * `moni-hig` is what opts this subtree into `color-scheme: light dark`, so the
 * browser's own chrome follows. :root stays light-only for the Invitation
 * dashboard under /app, which has no dark variant and will not get one: Phase 5
 * rebuilds it in this palette instead.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="moni-hig min-h-dvh bg-surface text-label">{children}</div>
}
