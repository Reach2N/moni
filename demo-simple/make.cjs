const fs = require('fs');
const { I, page } = require('./kit.cjs');

// One focal point at a time, dead centre. Nothing asks the eye to travel.
const shell = (n, title) => `
        <div class="idx km" id="idx">${I.mark(38)}<span>${n} ក្នុង ៤ · មុខងារស្នូល</span></div>
        <div class="h1 dp" id="h1">${title}</div>`;
const foot = `
        <div class="foot" id="foot">${I.mark(40)}<div class="w dp">MONI</div></div>`;

/* photo of the shoe, then the catalogue entry it became, same spot */
const s1 = page({
  id: 's1', duration: 13,
  extraCss: `
.shot img{width:580px;height:460px;object-fit:cover;display:block;border:1px solid var(--line)}
.prod{width:800px;background:#fff;border:1px solid var(--line);padding:36px 40px;text-align:center}
.prod .n{font-size:50px;font-weight:600}
.prod .m{font-size:30px;color:var(--dim);margin-top:12px}
.prod .p{font-size:76px;font-weight:700;color:var(--gold);margin-top:20px}
.pill{display:inline-flex;align-items:center;gap:14px;background:var(--goldS);border:1px solid #e6d5ac;color:var(--gold);font-size:30px;font-weight:600;padding:16px 26px}`,
  body: `${shell('១', 'បន្ថែមផលិតផល')}
        <div class="stage">
          <div class="layer" id="L1">
            <div class="shot"><img src="assets/shoe-hero.jpg"></div>
            <div class="lead km">អ្នកថតរូបផ្ញើមក</div>
          </div>
          <div class="layer" id="L2">
            <div class="prod">
              <div class="n km">ស្បែកជើងស Crystal White</div>
              <div class="m km tn">ទំហំ ៣៦ ដល់ ៤០ · ស្តុក ៨ គូ</div>
              <div class="p km tn">៤៥.០០$</div>
            </div>
            <div class="pill km tn" id="pill">${I.check('#8f6316', 26)} ១២ ផលិតផលក្នុង ១ នាទី</div>
          </div>
        </div>
        <div class="cap km" id="cap">Moni រៀបចំកាតាឡុកជូនអ្នក</div>
        <div class="sub km" id="sub">ឈ្មោះ ទំហំ តម្លៃ និងស្តុក ដកចេញពីរូបភាពដោយស្វ័យប្រវត្តិ</div>${foot}`,
  script: `
      rise("#idx", 0.2, 0.5, 12); rise("#h1", 0.5, 0.8);
      pop("#L1", 1.6, 0.7);
      tl.to("#L1", { opacity: 0, scale: 0.96, duration: 0.5, ease: "power2.in" }, 4.6);
      pop("#L2", 5.1, 0.7);
      rise("#cap", 7.4, 0.7); rise("#sub", 8.0, 0.6); rise("#foot", 8.8, 0.6, 14);`,
});

/* the question, the answer, the clock */
const s2 = page({
  id: 's2', duration: 13,
  extraCss: `
.layer{gap:26px}
.chat{width:100%;display:flex;flex-direction:column;gap:26px}
.stamp{align-self:center;margin-top:12px}`,
  body: `${shell('២', 'ឆ្លើយអតិថិជនជំនួសអ្នក')}
        <div class="stage">
          <div class="layer" id="L1" style="opacity:1">
            <div class="chat">
              <div class="bub km" id="b1">នៅមានទំហំ ៣៨ ទេបង? តម្លៃប៉ុន្មាន?</div>
              <div class="bub me km" id="b2">នៅមានបាទ ៤៥.០០$ ដឹកជញ្ជូន ១.៥០$ សរុប ៤៦.៥០$</div>
            </div>
            <div class="stamp km tn" id="st">${I.check('#1b6b45', 26)} ឆ្លើយក្នុង ៤ វិនាទី</div>
          </div>
        </div>
        <div class="cap km" id="cap">អតិថិជនសួរពេលណាក៏បាន Moni ឆ្លើយភ្លាម</div>
        <div class="sub km" id="sub">Messenger · Telegram · Instagram ក្នុងកន្លែងតែមួយ</div>${foot}`,
  script: `
      rise("#idx", 0.2, 0.5, 12); rise("#h1", 0.5, 0.8);
      rise("#b1", 1.9, 0.6, 24);
      rise("#b2", 3.6, 0.6, 24);
      rise("#st", 5.4, 0.55, 16);
      rise("#cap", 7.0, 0.7); rise("#sub", 7.6, 0.6); rise("#foot", 8.4, 0.6, 14);`,
});

