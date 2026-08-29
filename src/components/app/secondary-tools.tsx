'use client'

import { startTransition, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircleMore, Settings2, X } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet.tsx'
import { ChatPanel } from './chat-panel.tsx'
import { ShopSetup } from './shop-setup.tsx'

function ToolSheetHeader({ title, description }: { title: string; description: string }) {
  return (
    <SheetHeader className="flex-row items-start justify-between gap-4 border-b border-hairline px-4 py-3">
      <div className="min-w-0">
        <SheetTitle className="km text-base font-semibold text-ink">{title}</SheetTitle>
        <SheetDescription className="km mt-0.5 text-sm text-rule">{description}</SheetDescription>
      </div>
      <SheetClose asChild>
        <Button type="button" variant="ghost" size="icon-lg" className="size-11 shrink-0 rounded-none" aria-label="បិទ">
          <X aria-hidden />
        </Button>
      </SheetClose>
    </SheetHeader>
  )
}

export function SecondaryTools() {
  const router = useRouter()
  const [setupOpen, setSetupOpen] = useState(false)

  /**
   * The notice board sends an owner with no catalogue here, so `#shop-setup` has
   * to actually open the setup sheet rather than scroll to a button she then has
   * to find and press. The hash is cleared on open so the same link works twice.
   */
  useEffect(() => {
    function openFromHash() {
      if (window.location.hash !== '#shop-setup') return
      setSetupOpen(true)
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    openFromHash()
    window.addEventListener('hashchange', openFromHash)
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [])

  const refresh = useCallback(() => {
    startTransition(() => router.refresh())
  }, [router])

  return (
    <div className="flex shrink-0 items-center">
      <Sheet open={setupOpen} onOpenChange={setSetupOpen}>
        <SheetTrigger asChild>
          <Button type="button" variant="ghost" size="icon-lg" className="size-11 rounded-none sm:w-auto sm:px-3" aria-label="រៀបចំហាង">
            <Settings2 data-icon="inline-start" aria-hidden />
            <span className="km hidden sm:inline">រៀបចំហាង</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" showCloseButton={false} className="w-full max-w-none gap-0 overscroll-contain bg-paper p-0 shadow-none transition-none sm:max-w-xl">
          <ToolSheetHeader title="រៀបចំហាង" description="ពិពណ៌នាហាងម្តង ហើយ Moni រៀបចំសេវា តម្លៃ ម៉ោង និងកន្លែងឱ្យ។" />
          <div className="min-h-0 flex-1 overflow-y-auto pt-4">
            <ShopSetup onSaved={refresh} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="ghost" size="icon-lg" className="size-11 rounded-none sm:w-auto sm:px-3" aria-label="សាកជាអតិថិជន">
            <MessageCircleMore data-icon="inline-start" aria-hidden />
            <span className="km hidden sm:inline">សាកជាអតិថិជន</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" showCloseButton={false} className="w-full max-w-none gap-0 overscroll-contain bg-paper p-0 shadow-none transition-none sm:max-w-xl">
          <ToolSheetHeader title="សាកជាអតិថិជន" description="ផ្ញើសារសាកល្បង ដើម្បីឃើញអ្វីដែលអតិថិជនរបស់អ្នកនឹងទទួល។" />
          <ChatPanel onChanged={refresh} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
