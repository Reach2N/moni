// Where the customer starts (the shop's own Marketplace listing) and where the
// arc ends (the paid order handed to a delivery rider).
const { sb, ic, logo, page } = require('./lib.cjs');
const kd = (s) => String(s).replace(/[0-9]/g, (d) => '០១២៣៤៥៦៧៨៩'[d]);

/* ------------------------------------------------- Facebook Marketplace */
const fCss = `
.nav{height:52px;display:flex;align-items:center;gap:20px;padding:0 16px;background:#fff}
.nav .rt{margin-left:auto;display:flex;gap:20px}
.hero{width:100%;height:192px;object-fit:cover;background:#EBEDF0}
.body{padding:13px 17px 0}
.price{font-size:25px;font-weight:700;letter-spacing:-.6px;color:#080809}
.title{font-size:15.5px;color:#080809;margin-top:3px}
.meta{font-size:12px;color:#65686C;margin-top:5px}
.btns{display:flex;gap:9px;margin-top:12px}
.b1{flex:1;height:40px;background:#0866FF;color:#fff;border-radius:8px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:7px}
.b2{width:112px;height:40px;background:#E4E6EB;color:#080809;border-radius:8px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:7px}
.hr{height:1px;background:#E4E6EB;margin:13px 0}
.h2{font-size:15px;font-weight:600;color:#080809;margin-bottom:9px}
.sell{display:flex;align-items:center;gap:11px}
.sell .nm{font-size:14px;font-weight:600}
.sell .sb2{font-size:11.5px;color:#65686C}
.ins{display:flex;border:1px solid #E4E6EB;border-radius:10px;margin-top:12px}
.ins div{flex:1;padding:8px 12px;border-right:1px solid #E4E6EB}
.ins div:last-child{border-right:0}
.ins .k{font-size:10.5px;color:#65686C}
.ins .v{font-size:17px;font-weight:700;margin-top:1px}
.moni{display:flex;align-items:center;gap:8px;background:#F7F3E9;border:1px solid #EADFC4;border-radius:10px;padding:10px 12px;margin-top:12px;font-size:11.5px;color:#7A5A18}
`;

const marketplace = () => page(fCss, `
${sb('dark')}
<div class="nav">${ic.back('#080809', 13)}
  <div class="rt">
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#080809" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V3M8 7l4-4 4 4"/></svg>
    ${ic.dots3('#080809')}
  </div>
</div>
<img class="hero" src="../assets/shoe-hero.jpg">
<div class="body">
  <div class="price tn">${kd('45.00')}$</div>
  <div class="title km">ស្បែកជើងស Crystal White · ទំហំ ៣៦ ដល់ ៤០</div>
  <div class="meta km">បានចុះផ្សាយ ២ ថ្ងៃមុន · ភ្នំពេញ · ដឹកជញ្ជូនដល់ផ្ទះ</div>
  <div class="btns">
    <div class="b1 km">${ic.send('#fff')} ផ្ញើសារ</div>
    <div class="b2 km">រក្សាទុក</div>
  </div>
  <div class="hr"></div>
  <div class="sell">
    <img src="../assets/shoe-hero.jpg" style="width:42px;height:42px;border-radius:50%;object-fit:cover">
    <div><div class="nm km">ហាងស្បែកជើង សុភា</div><div class="sb2 km">ឆ្លើយសារក្នុងរយៈពេលប៉ុន្មានវិនាទី</div></div>
    <div style="margin-left:auto">${ic.chevR('#65686C', 9)}</div>
  </div>
  <div class="ins">
    <div><div class="k km">អ្នកមើល</div><div class="v km tn">${kd(124)}</div></div>
    <div><div class="k km">សារថ្មី</div><div class="v km tn">${kd(8)}</div></div>
    <div><div class="k km">រក្សាទុក</div><div class="v km tn">${kd(31)}</div></div>
  </div>
  <div class="moni km">${logo.moni(15)} Moni ឆ្លើយសារពីបញ្ជីលក់នេះដោយស្វ័យប្រវត្តិ</div>
</div>`);

