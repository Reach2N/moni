/**
 * What to offer the owner as a starting point, chosen by what her shop is
 * missing rather than by a category she was made to pick first.
 *
 * The ask panel used to file her request into one of four tabs before she could
 * type, and the tab never left the browser: `/api/ask` is posted the text and
 * nothing else. So the taxonomy bought the product nothing and cost her a
 * decision every time. The agent routes intent itself; this file only decides
 * which two or three sentences are worth putting in front of a shop in this
 * state, the same way `queries/signals.ts` decides what the notice board says.
 *
 * There is no `server-only` import here on purpose. See CLAUDE.md: that import
 * makes a module unimportable from `db/test.mjs`, and a rule nothing can prove
 * is a rule that quietly stops being true.
 */
import { ASK_CATEGORIES } from './categories.ts'
import type { Sells } from '../types.ts'

export type SuggestionIcon = 'catalogue' | 'photo' | 'money' | 'day' | 'week' | 'checklist'

export type AskSuggestion = {
  id: string
  icon: SuggestionIcon
  /** The sentence she sends, in her words. */
  text: string
  /**
   * Whether running it can change the shop, authored here rather than guessed
   * from her typing. It is what decides whether Moni asks before it acts, and
   * the tabs it replaces were guessing: an owner on the wrong tab could change
   * a price with no confirmation at all.
   */
  writes: boolean
}

/**
 * The shop facts the ranking reads. Every one of them is already loaded by the
 * dashboard, so nothing here costs a round trip that was not already paid for.
 */
export type ShopNeeds = {
  sells: Sells
  /** Active rows in `v_catalog`: services and products together, because a cafe has no services. */
  catalogueCount: number
  /** Active `products` rows. A service cannot hold a photo, so it cannot want one. */
  productCount: number
  /** Those product rows carrying a photo. */
  photoCount: number
  /** `businesses.khqr_account_id` is set: the shop can be paid into its own account. */
  hasPaymentAccount: boolean
  /** At least one channel row says connected. */
  hasLiveChannel: boolean
}

/** How many of the ranked needs may crowd out her day. */
const MAX_NEEDS = 2
const MAX_SUGGESTIONS = 3

/**
 * Reads, in rank order. They answer correctly against any shop, which is what
 * makes them the fallback: a shop with nothing missing still has a day to run.
 */
const ALWAYS: readonly AskSuggestion[] = [
  { id: 'day', icon: 'day', text: ASK_CATEGORIES[2].examples[0], writes: false },
  { id: 'owed', icon: 'money', text: ASK_CATEGORIES[2].examples[2], writes: false },
  { id: 'week', icon: 'week', text: ASK_CATEGORIES[2].examples[1], writes: false },
]

/**
 * Ranked worst first, and none of them carries an invented value.
 *
 * `categories.ts` records why that matters: its two operate chips shipped the
 * literal booking codes from `db/seed.sql`, so an owner who tapped one sent a
 * code her shop had never issued. The same trap is in its Bakong example
 * (`sokha@wing`) and its sample menu, so those are stated as intent here and
 * Moni asks her for the values. A starting point that cannot work is worse than
 * an empty box.
 */
function needs(shop: ShopNeeds): AskSuggestion[] {
  const ranked: AskSuggestion[] = []

  if (shop.catalogueCount === 0) {
    ranked.push({
      id: 'catalogue',
      icon: 'catalogue',
      text: shop.sells === 'time' ? 'ខ្ញុំចង់បញ្ចូលបញ្ជីសេវាកម្ម' : 'ខ្ញុំចង់បញ្ចូលម៉ឺនុយហាង',
      writes: true,
    })
  }

  // A photo is a product's, never a service's, so a salon with no products is
  // not missing one. Asked only once there is something to photograph.
  if (shop.productCount > 0 && shop.photoCount === 0) {
    ranked.push({
      id: 'photos',
      icon: 'photo',
      text: 'បង្កើតរូបភាពសម្រាប់មុខដែលគ្មានរូបភាព',
      writes: true,
    })
  }

  if (!shop.hasPaymentAccount) {
    ranked.push({
      id: 'payment',
      icon: 'money',
      text: 'ខ្ញុំចង់កំណត់គណនី Bakong ដើម្បីទទួលប្រាក់',
      writes: true,
    })
  }

  // A channel is wired on `/app/channels`, not by the agent, so this asks Moni
  // what is left rather than promising work it cannot do.
  if (!shop.hasLiveChannel) {
    ranked.push({
      id: 'setup-status',
      icon: 'checklist',
      text: ASK_CATEGORIES[0].examples[0],
      writes: false,
    })
  }

  return ranked
}

/**
 * Two or three starting points, worst need first, always leaving room for a read.
 *
 * Pure and total: the same shop state gives the same list in the same order on
 * every render, because a row that moves under her thumb is a row she stops
 * trusting.
 */
export function askSuggestions(shop: ShopNeeds): AskSuggestion[] {
  const ranked = needs(shop).slice(0, MAX_NEEDS)
  const chosen = [...ranked]
  for (const read of ALWAYS) {
    if (chosen.length >= MAX_SUGGESTIONS) break
    if (chosen.some((suggestion) => suggestion.id === read.id)) continue
    chosen.push(read)
  }
  return chosen
}
