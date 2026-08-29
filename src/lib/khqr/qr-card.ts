import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * The QR a customer actually scans, rendered by us.
 *
 * Deliberately NOT CutLuy's `checkout_url`. That is their hosted, their-branded
 * page, and sending a Cambodian shop's customer to a third party's domain in the
 * middle of paying is how a payment gets abandoned: the shop's name disappears,
 * the language may change, and the customer is asked to trust a site they have
 * never heard of. We take `qr_string` and draw it ourselves, inside the shop's
 * own conversation, under the shop's own name.
 *
 * The mark in the centre is the real KHQR mark, copied from the production store
 * at tiktok-bot. There is no SVG of it in that repo, only this 240x240 PNG and a
 * webp, so it is embedded as a data URI rather than redrawn: an approximation of
 * a payment network's mark is worse than a raster of the real one, because a
 * customer uses it to decide whether the code is genuine.
 *
 * ARCHITECTURE.md permits `qrcode` for exactly this and nothing else.
 */

const CARD = 560
const QUIET = 28
const MARK = 96

let markPromise: Promise<string | null> | null = null

/** Read once. It is a file on disk that cannot change while the process runs. */
function loadMark(): Promise<string | null> {
  markPromise ??= readFile(join(process.cwd(), 'public/images/payment/khqr.png'))
    .then((bytes) => `data:image/png;base64,${bytes.toString('base64')}`)
    .catch(() => null)
  return markPromise
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * An SVG string, not a PNG file.
 *
 * SVG stays crisp at any size, weighs a few kilobytes, and needs no image
 * pipeline or storage bucket. Nothing is written to disk: the payload is
 * short lived by design and a stored QR image is a stale QR waiting to be
 * scanned. (CLAUDE.md records ~40 generated KHQR PNGs sitting in a Downloads
 * folder named after real transaction references. Not again.)
 */
export async function renderKhqrCard({
  qrPayload,
  shopName,
  amountLabel,
  reference,
}: {
  qrPayload: string
  shopName: string
  amountLabel: string
  reference: string
}): Promise<string> {
  const [QRCode, mark] = await Promise.all([import('qrcode'), loadMark()])

  // High error correction, because a logo is about to cover the middle of it.
  // Anything lower and the mark makes the code unreadable on a cheap phone.
  const modules = QRCode.create(qrPayload, { errorCorrectionLevel: 'H' }).modules
  const size = modules.size
  const scale = (CARD - QUIET * 2) / size

  let path = ''
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!modules.get(x, y)) continue
      // One path of rectangles rather than one element each: a 57 module code is
      // over three thousand nodes otherwise, and phones render this inline.
      path += `M${(QUIET + x * scale).toFixed(2)} ${(QUIET + y * scale).toFixed(2)}h${scale.toFixed(2)}v${scale.toFixed(2)}h-${scale.toFixed(2)}z`
    }
  }

  const markX = (CARD - MARK) / 2
  const markY = QUIET + (CARD - QUIET * 2 - MARK) / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD}" height="${CARD + 96}" viewBox="0 0 ${CARD} ${CARD + 96}" role="img" aria-label="KHQR ${escapeXml(amountLabel)}">
  <rect width="${CARD}" height="${CARD + 96}" fill="#FFFFFF"/>
  <path d="${path}" fill="#1D1D1F"/>
  ${mark ? `<rect x="${markX - 8}" y="${markY - 8}" width="${MARK + 16}" height="${MARK + 16}" rx="14" fill="#FFFFFF"/><image href="${mark}" x="${markX}" y="${markY}" width="${MARK}" height="${MARK}" preserveAspectRatio="xMidYMid meet"/>` : ''}
  <text x="${CARD / 2}" y="${CARD + 30}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="26" font-weight="600" fill="#1D1D1F">${escapeXml(amountLabel)}</text>
  <text x="${CARD / 2}" y="${CARD + 58}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="16" fill="#3C3C4399">${escapeXml(shopName)}</text>
  <text x="${CARD / 2}" y="${CARD + 80}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="14" fill="#3C3C4399">${escapeXml(reference)}</text>
</svg>`
}
