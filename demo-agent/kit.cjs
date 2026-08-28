// Shared kit for the four agent-console compositions.
// One world: ink ground, warm paper surfaces, a single gilt accent, green only
// for state that landed, clay only for something that needs attention.
const W = 2560, H = 1440;

const CSSFOR = (p = "") => `
@font-face { font-family: Busra; src: url("${p}assets/fonts/Busra-Regular.woff2") format("woff2"); font-weight: 400 }
@font-face { font-family: Busra; src: url("${p}assets/fonts/Busra-Medium.woff2") format("woff2"); font-weight: 500 }
@font-face { font-family: Busra; src: url("${p}assets/fonts/Busra-SemiBold.woff2") format("woff2"); font-weight: 600 }
@font-face { font-family: Busra; src: url("${p}assets/fonts/Busra-Bold.woff2") format("woff2"); font-weight: 700 }
:root{
  --ink:#14181c; --ink2:#1b2126; --paper:#f6f4ef; --dim:#c3bdb0; --dim2:#9a958b;
  --gold:#e8b455; --gold-d:#a9761e; --green:#4bbd85; --green-d:#1b6b45; --clay:#e07a63;
  --line:rgba(232,180,85,.2); --line2:rgba(246,244,239,.11);
  --sans:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif;
  --km:Busra,-apple-system,sans-serif;
  --dp:-apple-system,"SF Pro Display","Khmer OS Muol Light",sans-serif;
  --mono:"SF Mono","JetBrains Mono",ui-monospace,monospace;
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0b0e11}
body{font-family:var(--sans);color:var(--paper)}
.km{font-family:var(--km);line-height:1.75}
.dp{font-family:var(--dp);letter-spacing:.4px}
.mono{font-family:var(--mono);letter-spacing:-.2px}
.tn{font-variant-numeric:tabular-nums}
#root{position:relative;width:${W}px;height:${H}px;overflow:hidden}
.clip{position:absolute;inset:0}

.bg{position:absolute;inset:0;background:var(--ink)}
.bg-wash{position:absolute;inset:0;background:radial-gradient(1500px 1000px at 70% 10%,rgba(232,180,85,.10),transparent 60%)}
.bg-grid{position:absolute;inset:0;opacity:.45;background-image:linear-gradient(rgba(246,244,239,.032) 1px,transparent 1px),linear-gradient(90deg,rgba(246,244,239,.032) 1px,transparent 1px);background-size:160px 160px}

/* header */
.hdr{position:absolute;left:80px;right:80px;top:56px;height:80px;display:flex;align-items:center;gap:22px;opacity:0}
.hdr .ttl{font-size:38px}
.hdr .sub{font-size:22px;color:var(--dim2);margin-top:2px}
.chip{margin-left:auto;display:flex;align-items:center;gap:14px;border:1px solid var(--line);padding:14px 24px;font-size:24px;color:var(--gold)}
.chip .pulse{width:14px;height:14px;border-radius:50%;background:var(--gold)}
.chip.ok{border-color:rgba(75,189,133,.55);color:var(--green)}
.chip.ok .pulse{background:var(--green)}
.chipdone{position:absolute;right:80px;top:56px;height:80px;display:flex;align-items:center;gap:14px;border:1px solid rgba(75,189,133,.55);padding:14px 24px;font-size:24px;color:var(--green);opacity:0}

/* panes */
.pane{position:absolute;border:1px solid var(--line2);background:rgba(246,244,239,.028);opacity:0}
.pane-h{height:84px;display:flex;align-items:center;gap:16px;padding:0 30px;border-bottom:1px solid var(--line2);font-size:24px;color:var(--dim)}
.pane-b{padding:30px}

/* conversation */
.who{display:flex;align-items:center;gap:14px;font-size:22px;color:var(--dim2);margin-bottom:12px}
.owner{border:1px solid var(--line2);background:rgba(246,244,239,.05);padding:24px 28px;font-size:28px;opacity:0}
.agent{padding:0 4px;font-size:28px;line-height:1.85}
.tok{opacity:0}
.caret{display:inline-block;width:4px;height:32px;background:var(--gold);vertical-align:-6px;margin-left:6px;opacity:0}
.attach{display:flex;align-items:center;gap:16px;margin-top:18px;border:1px solid var(--line2);padding:14px 18px}
.attach img{width:64px;height:64px;object-fit:cover}
.attach .t{font-size:22px;color:var(--dim)}

/* tool calls */
.tool{display:flex;align-items:center;gap:18px;padding:20px 0;border-bottom:1px solid var(--line2);opacity:0}
.tool:last-child{border-bottom:0}
.tool .ic{width:40px;height:40px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;flex:none;position:relative}
.tool .nm{font-size:24px;color:var(--paper)}
.tool .st{margin-left:auto;font-size:21px;color:var(--dim2);position:relative;min-width:250px;height:34px}
.tool .st .run{position:absolute;right:0;top:0;white-space:nowrap}
.tool .st .fin{position:absolute;right:0;top:0;white-space:nowrap;color:var(--green);opacity:0;display:flex;align-items:center;gap:10px}
.tprog{position:absolute;left:0;bottom:0;height:2px;background:var(--gold);width:100%;transform-origin:left center}

/* rows landing in a table */
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;font-size:21px;font-weight:500;color:var(--dim2);padding:0 0 16px;border-bottom:1px solid var(--line2)}
.tbl td{font-size:25px;padding:19px 0;border-bottom:1px solid var(--line2)}
.tbl tr.r{opacity:0}
.tbl td.g{color:var(--gold)}
.tbl td.d{color:var(--dim)}

/* warning */
.warn{display:flex;align-items:center;gap:20px;border:1px solid rgba(224,122,99,.5);background:rgba(224,122,99,.1);padding:22px 26px;font-size:24px;color:var(--clay);opacity:0}
.warn.fixed{border-color:rgba(75,189,133,.5);background:rgba(75,189,133,.1);color:var(--green)}
.warnfix{display:flex;align-items:center;gap:20px;border:1px solid rgba(75,189,133,.5);background:rgba(75,189,133,.1);padding:22px 26px;font-size:24px;color:var(--green);opacity:0}

/* result strip */
.done{display:flex;align-items:center;gap:20px;border:1px solid rgba(75,189,133,.5);background:rgba(75,189,133,.1);padding:26px 30px;font-size:28px;color:var(--green);opacity:0}

/* numbers and bars */
.stat{border:1px solid var(--line2);padding:26px 28px;opacity:0}
.stat .k{font-size:21px;color:var(--dim2)}
.stat .v{font-size:56px;font-weight:600;letter-spacing:-1.5px;margin-top:6px}
.stat .v small{font-size:26px;color:var(--dim)}
.foot{position:absolute;left:80px;right:80px;top:1206px;padding-top:26px;border-top:1px solid var(--line2);display:flex;align-items:center;gap:20px;font-size:26px;color:var(--dim);opacity:0}
.foot .tag{color:var(--gold)}
.ph{font-size:28px;color:var(--dim2);display:flex;align-items:center;gap:14px}
.bars{display:flex;align-items:flex-end;gap:20px;height:250px}
.barcol{flex:1;display:flex;flex-direction:column;align-items:center;gap:14px}
.bar{width:100%;background:var(--gold);transform-origin:bottom center}
.barcol .lb{font-size:20px;color:var(--dim2)}
`;

