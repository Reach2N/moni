# Moni · getting started (motion)

A 41 second horizontal showcase at 2560 x 1440, 30fps. HyperFrames composition:
the whole piece is `index.html`, a seekable GSAP timeline over declared clips.

## The beats

| t | Beat |
|---|------|
| 0.0 | Title: ចាប់ផ្តើមក្នុងពីរនាទី |
| 3.6 | Step 1. The owner writes her shop in three plain Khmer lines, or speaks them. |
| 10.1 | The paragraph is handed across the wire to the agents. |
| 10.8 | Five agents in sequence: catalogue, opening hours, payment, delivery, channels. Each researches, then lands its result. |
| 21.2 | The assistant goes live: a customer asks, Moni answers, KHQR is paid. |
| 36.9 | End card: ភ្ជាប់ម្តង ឆ្លើយគ្រប់កន្លែង |

## Commands

```bash
npm run check                       # lint + runtime + layout + motion + contrast
npx hyperframes snapshot --at 8,16,22,27
npx hyperframes render --quality high --output moni-getting-started.mp4
npm run dev                         # Studio preview, edit on the timeline
```

## If you want it at 4K

Set `data-width="3840" data-height="2160"` on `#root`, the same values in the
`html,body` and `#root` CSS rules and the viewport meta, then re-render. Every
size in the sheet is in px against a 2560 grid, so scale them by 1.5 or wrap the
stage in a `transform: scale(1.5)` container.

## Fonts

Busra is bundled in `assets/fonts` and loaded through `@font-face`, so it renders
anywhere. Khmer OS Muol Light (the display voice on the two title cards and the
step numerals) is a **locally installed** font: `check` warns that it has no
deterministic mapping. A local render on this machine is correct; a Docker or
cloud render would substitute it. Bundle the file or swap those two lines to
Busra before rendering off this machine.
