// The owner's surface for the demo.
//
// World: a Khmer market ledger. Warm paper, deep ink, one gilt accent taken from
// shop signage and temple leaf, forest green reserved for money that has landed,
// clay red reserved for the one thing that needs a human. No purple, no cyan.
// Display voice is Khmer OS Muol Light; the working voice is Busra.
// Nav is five slots with a raised Shop button in the middle, because the app
// serves retail and service businesses alike: catalogue, orders, calendar, agent.
const { sb, ic, logo, page } = require('./lib.cjs');

const kd = (s) => String(s).replace(/[0-9]/g, (d) => '០១២៣៤៥៦៧៨៩'[d]);

const C = {
  ink: '#14181C', ink2: '#232A31', paper: '#F6F4EF', surf: '#FFFFFF',
  line: '#E5E0D6', dim: '#6D6A62', text: '#1B1F24',
  gold: '#A9761E', goldL: '#E8B455', goldS: '#F7EEDC',
  green: '#1B6B45', greenS: '#E7F1EA',
  clay: '#A93B2B', clayS: '#F8EAE7',
};

const g = (d, c = C.dim, w = 18, sw = 1.7) =>
  `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const gl = {
  agent: (c, w) => g('<path d="M20.5 11.4a8 8 0 0 1-8.5 8 8.2 8.2 0 0 1-3.6-.85L3.5 20l1.4-4.4a8 8 0 0 1 7.1-11.6 8 8 0 0 1 8.5 7.4z"/><path d="M12 7.8c.5 2 1.1 2.6 3.1 3.1-2 .5-2.6 1.1-3.1 3.1-.5-2-1.1-2.6-3.1-3.1 2-.5 2.6-1.1 3.1-3.1z"/>', c, w),
  receipt: (c, w) => g('<path d="M5 3.5h14v17l-2.3-1.6-2.4 1.6-2.3-1.6-2.4 1.6L7.3 19 5 20.5z"/><path d="M9 8.5h6M9 12.5h6"/>', c, w),
  shop: (c, w) => g('<path d="M4 9.5h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M3.2 9.5 5 3.5h14l1.8 6a3 3 0 0 1-5.6 1.6 3 3 0 0 1-5.4 0 3 3 0 0 1-5.6-1.6z"/><path d="M9.8 20.5v-5.2h4.4v5.2"/>', c, w),
  tag: (c, w) => g('<path d="M3.5 11.6V4.2a.7.7 0 0 1 .7-.7h7.4a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7z"/><circle cx="7.8" cy="7.8" r="1.4"/>', c, w),
  cal: (c, w) => g('<rect x="3.2" y="4.6" width="17.6" height="16.2" rx="2.4"/><path d="M3.2 9.8h17.6M8.2 2.6v4.2M15.8 2.6v4.2"/>', c, w),
  bell: (c, w) => g('<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>', c, w),
  truck: (c, w) => g('<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M14 9h4l4 4v4a1 1 0 0 1-1 1h-1"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>', c, w),
  check: (c, w) => g('<path d="M20 6 9 17l-5-5"/>', c, w, 2.3),
  chev: (c, w) => g('<path d="m9 5 7 7-7 7"/>', c, w, 2.1),
  phone: (c, w) => g('<path d="M6.6 3h3l1.6 4-2 1.4a12 12 0 0 0 6.4 6.4l1.4-2 4 1.6v3A2 2 0 0 1 19 19.4 16.6 16.6 0 0 1 4.6 5 2 2 0 0 1 6.6 3Z"/>', c, w),
  send: (c, w) => g('<path d="m22 2-7 20-4-9-9-4z"/>', c, w),
  more: (c, w) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="${c}"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`,
  leaf: (c, w) => g('<path d="M12 3.5c3.4 2 5.4 4.4 5.4 7.4 0 3.4-2.4 5.9-5.4 5.9s-5.4-2.5-5.4-5.9c0-3 2-5.4 5.4-7.4z"/><path d="M12 8.6v11.9"/>', c, w),
};

