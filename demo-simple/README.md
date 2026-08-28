# Moni · four core features, 1:1

Four square explainers, 1440 x 1440, one idea each, roughly 13 seconds. Light
register: warm paper, ink, one gilt accent, green only for the moment something
lands. Built to be understood without reading twice.

| Project | Length | The one idea |
|---|---|---|
| `s1-products` | 13s | You photograph it, Moni turns it into a catalogue entry. |
| `s2-reply` | 13s | A customer asks, Moni answers in 4 seconds, on any channel. |
| `s3-payment` | 13s | Moni sends the KHQR, they scan, the money lands, you are told. |
| `s4-metrics` | 14s | Three numbers, then the one thing to do about them. |

## The rule these follow

**One focal point at a time, dead centre.** Nothing sits in a corner, nothing
competes. Each piece is a headline, a single object in the middle of the frame,
and one line underneath. When the next idea arrives, the previous one leaves the
same spot rather than moving over to make room. That is why `s1` dissolves the
photo into the product card, `s3` replaces the QR with the paid confirmation,
and `s4` shows one number at a time instead of a row of three.

## Commands

```bash
node make.cjs                       # regenerate all four index.html files
npx hyperframes check s3-payment
npx hyperframes snapshot s3-payment --at 4.3,9
npx hyperframes render s3-payment --quality high --output renders/moni-s3-payment.mp4
```

Edit `make.cjs`, not the generated `index.html`. `kit.cjs` holds the shared
palette, type and layout shell.

## Where the other pieces live

- `../demo-motion` — the onboarding and agent orchestration piece, widescreen
  2560 x 1440, 41s. She writes one paragraph, five agents research and configure
  themselves, the assistant goes live.
- `../demo-agent` — the same four features told in detail on an agent console
  (tool calls, database writes, retries, guardrails), widescreen, 18s each.
  Denser than these squares on purpose.
- `../demo-frames` — 11 static 3:4 frames for cutting in After Effects.
