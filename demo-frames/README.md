# Moni demo frames

Eleven static 3:4 frames (2160 x 2880 px PNG) for the After Effects cut. One arc,
told from the shop owner's phone: a customer finds the listing, Moni answers on
whichever app they wrote to, the customer pays by KHQR, and the owner is told to
go and deliver. Under a minute at roughly five seconds a frame.

## The order

| # | File | Beat |
|---|------|------|
| 01 | `01-marketplace-listing` | The shop's own Marketplace listing. 8 new messages waiting. |
| 02 | `02-messenger-incoming` | A customer writes. Moni is composing. Nothing answered yet. |
| 03 | `03-messenger-autoreply` | Moni answered: stock, size, price, delivery. Tagged as auto-reply. |
| 04 | `04-instagram-dm` | Same shop, different app, same answer. Proof it is not one channel. |
| 05 | `05-telegram-khqr` | Moni sends the KHQR for 46.50$ with the order reference. |
| 06 | `06-telegram-paid` | Paid. The customer is told delivery is today. |
| 07 | `07-moni-inbox` | The owner's inbox: three answered, one flagged "needs you". |
| 08 | `08-moni-order-paid` | Money landed. Address, phone, and one button: send it out. |
| 09 | `09-moni-takeover` | The wholesale request Moni refused to decide. The owner replies. |
| 10 | `10-moni-connections` | Every channel wired to one assistant. |
| 11 | `11-grab-delivery` | The rider is on the way. |

02 to 03 and 05 to 06 are before/after pairs on an identical layout, so a cross
dissolve or a bubble slide-up animates cleanly with no re-registration.

## Specs

- 2160 x 2880 px, 3:4 portrait, sRGB PNG, no alpha.
- Authored at 540 x 720 pt, scaled x2, captured at deviceScaleFactor 2. Text is
  crisp at 100% in a 2160-wide comp and still holds at 150%.

## Design notes

- Platform chrome (Messenger, Instagram, Telegram, Facebook, Grab) is drawn to
  match each app so the frames read as screenshots. Those brand colours are
  quotations, not our palette.
- Moni's own world: warm paper, deep ink, one gilt accent, forest green only for
  money that has landed, clay red only for the one thing needing a person. No
  purple, no cyan anywhere in our surface.
- Khmer type: Khmer OS Muol Light for display, Busra for working text at
  line-height 1.75. Icons are authored SVG at one stroke weight, never emoji.
- Bottom navigation is five slots with a raised Shop button in the middle:
  ជំនួយការ (the agent), ការកម្មង់ (orders and invoices), ហាង (home), កាតាឡុក
  (products or services), កាលវិភាគ (calendar). The wording covers a retail shop
  and a booking business with no change.

## Rebuild

```bash
node build.cjs                 # writes build/*.html
./shoot.sh 07-moni-inbox       # re-renders one frame to out/
```

Frames live in `frames-chat.cjs` (Messenger, Instagram, Telegram),
`frames-moni.cjs` (the owner's app) and `frames-misc.cjs` (Marketplace, Grab).
Shared chrome, icons and brand marks are in `lib.cjs`.

## Credits

Product photograph: StockSnap.io, CC0 (public domain), no attribution required.
Kept at 960 px and never displayed above ~1000 px so it is never upscaled.
Busra is OFL, already vendored in this repo. Khmer OS Muol Light is installed
system-wide on this machine and would need bundling to build elsewhere.