const ICONS = {
  mark: (s = 56) => `<svg width="${s}" height="${s}" viewBox="0 0 36 36"><rect width="36" height="36" rx="9" fill="#1b2126"/><rect x="3" y="3" width="30" height="30" rx="6.5" fill="none" stroke="#a9761e" stroke-width="1"/><path d="M10.4 25.6V10.4h3.9l4.2 7.4 4.2-7.4h3.9v15.2h-3.6v-8.9l-3.6 6.3h-1.8l-3.6-6.3v8.9Z" fill="#e8b455"/></svg>`,
  check: (c = '#4bbd85', s = 26) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  warn: (s = 30) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#e07a63" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18.4A2 2 0 0 0 3.5 21.4h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.4v4.4M12 17.4h.01"/></svg>`,
  gear: (s = 24, c = '#e8b455') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v2.6M12 18.8v2.6M21.4 12h-2.6M5.2 12H2.6M18.6 5.4l-1.9 1.9M7.3 16.7l-1.9 1.9M18.6 18.6l-1.9-1.9M7.3 7.3 5.4 5.4"/></svg>`,
  db: (s = 24, c = '#e8b455') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>`,
  eye: (s = 24, c = '#e8b455') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.8 12S5.5 5 12 5s10.2 7 10.2 7-3.7 7-10.2 7S1.8 12 1.8 12z"/><circle cx="12" cy="12" r="3.2"/></svg>`,
  msg: (s = 24, c = '#e8b455') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20.5l1.5-4.7A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"/></svg>`,
  qr: (s = 24, c = '#e8b455') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM19.5 19.5H21V21h-1.5z"/></svg>`,
  tag: (s = 24, c = '#e8b455') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11.6V4.2a.7.7 0 0 1 .7-.7h7.4a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7z"/><circle cx="7.8" cy="7.8" r="1.4"/></svg>`,
  chart: (s = 24, c = '#e8b455') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/></svg>`,
  send: (s = 24, c = '#4bbd85') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4z"/></svg>`,
};