/* the QR, scanned, paid — all in one place */
const s3 = page({
  id: 's3', duration: 13,
  extraCss: `
.qr{position:relative;width:470px;background:#fff;border:1px solid var(--line);padding:32px;overflow:hidden}
.qr img{width:100%;display:block}
.qr .a{font-size:64px;font-weight:700;text-align:center;margin-top:24px}
.scan{position:absolute;left:0;right:0;top:0;height:8px;background:var(--goldL);opacity:0}
.paid{display:flex;align-items:center;gap:22px;background:var(--greenS);border:1px solid rgba(27,107,69,.35);color:var(--green);font-size:48px;font-weight:600;padding:28px 34px;opacity:0}`,
  body: `${shell('៣', 'ទទួលប្រាក់តាម KHQR')}
        <div class="stage">
          <div class="layer" id="L1">
            <div class="qr"><div class="scan" id="scan"></div><img src="assets/qr.svg"><div class="a km tn">៤៦.៥០$</div></div>
            <div class="lead km" id="lead">អតិថិជនស្កេនពីកម្មវិធីធនាគារ</div>
          </div>
          <div class="layer" id="L2"><div class="paid km tn" id="paid">${I.check('#1b6b45', 36)} បានទទួល ៤៦.៥០$</div></div>
        </div>
        <div class="cap km" id="cap">Moni ផ្ញើ QR ជូនរាល់ការបញ្ជាទិញ</div>
        <div class="sub km" id="sub">មិនបាច់ប្រាប់លេខគណនី លុយចូល អ្នកដឹងភ្លាម</div>${foot}`,
  script: `
      rise("#idx", 0.2, 0.5, 12); rise("#h1", 0.5, 0.8);
      pop("#L1", 1.6, 0.7);
      tl.set("#scan", { y: 0 }, 0)
        .to("#scan", { opacity: 1, duration: 0.2 }, 3.4)
        .fromTo("#scan", { y: 0 }, { y: 470, duration: 1.6, ease: "power1.inOut" }, 3.5)
        .to("#scan", { opacity: 0, duration: 0.25 }, 5.0);
      tl.to("#lead", { opacity: 0, duration: 0.3 }, 5.4)
        .to("#L1", { opacity: 0, scale: 0.96, duration: 0.5, ease: "power2.in" }, 5.7);
      tl.set("#L2", { opacity: 1 }, 0);
      pop("#paid", 6.1, 0.7);
      rise("#cap", 7.6, 0.7); rise("#sub", 8.2, 0.6); rise("#foot", 9.0, 0.6, 14);`,
});

/* one number at a time, then the one thing to do about it */
const s4 = page({
  id: 's4', duration: 14,
  extraCss: `
.layer{gap:18px}
.v{font-size:176px;font-weight:600;letter-spacing:-4px;line-height:1.15}
.v small{font-size:64px;color:var(--dim)}
.k{font-size:36px;color:var(--dim)}
.tip{display:flex;align-items:center;gap:22px;background:var(--goldS);border:1px solid #e6d5ac;color:var(--gold);font-size:38px;padding:32px 36px;text-align:left;opacity:0}`,
  body: `${shell('៤', 'ដឹងថាហាងដំណើរការយ៉ាងណា')}
        <div class="stage">
          <div class="layer" id="L1"><div class="v km tn">១៦៨</div><div class="k km">សារបានឆ្លើយសប្តាហ៍នេះ</div></div>
          <div class="layer" id="L2"><div class="v km tn">៩៤<small>%</small></div><div class="k km">ឆ្លើយដោយស្វ័យប្រវត្តិ</div></div>
          <div class="layer" id="L3"><div class="v km tn">៨៤២<small>$</small></div><div class="k km">ចំណូលសប្តាហ៍នេះ</div></div>
          <div class="layer" id="L4"><div class="tip km" id="tip">${I.check('#8f6316', 30)} ស្តុកទំហំ ៣៨ ជិតអស់ · គួរបញ្ជាទិញបន្ថែមមុនថ្ងៃសៅរ៍</div></div>
        </div>
        <div class="cap km" id="cap">រៀងរាល់សប្តាហ៍ Moni ប្រាប់អ្នកតែរឿងសំខាន់</div>
        <div class="sub km" id="sub">មិនត្រឹមលេខ វាប្រាប់ថាគួរធ្វើអ្វីបន្ត</div>${foot}`,
  script: `
      rise("#idx", 0.2, 0.5, 12); rise("#h1", 0.5, 0.8);
      pop("#L1", 1.7, 0.6);
      tl.to("#L1", { opacity: 0, duration: 0.4, ease: "power2.in" }, 3.5);
      pop("#L2", 3.9, 0.6);
      tl.to("#L2", { opacity: 0, duration: 0.4, ease: "power2.in" }, 5.7);
      pop("#L3", 6.1, 0.6);
      tl.to("#L3", { opacity: 0, duration: 0.4, ease: "power2.in" }, 7.9);
      tl.set("#L4", { opacity: 1 }, 0);
      rise("#tip", 8.3, 0.7, 22);
      rise("#cap", 9.6, 0.7); rise("#sub", 10.2, 0.6); rise("#foot", 11.0, 0.6, 14);`,
});

const VIDS = [['s1-products', s1], ['s2-reply', s2], ['s3-payment', s3], ['s4-metrics', s4]];

if (require.main === module) {
  const hf = fs.readFileSync('hyperframes.json', 'utf8');
  const pkg = fs.readFileSync('package.json', 'utf8');
  for (const [dir, html] of VIDS) {
    fs.mkdirSync(`${dir}/assets/fonts`, { recursive: true });
    for (const f of fs.readdirSync('assets')) if (f !== 'fonts') fs.copyFileSync(`assets/${f}`, `${dir}/assets/${f}`);
    for (const f of fs.readdirSync('assets/fonts')) fs.copyFileSync(`assets/fonts/${f}`, `${dir}/assets/fonts/${f}`);
    fs.writeFileSync(`${dir}/hyperframes.json`, hf);
    fs.writeFileSync(`${dir}/package.json`, pkg.replace(/"name": "[^"]*"/, `"name": "${dir}"`));
    fs.writeFileSync(`${dir}/meta.json`, JSON.stringify({ id: dir, name: dir }, null, 2));
    fs.writeFileSync(`${dir}/index.html`, html);
    console.log(dir);
  }
}
