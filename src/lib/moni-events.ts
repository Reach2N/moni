export const RECEIPT_EVENT = 'moni:work-receipt'

export type MoniReceiptEvent = {
  id: string
  command: string
  summary: string
  createdAt: string
  status: 'success' | 'failed'
  bookingCode?: string
}
