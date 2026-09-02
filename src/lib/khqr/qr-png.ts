import 'server-only'

/**
 * The QR as a PNG, for channels that take a picture and not a document.
 *
 * Telegram's sendPhoto and Messenger's image attachment both refuse SVG, so the
 * branded card in `qr-card.ts` (SVG, the one the browser shows) cannot travel
 * to a phone as-is. This is the code alone, at error correction M and a size a
 * banking app's scanner reads first time on a mid range phone. The amount, the
 * shop and the booking code ride in the caption, in the customer's own script,
 * so nothing is rasterised text and no font can go missing.
 */
export async function renderKhqrPng(qrPayload: string): Promise<Buffer> {
  const QRCode = await import('qrcode')
  return QRCode.toBuffer(qrPayload, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 640,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
}
