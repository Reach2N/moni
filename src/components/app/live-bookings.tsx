'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The dashboard's live feed, over our own SSE route.
 *
 * NOT Supabase Realtime. RLS here is deny-all with zero policies, so Realtime
 * would deliver the browser nothing, and making it work would mean opening the
 * Data API. ARCHITECTURE.md section 1 cancelled that, and this hook is what
 * replaces it.
 *
 * `EventSource` reconnects on its own when the server ends a long stream, which
 * is why the route closes politely rather than being held open forever.
 */
export type LiveBooking = {
  id: string
  code: string
  status: string
  starts_at: string
  ends_at: string
  customer_name: string | null
  service_name: string | null
  resource_name: string | null
  channel: string
  price_minor: number
  paid_minor: number
  currency: string
}

export function useLiveBookings(businessId: string) {
  const [arrived, setArrived] = useState<LiveBooking[]>([])
  const [connected, setConnected] = useState(false)
  const seen = useRef(new Set<string>())

  useEffect(() => {
    const source = new EventSource(`/api/stream/${businessId}`)

    const onReady = () => setConnected(true)
    const onBookings = (event: MessageEvent<string>) => {
      const rows = JSON.parse(event.data) as LiveBooking[]
      setArrived((current) => {
        const fresh = rows.filter((row) => !seen.current.has(`${row.id}:${row.status}`))
        for (const row of fresh) seen.current.add(`${row.id}:${row.status}`)
        if (fresh.length === 0) return current
        // Newest first: a booking that just landed is the one the owner wants.
        return [...fresh.reverse(), ...current].slice(0, 20)
      })
    }
    const onError = () => setConnected(false)

    source.addEventListener('ready', onReady)
    source.addEventListener('bookings', onBookings as EventListener)
    source.addEventListener('error', onError)

    return () => {
      source.removeEventListener('ready', onReady)
      source.removeEventListener('bookings', onBookings as EventListener)
      source.removeEventListener('error', onError)
      source.close()
    }
  }, [businessId])

  return { arrived, connected }
}