const css = `
body{background:${C.paper}}
.screen{background:${C.paper};color:${C.text}}
.km{font-family:Busra,-apple-system,"Helvetica Neue",sans-serif;line-height:1.75}
.dp{font-family:-apple-system,"SF Pro Display","Khmer OS Muol Light",sans-serif;letter-spacing:-.1px}
.tn{font-variant-numeric:tabular-nums}
.top{background:${C.ink};padding:0 18px 18px;color:${C.paper}}
.top .sb{margin:0 -18px}
.brandrow{display:flex;align-items:center;gap:11px;padding:4px 0 13px}
.brandrow .nm{font-size:15px;font-weight:600;letter-spacing:.2px;color:${C.goldL}}
.brandrow .sh{font-size:12px;color:#B8B2A4;margin-top:1px}
.brandrow .rt{margin-left:auto;display:flex;align-items:center;gap:15px}
.bdot{position:relative}
.bdot:after{content:"";position:absolute;top:-1px;right:-1px;width:8px;height:8px;border-radius:50%;background:${C.goldL};border:2px solid ${C.ink}}
.kpis{display:flex;border:1px solid rgba(232,180,85,.28);background:rgba(232,180,85,.07)}
.kpi{flex:1;padding:9px 13px;border-right:1px solid rgba(232,180,85,.22)}
.kpi:last-child{border-right:0}
.kpi .k{font-size:10.5px;color:#B8B2A4}
.kpi .v{font-size:21px;font-weight:600;letter-spacing:-.4px;margin-top:1px;color:${C.paper}}
.kpi .v small{font-size:13px;opacity:.7}
.sec{display:flex;align-items:baseline;gap:9px;padding:13px 18px 7px}
.sec .t{font-size:13.5px;font-weight:400;font-family:-apple-system,"SF Pro Display","Khmer OS Muol Light",sans-serif;letter-spacing:.1px}
.sec .n{font-size:11px;color:${C.dim}}
.sec .a{margin-left:auto;font-size:11.5px;color:${C.gold};font-weight:600;display:flex;align-items:center;gap:3px;align-self:center}
.card{background:${C.surf};border:1px solid ${C.line};margin:0 18px 12px}
.row{display:flex;align-items:center;gap:12px;padding:10px 15px;border-bottom:1px solid ${C.line}}
.row:last-child{border-bottom:0}
.row.hot{background:${C.goldS}}
.av{position:relative;flex:none}
.av .bdg{position:absolute;right:-3px;bottom:-3px;border-radius:50%;border:2px solid ${C.surf};line-height:0}
.hot .av .bdg{border-color:${C.goldS}}
.nm{font-size:14px;font-weight:600;letter-spacing:-.1px}
.sn{font-size:12px;color:${C.dim};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:236px}
.rt{margin-left:auto;text-align:right;flex:none}
.tm{font-size:10.5px;color:${C.dim}}
.pill{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;padding:3px 8px;margin-top:5px}
.pill.ok{background:${C.greenS};color:${C.green}}
.pill.wn{background:${C.clayS};color:${C.clay}}
.pill.gd{background:${C.ink};color:${C.goldL}}
.nav{position:absolute;bottom:0;left:0;right:0;height:78px;background:${C.surf};border-top:1px solid ${C.line};display:flex;align-items:flex-start;padding:9px 0 14px}
.nav div{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;font-size:9.5px;color:${C.dim}}
.nav div.on{color:${C.ink};font-weight:600}
.homebtn{position:absolute;left:50%;bottom:34px;transform:translateX(-50%);width:60px;height:60px;border-radius:50%;background:${C.ink};display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(20,24,28,.34);border:3px solid ${C.surf}}
.homelb{position:absolute;left:0;right:0;bottom:16px;text-align:center;font-size:9.5px;font-weight:600;color:${C.ink}}
.btn{display:flex;align-items:center;justify-content:center;gap:9px;background:${C.ink};color:${C.goldL};font-size:14.5px;font-weight:600;height:50px;margin:0 18px 10px}
.btn2{display:flex;align-items:center;justify-content:center;gap:8px;background:${C.surf};border:1px solid ${C.line};color:${C.text};font-size:13.5px;font-weight:600;height:46px;margin:0 18px 12px}
.kv{display:flex;justify-content:space-between;gap:14px;padding:11px 15px;border-bottom:1px solid ${C.line};font-size:12.5px}
.kv:last-child{border-bottom:0}
.kv .k{color:${C.dim}}
.kv .v{font-weight:600;text-align:right}
`;

const chBadge = { messenger: logo.messenger, instagram: logo.instagram, telegram: logo.telegram, facebook: logo.facebook };
const face = (letter, bg, size = 42) =>
  `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:${C.surf};display:flex;align-items:center;justify-content:center;font-size:${size * 0.4}px;font-weight:600" class="km">${letter}</div>`;
