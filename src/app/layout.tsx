import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Moni',
  description:
    'Run a Cambodian shop in plain language. Moni organizes the catalogue, plans the day, books customers, and hands uncertain conversations to the owner.',
  metadataBase: new URL('https://moni.cam'),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
      <body className="min-h-full">
          {children}
      </body>
    </html>
  )
}