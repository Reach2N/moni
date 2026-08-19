import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Moni',
  description:
    'Describe your shop in plain language. Moni answers your customers, books them in, and takes payment by KHQR.',
  metadataBase: new URL('https://monikhmer.com'),
}

/**
 * lang="km" because this is a Khmer-first product. The 1.75 line height that keeps
 * coeng subscripts from clipping hangs off :lang(km), so declaring the document
 * English was quietly disarming it for every string that did not carry .km.
 *
 * Kantumruy Pro was removed: next/font generates its own family name, which
 * --font-sans never referenced, so five weights were downloading and never
 * rendering. Busra covers Khmer and Latin as one family and is already vendored.
 *
 * To ship the brand face: reactivate Futura 100 Khmer in Creative Cloud, make an
 * Adobe Fonts web project, paste its <link> in <head> here. It already holds the
 * first slot in --font-sans. Never self host it, the EULA forbids conversion.
 */
/**
 * Adobe Fonts web project id. Paste ONLY the kit id into .env.local as
 * NEXT_PUBLIC_TYPEKIT_ID and Futura 100 Khmer starts rendering, because it already
 * holds the first slot in --font-sans. The kit id is the filename in the embed
 * Adobe gives you: https://use.typekit.net/<THIS_PART>.css
 *
 * This is a stylesheet link on purpose. The font is never self hosted: the
 * TypeTogether EULA forbids converting it to a web format, and the Adobe
 * subscription licenses web-project delivery only.
 */
const TYPEKIT_ID = process.env.NEXT_PUBLIC_TYPEKIT_ID?.trim()

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="km" className="h-full antialiased">
      {TYPEKIT_ID ? (
        <head>
          <link rel="stylesheet" href={`https://use.typekit.net/${TYPEKIT_ID}.css`} />
        </head>
      ) : null}
      <body className="min-h-full bg-paper text-ink">
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
  THESIS: A booking already is an invitation, a name and a time and someone who will
  receive you. Refuses the SaaS dashboard's card grid and stat row.
  OWN-WORLD: Khmer wedding invitation. Note paper #F8FAFC as the single ground, plate
  ink #0F172A, ruled ornament #475569, one metallic ink #059669. Ruled frame, kbach
  corner brackets, centred plate, struck seals. One family, Busra.
  STORY: She sees what was collected, who she has invited today, then what needs her.
  FIRST VIEWPORT: the shop plate framed and centred at display scale under a
  hairline; the compose box that turns a paragraph into a price list; then the ink
  panel carrying takings in metallic ink at fixed digit positions; then the ruled
  ledger, time bracket left, name largest, seal right; then what needs her. Two
  rule weights: the frame is the light course, the kbach bracket the heavy one in
  plate ink. Bottom nav pinned to the viewport, not to the document end.
  FORM: The Invitation, candidate 4 of the grounded list, seed f1fef148.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish
  review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
-->` }}
        />
        {children}
      </body>
    </html>
  )
}