const av = (letter, bg, ch) => `<div class="av">${face(letter, bg)}<span class="bdg">${chBadge[ch](19)}</span></div>`;

const nav = (on) => `<div class="nav">
  <div class="${on === 0 ? 'on' : ''}">${gl.agent(on === 0 ? C.ink : C.dim, 21)}<span class="km">ជំនួយការ</span></div>
  <div class="${on === 1 ? 'on' : ''}">${gl.receipt(on === 1 ? C.ink : C.dim, 21)}<span class="km">ការកម្មង់</span></div>
  <div></div>
  <div class="${on === 3 ? 'on' : ''}">${gl.tag(on === 3 ? C.ink : C.dim, 21)}<span class="km">កាតាឡុក</span></div>
  <div class="${on === 4 ? 'on' : ''}">${gl.cal(on === 4 ? C.ink : C.dim, 21)}<span class="km">កាលវិភាគ</span></div>
  <div class="homebtn">${gl.shop(C.goldL, 27, 1.6)}</div>
  <div class="homelb km">ហាង</div>
</div>`;

const topBar = (extra = '') => `<div class="top">
  ${sb('light')}
  <div class="brandrow">${logo.moni(38)}
    <div><div class="nm dp">MONI</div><div class="sh km">ហាងស្បែកជើង សុភា</div></div>
    <div class="rt"><span class="bdot">${gl.bell(C.paper, 20)}</span>${gl.more(C.paper, 19)}</div>
  </div>${extra}
</div>`;

/* ------------------------------------------------------------------- inbox */
const inbox = () => page(css, `
${topBar(`<div class="kpis">
  <div class="kpi"><div class="k km">សារបានឆ្លើយ</div><div class="v km tn">${kd(24)}</div></div>
  <div class="kpi"><div class="k km">ការកម្មង់</div><div class="v km tn">${kd(3)}</div></div>
  <div class="kpi"><div class="k km">ចំណូលថ្ងៃនេះ</div><div class="v km tn">${kd('138.50')}<small>$</small></div></div>
</div>`)}
<div class="sec"><span class="t km">សារចូល</span><span class="n km">គ្រប់បណ្តាញ</span><span class="a km">មើលទាំងអស់ ${gl.chev(C.gold, 12)}</span></div>
<div class="card">
  <div class="row hot">
    ${av('រ', '#2F6F9E', 'telegram')}
    <div style="min-width:0"><div class="nm km">រតនា</div><div class="sn km">បង់រួចហើយបង · ៤៦.៥០$</div></div>
    <div class="rt"><div class="tm km">ឥឡូវនេះ</div><div class="pill ok km">${gl.check(C.green, 11)} Moni ឆ្លើយហើយ</div></div>
  </div>
  <div class="row">
    ${av('ស', '#8A6A9B', 'messenger')}
    <div style="min-width:0"><div class="nm km">ស្រីពៅ</div><div class="sn km">យក ១ គូបាទ ខ្ញុំបង់តាម KHQR</div></div>
    <div class="rt"><div class="tm km">${kd(2)} នាទី</div><div class="pill ok km">${gl.check(C.green, 11)} Moni ឆ្លើយហើយ</div></div>
  </div>
  <div class="row">
    ${av('ដ', '#B4553F', 'instagram')}
    <div style="min-width:0"><div class="nm">dara.vireak</div><div class="sn km">ដឹកទៅសៀមរាបបានទេ?</div></div>
    <div class="rt"><div class="tm km">${kd(9)} នាទី</div><div class="pill ok km">${gl.check(C.green, 11)} Moni ឆ្លើយហើយ</div></div>
  </div>
  <div class="row">
    ${av('ច', '#8C7A46', 'messenger')}
    <div style="min-width:0"><div class="nm km">ចាន់ថា</div><div class="sn km">សុំបញ្ចុះតម្លៃទិញ ៥ គូបានទេ?</div></div>
    <div class="rt"><div class="tm km">${kd(14)} នាទី</div><div class="pill wn km">ត្រូវការអ្នក</div></div>
  </div>
</div>
<div class="card" style="border-top:0;margin-top:-12px;background:${C.goldS};display:flex;align-items:center;gap:10px;padding:12px 15px">
  ${logo.moni(20)}<span class="km" style="font-size:12px;color:${C.gold};line-height:1.6">Moni បានឆ្លើយ ២៤ សារថ្ងៃនេះ<br><span style="color:${C.dim}">អ្នកបានចូលមើលតែ ១ ដង</span></span>
</div>
${nav(0)}`);

