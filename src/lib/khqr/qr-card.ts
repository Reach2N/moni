import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CURRENCIES, type CurrencyCode } from '../types.ts'

/**
 * The KHQR card a customer actually scans, in the standard branded layout.
 *
 * Deliberately NOT CutLuy's `checkout_url`. That is their hosted, their branded
 * page, and sending a Cambodian shop's customer to a third party's domain in the
 * middle of paying is how a payment gets abandoned. We take the `qr_string` and
 * draw it ourselves, under the shop's own name.
 *
 * The layout is the one every Cambodian already recognises: red header with the
 * KHQR wordmark and its cut corner, merchant name, amount, a dashed tear line,
 * then the code with a badge in the middle. Geometry, colour and the header path
 * are ported from the production store at tiktok-bot, which has been putting
 * these in front of real customers. A QR that does not look like a KHQR gets
 * hesitated over, and hesitation at the moment of payment is the whole cost.
 *
 * SVG rather than PNG: crisp at any size, a few kilobytes, no image pipeline,
 * and no font rasterisation, which is what stops a deployment without Khmer
 * fonts baking missing-glyph boxes into a shop's payment code. Nothing is
 * written to disk; the payload is short lived and a stored QR is a stale QR
 * waiting to be scanned.
 */

const WIDTH = 600
const HEIGHT = 900
const QR_X = 58
const QR_Y = 358
const QR_SIZE = 484
const KHQR_RED = '#e1232e'

/**
 * Khmer first in the fallback chain, because a merchant name is usually Khmer
 * and a missing glyph here is a box on a payment code.
 */
const FONT = "Arial,Helvetica,'Noto Sans Khmer','Khmer OS System','Khmer OS',sans-serif"

/** Read once each. They are files on disk that cannot change while the process runs. */
let wordmark: Promise<string | null> | null = null
let badge: Promise<string | null> | null = null

function loadAsset(cache: Promise<string | null> | null, relativePath: string, mime: string) {
  return (
    cache ??
    readFile(join(process.cwd(), relativePath))
      .then((bytes) => `data:${mime};base64,${bytes.toString('base64')}`)
      .catch(() => null)
  )
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** A long shop name must not run under the amount. */
function truncate(value: string, max: number) {
  const clean = value.trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`
}

/**
 * The figure only, with the currency set beside it in smaller type, which is how
 * the standard card reads. Not formatMoney(), which returns one glued string.
 * Minor units in, so nothing here ever touches a float.
 */
function amountValue(amountMinor: number, currency: CurrencyCode) {
  const decimals = CURRENCIES[currency].decimals
  const major = amountMinor / 10 ** decimals
  return major.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export async function renderKhqrCard({
  qrPayload,
  shopName,
  amountMinor,
  currency,
  reference,
}: {
  qrPayload: string
  shopName: string
  amountMinor: number
  currency: CurrencyCode
  reference: string
}): Promise<string> {
  const [QRCode, khqrMark, moniMark] = await Promise.all([
    import('qrcode'),
    (wordmark = loadAsset(wordmark, 'public/images/payment/khqr-wordmark.webp', 'image/webp')),
    (badge = loadAsset(badge, 'public/logos/logo.png', 'image/png')),
  ])

  // Error correction H, because a badge is about to cover the middle of it.
  // Anything lower and the logo makes the code unreadable on a cheap phone.
  const qrSvg = await QRCode.toString(qrPayload, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    width: QR_SIZE,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
  const viewBox = qrSvg.match(/\sviewBox="([^"]+)"/)?.[1] ?? '0 0 1 1'
  const qrInner = qrSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

  const centreY = QR_Y + QR_SIZE / 2
  const badgeSize = 68
  // Larger than the 54 the reference uses: that logo was a tightly cropped
  // favicon, and ours carries its own whitespace, so the mark would otherwise
  // float in the middle of the badge looking like a mistake.
  const markSize = 64

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="KHQR ${escapeXml(amountValue(amountMinor, currency))} ${currency}">
  <rect width="${WIDTH}" height="${HEIGHT}" rx="24" fill="#ffffff"/>
  <path d="M24 0h552c13.3 0 24 10.7 24 24v156l-60-60H0V24C0 10.7 10.7 0 24 0z" fill="${KHQR_RED}"/>
  ${
    khqrMark
      ? `<image href="${khqrMark}" x="193.5" y="16" width="213" height="88" preserveAspectRatio="xMidYMid meet"/>`
      : `<text x="300" y="82" fill="#ffffff" font-family="${FONT}" font-size="48" font-weight="900" text-anchor="middle">KHQR</text>`
  }
  <text x="60" y="196" fill="#111111" font-family="${FONT}" font-size="28" font-weight="500">${escapeXml(truncate(shopName, 30))}</text>
  <text x="60" y="270" fill="#111111" font-family="${FONT}" font-weight="800"><tspan font-size="46">${escapeXml(amountValue(amountMinor, currency))}</tspan><tspan dx="9" font-size="20" font-weight="500">${currency}</tspan></text>
  <line x1="0" y1="300" x2="${WIDTH}" y2="300" stroke="#777777" stroke-width="2" stroke-dasharray="6 7"/>
  <svg x="${QR_X}" y="${QR_Y}" width="${QR_SIZE}" height="${QR_SIZE}" viewBox="${escapeXml(viewBox)}" shape-rendering="crispEdges">${qrInner}</svg>
  ${
    moniMark
      ? `<circle cx="300" cy="${centreY}" r="${badgeSize / 2}" fill="#ffffff"/>
  <circle cx="300" cy="${centreY}" r="${badgeSize / 2 - 1}" fill="none" stroke="#d1d5db" stroke-width="2"/>
  <image href="${moniMark}" x="${WIDTH / 2 - markSize / 2}" y="${centreY - markSize / 2}" width="${markSize}" height="${markSize}" preserveAspectRatio="xMidYMid meet"/>`
      : ''
  }
  <text x="300" y="${QR_Y + QR_SIZE + 52}" fill="#777777" font-family="ui-monospace, monospace" font-size="18" text-anchor="middle">${escapeXml(reference)}</text>
</svg>`
}
