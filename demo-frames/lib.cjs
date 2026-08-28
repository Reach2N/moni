// Shared chrome, icons and CSS for the Moni demo frames.
// Design canvas is 432 x 576 pt (iPhone Pro Max width, cropped 3:4), scaled x2.5
// to 1080 x 1440 CSS px, then captured at deviceScaleFactor 2 -> 2160 x 2880.

const SHOP = 'ហាងស្បែកជើង សុភា';
const CUST = 'ស្រីពៅ';
const PROD = 'ស្បែកជើងស Crystal White';

const base = `
*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
html,body{width:1080px;height:1440px;overflow:hidden;background:#000}
body{font-family:-apple-system,"SF Pro Text","Helvetica Neue",Arial,"Khmer Sangam MN",sans-serif}
.km{font-family:-apple-system,"SF Pro Text","Helvetica Neue","Khmer Sangam MN",sans-serif;line-height:1.75}
.screen{position:absolute;top:0;left:0;width:540px;height:720px;transform:scale(2);transform-origin:0 0;overflow:hidden;background:#fff}
.sb{height:54px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 26px 6px;font-size:15px;font-weight:600;letter-spacing:.2px}
.sb .r{display:flex;align-items:center;gap:5px}
.spacer{flex:1}
img{display:block}
@font-face{font-family:Busra;src:url("../assets/fonts/Busra-Regular.woff2") format("woff2");font-weight:400}
@font-face{font-family:Busra;src:url("../assets/fonts/Busra-Medium.woff2") format("woff2");font-weight:500}
@font-face{font-family:Busra;src:url("../assets/fonts/Busra-SemiBold.woff2") format("woff2");font-weight:600}
@font-face{font-family:Busra;src:url("../assets/fonts/Busra-Bold.woff2") format("woff2");font-weight:700}
`;

// iOS status bar. tone: 'dark' glyphs on light, 'light' glyphs on dark
const sb = (tone = 'dark', time = '10:24') => {
  const c = tone === 'dark' ? '#000' : '#fff';
  return `<div class="sb" style="color:${c}">
  <span>${time}</span>
  <span class="r">
    <svg width="18" height="12" viewBox="0 0 18 12" fill="${c}"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M1 4.2A10.5 10.5 0 0 1 15 4.2" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/><path d="M3.6 7A6.8 6.8 0 0 1 12.4 7" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="10" r="1.4" fill="${c}"/></svg>
    <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x=".7" y=".7" width="21" height="10.6" rx="3" stroke="${c}" stroke-opacity=".4" stroke-width="1.2"/><rect x="2.4" y="2.4" width="15" height="7.2" rx="1.8" fill="${c}"/><path d="M23.4 4.2v3.6c1.1-.3 1.6-.9 1.6-1.8s-.5-1.5-1.6-1.8Z" fill="${c}" fill-opacity=".5"/></svg>
  </span>
</div>`;
};

