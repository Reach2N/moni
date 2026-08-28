# Moni · agent console (four videos)

Four horizontal pieces, 2560 x 1440 at 30fps, showing the agent actually working
in the UI: the owner talks, tools fire, rows land in the database, warnings
appear and get resolved, results arrive. Each is its own HyperFrames project so
`check`, `snapshot` and `render` all target it directly.

| Project | Length | What it shows |
|---|---|---|
| `v1-products` | 18s | Adding products. Vision reads 12 photos and a handwritten price list, the catalogue table fills row by row, image #7 is unreadable so the agent asks the owner, then writes 12 rows. |
| `v2-reply` | 18s | Replying to a customer. A guardrail fires ("never quote a price without checking data"), the agent searches the catalogue, checks stock, quotes, streams the draft, then sends. |
| `v3-payment` | 18s | Taking payment. Order created, KHQR generated, Bakong confirmation goes slow and retries 2 of 3, payment row written, owner notified. |
| `v4-metrics` | 19s | Observing performance. Seven days queried, three stat tiles, a per-day bar chart, a stock-out forecast warning, and a recommendation. |

## Editing

`kit.cjs` holds the shared world (palette, type, icons, the `tool()` row, the
streaming-text helper). `make.cjs` holds the four scripts and regenerates every
`index.html`:

```bash
node make.cjs                       # rewrite all four index.html files
npx hyperframes check v2-reply      # lint + runtime + layout + motion + contrast
npx hyperframes snapshot v2-reply --at 7,15
npx hyperframes render v2-reply --quality high --output renders/moni-v2-reply.mp4
```

**Edit `make.cjs`, not the generated `index.html`** — regenerating overwrites it.

## How the motion works

- **Streaming text** is pre-split into chunks at build time (`stream()`), then
  staggered on opacity. Nothing is segmented at runtime, so a seek to any frame
  is exact and Khmer clusters are never cut apart.
- **Tool rows** (`runTool`) share one shape: slide in, a gold progress rule fills
  under the icon, the running label swaps for a green result.
- **Warnings** enter in clay, then hard-swap to a green resolved banner via a
  zero-duration `set` at the beat boundary, so scrubbing backwards is clean.
- **Bars** animate `scaleY` from a `set` at t=0; heights are static CSS.

Only allowlisted properties are animated (opacity, x, y, scale), so every frame
is reproducible from a cold seek.

## Fonts

Busra is bundled per project under `assets/fonts` and loaded via `@font-face`.
These four use no Khmer OS Muol Light, so they render identically off this
machine (unlike `demo-motion`, which needs that system font).
