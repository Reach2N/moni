import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { themeFor } from '@/themes/registry.tsx'

export const dynamic = 'force-dynamic'

/**
 * A shop's own public site.
 *
 * Reached at `{slug}.moni.cam`, which the proxy rewrites here, and directly at
 * `/s/{slug}` so the same page is testable without DNS. One Next app, one
 * deploy, no per-tenant provisioning: the wildcard domain is a single entry in
 * Vercel and a new shop needs nothing.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { getStorefront } = await import('@/lib/queries/storefront.ts')
  const result = await getStorefront(slug)
  if (!result) return { title: 'Moni' }
  const { data } = result
  return {
    title: `${data.shop.name}`,
    description: data.content.subhead,
    // A shop's own site is its own thing. Nothing here should read as Moni's.
    openGraph: { title: data.shop.name, description: data.content.subhead },
  }
}

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getStorefront } = await import('@/lib/queries/storefront.ts')
  const result = await getStorefront(slug)
  // Unpublished is a 404, not an empty page: a shop that never pressed publish
  // has no site, and showing its prices anyway would be publishing for it.
  if (!result) notFound()
  const { data, style } = result
  const theme = themeFor(data.content.theme)

  return (
    <div
      className="sf min-h-dvh bg-surface text-label"
      style={style.vars as CSSProperties}
      data-rule={style.rule}
    >
      <theme.Storefront data={data} tileSeed={style.tileSeed} />
      <footer className="border-t border-separator px-5 py-6">
        <p className="km text-xs text-label-3">
          {data.shop.address ? `${data.shop.address} · ` : ''}
          {data.shop.phone ?? ''}
        </p>
        {data.content.notice ? (
          <p className="km mt-2 text-xs text-label-2">{data.content.notice}</p>
        ) : null}
        <p className="mt-3 text-xs text-label-3">Made with Moni</p>
      </footer>
    </div>
  )
}