/* ------------------------------------------------------- GrabExpress */
const gCss = `
.hd{height:56px;background:#00B14F;display:flex;align-items:center;gap:12px;padding:0 16px;color:#fff}
.hd .t{font-size:16px;font-weight:600}
.map{position:relative;height:262px;background:#EAEFE8;overflow:hidden}
.sheet{position:absolute;bottom:0;left:0;right:0;background:#fff;border-radius:18px 18px 0 0;box-shadow:0 -6px 22px rgba(0,0,0,.12);padding:15px 17px 18px}
.grab{width:38px;height:5px;border-radius:3px;background:#DCDFE3;margin:0 auto 13px}
.st{font-size:16px;font-weight:700;color:#1C1C1C}
.sub{font-size:12px;color:#6B7280;margin-top:2px}
.drv{display:flex;align-items:center;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid #EEF0F2}
.drv .nm{font-size:14.5px;font-weight:600}
.drv .pl{font-size:12px;color:#6B7280}
.plate{margin-left:auto;background:#F2F4F6;border-radius:7px;padding:6px 11px;font-size:13px;font-weight:700;letter-spacing:.4px}
.ord{display:flex;align-items:center;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid #EEF0F2}
.stops{margin-top:14px;padding-top:14px;border-top:1px solid #EEF0F2}
.stop{display:flex;gap:11px;font-size:12.5px}
.stop .dotc{width:16px;display:flex;flex-direction:column;align-items:center;padding-top:5px}
.stop .l1{font-weight:600}
.stop .l2{color:#6B7280;font-size:11.5px}
`;

const grab = () => page(gCss, `
<div style="background:#00B14F">${sb('light')}</div>
<div class="hd">${ic.back('#fff', 13)}<span class="t km">GrabExpress</span><span style="margin-left:auto;font-size:12px" class="km">#${kd(1043)}</span></div>
<div class="map">
  <svg width="540" height="262" viewBox="0 12 540 262">
    <rect width="540" height="286" fill="#EAEFE8"/>
    <g fill="#DFE6DC"><rect x="26" y="24" width="120" height="76"/><rect x="182" y="14" width="150" height="66"/><rect x="372" y="30" width="132" height="86"/><rect x="40" y="150" width="136" height="96"/><rect x="212" y="140" width="118" height="70"/><rect x="366" y="160" width="140" height="92"/></g>
    <g stroke="#fff" stroke-width="15" stroke-linecap="square"><path d="M0 128h540"/><path d="M176 0v286"/><path d="M348 0v286"/><path d="M0 262h540"/></g>
    <g stroke="#F4F7F3" stroke-width="6"><path d="M0 60h540"/><path d="M262 0v286"/><path d="M448 0v286"/></g>
    <path d="M96 210 L176 210 L176 128 L348 128 L348 66 L440 66" fill="none" stroke="#00B14F" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="96" cy="210" r="11" fill="#fff" stroke="#00B14F" stroke-width="5"/>
    <g transform="translate(440 66)">
      <path d="M0-30c11 0 20 9 20 20 0 13-20 32-20 32S-20 3-20-10c0-11 9-20 20-20z" fill="#1C1C1C"/>
      <circle cx="0" cy="-10" r="7" fill="#fff"/>
    </g>
    <g transform="translate(268 128)">
      <circle r="17" fill="#fff"/><circle r="14" fill="#00B14F"/>
      <path d="M-7 3h3l1-4h6l1 4h3M-4 3a2.6 2.6 0 1 0 5.2 0M2.8 3A2.6 2.6 0 1 0 8 3" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
    </g>
  </svg>
</div>
<div class="sheet">
  <div class="grab"></div>
  <div class="st km">អ្នកដឹកជញ្ជូនកំពុងទៅយកទំនិញ</div>
  <div class="sub km">មកដល់ហាងក្នុងរយៈពេល ៦ នាទី · ដល់អតិថិជន ម៉ោង ១១:២០</div>
  <div class="drv">
    <div style="width:44px;height:44px;border-radius:50%;background:#0E7A3C;color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:600" class="km">វ</div>
    <div><div class="nm km">វិរៈ ស.</div><div class="pl km">Honda Dream · ★ ៤.៩</div></div>
    <div class="plate tn">1BM-4821</div>
  </div>
  <div class="ord">
    <img src="../assets/shoe-hero.jpg" style="width:44px;height:44px;object-fit:cover;border-radius:8px">
    <div><div class="nm km" style="font-size:13.5px;font-weight:600">ស្បែកជើងស Crystal White</div><div class="pl km" style="font-size:11.5px;color:#6B7280">បង់រួចរាល់តាម KHQR · ៤៦.៥០$</div></div>
  </div>
  <div class="stops">
    <div class="stop">
      <div class="dotc"><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="none" stroke="#00B14F" stroke-width="2.6"/></svg><div style="width:2px;height:22px;background:#E1E4E8;margin-top:3px"></div></div>
      <div><div class="l1 km">ហាងស្បែកជើង សុភា</div><div class="l2 km">ផ្សារទួលទំពូង ភ្នំពេញ</div></div>
    </div>
    <div class="stop" style="margin-top:5px">
      <div class="dotc">${ic.pin('#1C1C1C', 13)}</div>
      <div><div class="l1 km">រតនា</div><div class="l2 km">ផ្ទះ ២៤ ផ្លូវ ២៧១ សង្កាត់ទួលទំពូង</div></div>
    </div>
  </div>
</div>`);

module.exports = { marketplace, grab };
