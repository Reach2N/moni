import { Globe, MessageCircle, Phone, Send, Store } from 'lucide-react'

/**
 * One glyph per channel, so a mixed inbox is readable at a glance without
 * reading. Icons only, never emoji, per CLAUDE.md rule 10.
 */
const ICONS = {
  telegram: Send,
  messenger: MessageCircle,
  instagram: MessageCircle,
  web: Globe,
  walk_in: Store,
  phone: Phone,
} as const

const LABELS: Record<string, string> = {
  telegram: 'Telegram',
  messenger: 'Messenger',
  instagram: 'Instagram',
  web: 'គេហទំព័រ',
  walk_in: 'មកដល់ហាង',
  phone: 'ទូរស័ព្ទ',
}

export function ChannelIcon({ channel, className }: { channel: string; className?: string }) {
  const Icon = ICONS[channel as keyof typeof ICONS] ?? Globe
  return <Icon className={className ?? 'size-4'} strokeWidth={1.75} aria-label={LABELS[channel] ?? channel} />
}

export const channelLabel = (channel: string) => LABELS[channel] ?? channel