/* -------------------------------------------------------------- order paid */
const orderPaid = () => page(css, `
${topBar(`<div style="border:1px solid rgba(27,107,69,.5);background:rgba(27,107,69,.16);padding:14px 15px;display:flex;align-items:flex-start;gap:13px">
  <div style="width:34px;height:34px;border-radius:50%;background:#2E9663;display:flex;align-items:center;justify-content:center;flex:none">${gl.check('#fff', 19)}</div>
  <div style="flex:1">
    <div class="km" style="font-size:12px;color:#95D3B2;font-weight:600">បានទទួលប្រាក់ តាម KHQR</div>
    <div class="km tn" style="font-size:31px;font-weight:600;letter-spacing:-1px;line-height:1.3;color:${C.paper}">${kd('46.50')}$</div>
    <div class="km" style="font-size:11px;color:#B8B2A4">រតនា · Telegram · ម៉ោង ១០:៤១ ព្រឹក</div>
  </div>
  <div class="km tn" style="font-size:11px;color:#B8B2A4">#${kd(1043)}</div>
</div>`)}
<div class="sec"><span class="t km">ត្រូវដឹកជញ្ជូន</span><span class="n km">ថ្ងៃនេះ</span><span class="a"><span class="pill gd km" style="margin:0">${gl.truck(C.goldL, 11)} ថ្មី</span></span></div>
<div class="card">
  <div class="row">
    <img src="../assets/shoe-hero.jpg" style="width:56px;height:56px;object-fit:cover;flex:none">
    <div style="min-width:0"><div class="nm km">ស្បែកជើងស Crystal White</div><div class="sn km">ទំហំ ៣៨ · ចំនួន ១ គូ</div></div>
    <div class="rt"><div class="nm km tn">${kd('45.00')}$</div><div class="tm km tn">+ដឹក ${kd('1.50')}$</div></div>
  </div>
  <div class="kv"><span class="k km">អតិថិជន</span><span class="v km tn">រតនា · ០១២ ៣៤៥ ៦៧៨</span></div>
  <div class="kv"><span class="k km">អាសយដ្ឋាន</span><span class="v km">ផ្ទះ ២៤ ផ្លូវ ២៧១ សង្កាត់ទួលទំពូង<br>ខណ្ឌចំការមន រាជធានីភ្នំពេញ</span></div>
</div>
<div class="btn km">${gl.truck(C.goldL, 19)} បញ្ជូនទៅអ្នកដឹកជញ្ជូន</div>
<div class="btn2 km">${gl.phone(C.text, 16)} ទូរស័ព្ទទៅអតិថិជន</div>
${nav(1)}`);