// Streamed text: pre-split into chunks at build time so a seek never depends on
// runtime segmentation, and Khmer clusters are never cut apart.
const stream = (text) =>
  text.split(' ').map((c) => `<span class="tok">${c}</span>`).join(' ');

const tool = (id, icon, name, running, finished) => `
<div class="tool" id="${id}">
  <div class="ic">${icon}<div class="tprog" id="${id}-p"></div></div>
  <div class="nm mono">${name}</div>
  <div class="st km"><span class="run" id="${id}-run">${running}</span><span class="fin" id="${id}-fin">${ICONS.check('#4bbd85', 22)} ${finished}</span></div>
</div>`;

const page = ({ id, duration, extraCss = '', body, script, assets = '' }) => `<!doctype html>
<html lang="km">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"><\/script>
    <style>${CSSFOR(assets)}${extraCss}</style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-start="0" data-width="${W}" data-height="${H}" data-duration="${duration}" data-fps="30">
      <div id="bg" class="clip" data-start="0" data-duration="${duration}" data-track-index="0">
        <div class="bg"></div><div class="bg-grid"></div><div class="bg-wash"></div>
      </div>
      <div id="scene" class="clip" data-start="0" data-duration="${duration}" data-track-index="1" data-layout-allow-overlap>
${body}
      </div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const E = "power3.out";
      const say = (sel, t, step = 0.055) => tl.to(sel + " .tok", { opacity: 1, duration: 0.01, stagger: step, ease: "none" }, t);
      const rise = (sel, t, d = 0.55, y = 22) => tl.fromTo(sel, { y, opacity: 0 }, { y: 0, opacity: 1, duration: d, ease: E }, t);
      const runTool = (id, t, len) => {
        tl.fromTo("#" + id, { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: E }, t)
          .set("#" + id + "-p", { scaleX: 0 }, 0)
          .to("#" + id + "-p", { scaleX: 1, duration: len, ease: "power1.inOut" }, t + 0.15)
          .to("#" + id + "-run", { opacity: 0, duration: 0.25 }, t + len + 0.1)
          .to("#" + id + "-fin", { opacity: 1, duration: 0.35 }, t + len + 0.15)
          .to("#" + id + "-p", { opacity: 0, duration: 0.3 }, t + len + 0.2);
      };
${script}
      window.__timelines["${id}"] = tl;
    <\/script>
  </body>
</html>
`;

module.exports = { W, H, CSSFOR, ICONS, stream, tool, page };