const ic = {
  back: (c = '#0F172A', w = 12) => `<svg width="${w}" height="${w * 1.7}" viewBox="0 0 12 20" fill="none"><path d="M10 2 2 10l8 8" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  phone: (c) => `<svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M6.6 3h3l1.6 4-2 1.4a12 12 0 0 0 6.4 6.4l1.4-2 4 1.6v3A2 2 0 0 1 19 19.4 16.6 16.6 0 0 1 4.6 5 2 2 0 0 1 6.6 3Z" stroke="${c}" stroke-width="1.9" stroke-linejoin="round"/></svg>`,
  video: (c) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="6" width="12.5" height="12" rx="3" stroke="${c}" stroke-width="1.9"/><path d="M15 11.2l5.2-3.1c.6-.4 1.3.1 1.3.8v6.2c0 .7-.7 1.2-1.3.8L15 12.8Z" stroke="${c}" stroke-width="1.9" stroke-linejoin="round"/></svg>`,
  info: (c) => `<svg width="21" height="21" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.2" stroke="${c}" stroke-width="1.9"/><path d="M12 10.6v6" stroke="${c}" stroke-width="2.1" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.2" fill="${c}"/></svg>`,
  dots3: (c) => `<svg width="20" height="6" viewBox="0 0 20 6" fill="${c}"><circle cx="3" cy="3" r="2.4"/><circle cx="10" cy="3" r="2.4"/><circle cx="17" cy="3" r="2.4"/></svg>`,
  check2: (c, w = 16) => `<svg width="${w}" height="${w * 0.62}" viewBox="0 0 16 10" fill="none"><path d="M1 5.6 4.2 8.8 10.4 1.6" stroke="${c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.6 8.4 14.8 1.4" stroke="${c}" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  bolt: (c, w = 13) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="${c}"><path d="M13.4 2 4 13.6h5.6L8.6 22 20 10.2h-5.8L13.4 2Z"/></svg>`,
  chevR: (c, w = 8) => `<svg width="${w}" height="${w * 1.7}" viewBox="0 0 8 14" fill="none"><path d="M1.4 1.4 6.6 7l-5.2 5.6" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plus: (c) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  camera: (c) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3.5 8.4h3.2l1.5-2.2h7.6l1.5 2.2h3.2v10.4H3.5Z" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13.2" r="3.4" stroke="${c}" stroke-width="1.8"/></svg>`,
  gallery: (c) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3.2" y="4.6" width="17.6" height="14.8" rx="3" stroke="${c}" stroke-width="1.8"/><circle cx="8.4" cy="9.6" r="1.7" fill="${c}"/><path d="m4.6 17.6 5-5 4.4 4.4 2.6-2.4 3.6 3.4" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  mic: (c) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" stroke="${c}" stroke-width="1.8"/><path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0M12 17.8V21" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  send: (c) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="${c}"><path d="M3 11.4 20.4 3.6c.8-.4 1.6.4 1.2 1.2L13.8 22c-.4.8-1.6.7-1.8-.2l-1.4-6.4-6.4-1.4c-.9-.2-1-1.4-.2-1.6Z"/></svg>`,
  qr: (c) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="${c}" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="${c}" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="${c}" stroke-width="2"/><path d="M14 14h3v3h-3zM19.5 19.5H21V21h-1.5z" fill="${c}"/></svg>`,
  pin: (c, w = 14) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none"><path d="M12 21.5s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" stroke="${c}" stroke-width="1.9" stroke-linejoin="round"/><circle cx="12" cy="10.2" r="2.6" stroke="${c}" stroke-width="1.9"/></svg>`,
  box: (c, w = 14) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none"><path d="M12 2.8 21 7v10l-9 4.2L3 17V7Z" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 7l9 4.2L21 7M12 11.2v10" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  user: (c, w = 14) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.4" r="4.2" stroke="${c}" stroke-width="1.9"/><path d="M4.4 20.4a7.6 7.6 0 0 1 15.2 0" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  clock: (c, w = 14) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="${c}" stroke-width="1.9"/><path d="M12 6.8V12l3.4 2.2" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  inbox: (c, w = 16) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none"><path d="M3 13.4 5.6 4.4h12.8L21 13.4v5.2H3Z" stroke="${c}" stroke-width="1.9" stroke-linejoin="round"/><path d="M3 13.4h5a4 4 0 0 0 8 0h5" stroke="${c}" stroke-width="1.9" stroke-linejoin="round"/></svg>`,
  cal: (c, w = 16) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none"><rect x="3.4" y="5" width="17.2" height="15.6" rx="2" stroke="${c}" stroke-width="1.9"/><path d="M3.4 10h17.2M8 3v4M16 3v4" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  money: (c, w = 16) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none"><rect x="2.6" y="5.6" width="18.8" height="12.8" rx="2" stroke="${c}" stroke-width="1.9"/><circle cx="12" cy="12" r="3" stroke="${c}" stroke-width="1.9"/></svg>`,
  gear: (c, w = 16) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3.2" stroke="${c}" stroke-width="1.9"/><path d="M12 2.6v2.6M12 18.8v2.6M21.4 12h-2.6M5.2 12H2.6M18.6 5.4l-1.9 1.9M7.3 16.7l-1.9 1.9M18.6 18.6l-1.9-1.9M7.3 7.3 5.4 5.4" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/></svg>`,
};