/* ---------------------------------------------------------------- takeover */
const takeover = () => page(css, `
${sb('dark')}
<div style="background:${C.surf};border-bottom:1px solid ${C.line};display:flex;align-items:center;gap:12px;padding:8px 16px 12px">
  ${ic.back(C.text, 12)}
  <div class="av" style="margin-left:2px">${face('ច', '#8C7A46', 40)}<span class="bdg">${logo.messenger(18)}</span></div>
  <div><div class="nm km" style="font-size:15px">ចាន់ថា</div><div class="sn km">Messenger · អតិថិជនថ្មី</div></div>
  <div style="margin-left:auto">${gl.phone(C.text, 19)}</div>
</div>
<div style="background:${C.clayS};border-bottom:1px solid #EBD8D3;display:flex;align-items:center;gap:9px;padding:11px 16px;font-size:11.5px;color:${C.clay}" class="km">
  ${gl.bell(C.clay, 16)}<span><b>ត្រូវការអ្នក៖</b> សំណើតម្លៃដុំ Moni មិនសម្រេចជំនួសអ្នកទេ</span>
</div>
<div style="padding:16px 16px 0;display:flex;flex-direction:column;gap:9px;justify-content:flex-end;height:calc(720px - 54px - 61px - 42px - 146px);background:${C.paper}">
  <div class="km" style="max-width:76%;background:${C.surf};border:1px solid ${C.line};padding:10px 14px;font-size:14px">សួស្តីបង ខ្ញុំចង់ទិញ ៥ គូសម្រាប់ហាងខ្ញុំ តម្លៃដុំមានទេ?</div>
  <div class="km" style="max-width:76%;align-self:flex-end;background:${C.ink};color:${C.paper};padding:10px 14px;font-size:14px">សួស្តីបង សម្រាប់ការទិញច្រើន ខ្ញុំនឹងឲ្យម្ចាស់ហាងឆ្លើយផ្ទាល់បាទ</div>
  <div class="km" style="align-self:flex-end;display:flex;align-items:center;gap:5px;font-size:10.5px;color:${C.dim}">${logo.moni(13)} Moni បានបញ្ជូនបន្តទៅអ្នក · ១ នាទីមុន</div>
  <div class="km" style="max-width:76%;background:${C.surf};border:1px solid ${C.line};padding:10px 14px;font-size:14px">បាទ ខ្ញុំរង់ចាំ</div>
</div>
<div style="position:absolute;bottom:78px;left:0;right:0;padding:12px 16px 14px;background:${C.paper}">
  <div style="display:flex;gap:8px;margin-bottom:10px">
    <div class="km" style="background:${C.goldS};border:1px solid #EAD9B4;color:${C.gold};font-size:11.5px;font-weight:600;padding:7px 12px">${gl.leaf(C.gold, 12)} ទិញ ៥ គូ ៤២$/គូ</div>
    <div class="km" style="background:${C.surf};border:1px solid ${C.line};font-size:11.5px;padding:7px 12px">សុំលេខទូរស័ព្ទ</div>
  </div>
  <div style="display:flex;align-items:center;gap:11px;background:${C.surf};border:1px solid ${C.line};height:48px;padding:0 8px 0 15px">
    <span class="km" style="flex:1;font-size:14px;color:${C.dim}">ឆ្លើយជំនួស Moni…</span>
    <div style="width:36px;height:36px;background:${C.ink};display:flex;align-items:center;justify-content:center">${gl.send(C.goldL, 17)}</div>
  </div>
</div>
${nav(0)}`);

/* ------------------------------------------------------------- connections */
const connections = () => {
  const row = (mark, name, handle, on, note) => `<div class="row">
    <div class="av">${mark(42)}</div>
    <div style="min-width:0"><div class="nm">${name}</div><div class="sn km">${handle}</div></div>
    <div class="rt">${on
      ? `<div class="pill ok km" style="margin:0">${gl.check(C.green, 11)} ភ្ជាប់រួច</div>`
      : `<div class="pill gd km" style="margin:0">${note}</div>`}</div>
  </div>`;
  return page(css, `
${topBar(`<div style="display:flex;align-items:center;gap:13px;border:1px solid rgba(232,180,85,.3);background:rgba(232,180,85,.08);padding:13px 15px">
  <div style="width:34px;height:34px;background:${C.goldL};display:flex;align-items:center;justify-content:center;flex:none">${gl.shop(C.ink, 19)}</div>
  <div class="km" style="font-size:12.5px;line-height:1.7;color:${C.paper}">ភ្ជាប់ម្តង ឆ្លើយគ្រប់កន្លែង<br><span style="color:#B8B2A4;font-size:11px">អតិថិជនសរសេរមកបណ្តាញណាក៏បាន Moni ឆ្លើយដូចគ្នា</span></div>
</div>`)}
<div class="sec"><span class="t km">បណ្តាញសារ</span><span class="n km">${kd(3)} ភ្ជាប់រួច</span></div>
<div class="card">
  ${row(logo.messenger, 'Messenger', 'ហាងស្បែកជើង សុភា', true)}
  ${row(logo.instagram, 'Instagram', '@sophea_shoes', true)}
  ${row(logo.telegram, 'Telegram', '@SopheaShoesBot', true)}
  ${row(logo.facebook, 'Facebook Marketplace', kd(12) + ' បញ្ជីលក់', false, 'ភ្ជាប់')}
</div>
<div class="sec"><span class="t km">ការទូទាត់ និងដឹកជញ្ជូន</span></div>
<div class="card">
  ${row((s) => `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${C.ink};display:flex;align-items:center;justify-content:center">${ic.qr(C.goldL)}</div>`, 'KHQR · Bakong', 'ABA · ០១២ ៣៤៥ ៦៧៨', true)}
  ${row(logo.grab, 'Grab Express', 'ដឹកជញ្ជូនក្នុងទីក្រុង', true)}
</div>
${nav(3)}`);
};

module.exports = { inbox, orderPaid, takeover, connections };
