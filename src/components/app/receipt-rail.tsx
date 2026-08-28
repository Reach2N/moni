'use client'

import { useEffect, useState } from 'react'
import { Check, CircleAlert, ReceiptText } from 'lucide-react'
import { RECEIPT_EVENT, type MoniReceiptEvent } from '@/lib/moni-events.ts'
import { relativeCambodiaTime } from './dashboard-format.ts'
import { Panel, PanelHeader, PanelRow, PanelRows } from './panel.tsx'

/**
 * Proof of what Moni did in the owner's name (PRODUCT.md principle 5).
 *
 * It renders nothing until there is something to show. The previous version
 * printed a bordered panel explaining that the panel was empty, at the top of the
 * rail, on every first load: an empty state earns its place by teaching a first
 * run something, and this one only restated its own heading while pushing the
 * messages that do need her further down the phone.
 */
export function SessionReceipts() {
  const [receipts, setReceipts] = useState<MoniReceiptEvent[]>([])

  useEffect(() => {
    function receive(event: Event) {
      const receipt = (event as CustomEvent<MoniReceiptEvent>).detail
      setReceipts((current) => [receipt, ...current].slice(0, 3))
    }
    window.addEventListener(RECEIPT_EVENT, receive)
    return () => window.removeEventListener(RECEIPT_EVENT, receive)
  }, [])

  if (receipts.length === 0) return null

  return (
    <Panel aria-labelledby="recent-work-heading">
      <PanelHeader
        icon={ReceiptText}
        titleId="recent-work-heading"
        title="អ្វីដែល Moni ទើបធ្វើឱ្យអ្នក"
      />
      <PanelRows>
        {receipts.map((receipt) => (
          <PanelRow key={receipt.id}>
            <div className="flex items-start gap-2 px-3 py-3 sm:px-4">
              {receipt.status === 'failed' ? (
                <CircleAlert className="mt-1 size-4 shrink-0 text-ink" strokeWidth={2} aria-hidden />
              ) : (
                <Check className="mt-1 size-4 shrink-0 text-seal" strokeWidth={2} aria-hidden />
              )}
              <div className="min-w-0">
                <p className="km text-sm font-semibold text-ink">{receipt.command}</p>
                <p className="km mt-0.5 text-sm text-rule">{receipt.summary}</p>
                <p className="km tnum mt-1 text-xs text-rule">{relativeCambodiaTime(receipt.createdAt)}</p>
              </div>
            </div>
          </PanelRow>
        ))}
      </PanelRows>
    </Panel>
  )
}