// Brand marks, drawn rather than copied, at mockup fidelity.
const logo = {
  messenger: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 36 36"><defs><linearGradient id="mg${s}" x1=".3" y1="1" x2=".7" y2="0"><stop offset="0" stop-color="#0099FF"/><stop offset=".6" stop-color="#A033FF"/><stop offset="1" stop-color="#FF5280"/></linearGradient></defs><circle cx="18" cy="18" r="18" fill="url(#mg${s})"/><path d="M18 8c-5.6 0-10 4.1-10 9.6 0 3.1 1.4 5.9 3.7 7.6v3.7l3.4-1.9c.9.3 1.9.4 2.9.4 5.6 0 10-4.1 10-9.7S23.6 8 18 8Zm1 12.9-2.6-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.4 5.8Z" fill="#fff"/></svg>`,
  instagram: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 36 36"><defs><radialGradient id="ig${s}" cx=".3" cy="1.1" r="1.2"><stop offset="0" stop-color="#FFD776"/><stop offset=".25" stop-color="#F3A03B"/><stop offset=".5" stop-color="#E8385F"/><stop offset=".75" stop-color="#C32AA3"/><stop offset="1" stop-color="#7B4EE8"/></radialGradient></defs><rect width="36" height="36" rx="10" fill="url(#ig${s})"/><rect x="9" y="9" width="18" height="18" rx="6" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="18" cy="18" r="4.6" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="24.4" cy="11.8" r="1.5" fill="#fff"/></svg>`,
  telegram: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 36 36"><defs><linearGradient id="tg${s}" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="#37BBFE"/><stop offset="1" stop-color="#007DBB"/></linearGradient></defs><circle cx="18" cy="18" r="18" fill="url(#tg${s})"/><path d="M8.6 17.8 25 11.2c.9-.3 1.7.3 1.4 1.5l-2.8 13c-.2 1-.9 1.2-1.7.7l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.4-4.9 8.9-8c.4-.3-.1-.5-.6-.2l-11 6.9-4.7-1.5c-1-.3-1-1 .5-1.6Z" fill="#fff"/></svg>`,
  facebook: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="#1877F2"/><path d="M23.4 23.2 24.2 18h-5v-3.4c0-1.4.7-2.8 2.9-2.8h2.3V7.4S22.3 7 20.4 7c-4 0-6.6 2.4-6.6 6.8V18H9.2v5.2h4.6V36h5.4V23.2Z" fill="#fff"/></svg>`,
  grab: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="#00B14F"/><path d="M18 7.6c-5.4 0-9.6 3.7-9.6 8.9 0 3.4 2 6.2 5 7.6v4.3l4-2.5c.2 0 .4.1.6.1 5.4 0 9.6-3.7 9.6-8.9S23.4 7.6 18 7.6Zm4.6 12.2h-2.3v-.9a3.9 3.9 0 0 1-3 1.2c-2.6 0-4.6-2-4.6-4.7s2-4.7 4.7-4.7c2.7 0 4.6 1.8 4.6 4.6v4.5h.6Z" fill="#fff"/></svg>`,
  moni: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 36 36"><rect width="36" height="36" rx="9" fill="#14181C"/><rect x="3" y="3" width="30" height="30" rx="6.5" fill="none" stroke="#C08A2E" stroke-width="1"/><path d="M10.4 25.6V10.4h3.9l4.2 7.4 4.2-7.4h3.9v15.2h-3.6v-8.9l-3.6 6.3h-1.8l-3.6-6.3v8.9Z" fill="#E8B455"/></svg>`,
};

const avatar = (letter, bg, size = 36, fg = '#fff') =>
  `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-size:${size * 0.42}px;font-weight:600;flex:none">${letter}</div>`;

const photoAvatar = (src, size = 36, extra = '') =>
  `<img src="../assets/${src}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex:none;${extra}">`;

const page = (css, body, bg = '#fff') =>
  `<!doctype html><html lang="km"><head><meta charset="utf-8"><style>${base}${css}</style></head><body><div class="screen" style="background:${bg}">${body}</div></body></html>`;

module.exports = { base, sb, ic, logo, avatar, photoAvatar, page, SHOP, CUST, PROD };
