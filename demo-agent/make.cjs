const fs = require('fs');
const { ICONS: I, stream, tool, page } = require('./kit.cjs');

const L = 'left:80px;top:180px;width:900px;height:960px';
const R = 'left:1020px;top:180px;width:1460px;height:960px';

const hdr = (title, sub) => `
        <div class="hdr" id="hdr">
          ${I.mark(64)}
          <div><div class="ttl km">${title}</div><div class="sub km">${sub}</div></div>
          <div class="chip km" id="chip"><span class="pulse" id="pulse"></span>កំពុងដំណើរការ</div>
        </div>
        <div class="chipdone km" id="chipdone">${I.check('#4bbd85', 24)} រួចរាល់</div>`;

const owner = (id, text) => `<div class="owner km" id="${id}">${text}</div>`;
const agent = (id, text) => `<div class="agent km" id="${id}">${stream(text)}<span class="caret" id="${id}-c"></span></div>`;

/* ------------------------------------------------------- 1 · add products */
const v1 = page({
  id: 'v1', duration: 18,
  extraCss: `.thumb{width:100%;height:190px;object-fit:cover;opacity:0}`,
  body: `
${hdr('បន្ថែមផលិតផល', 'ភ្នាក់ងារកាតាឡុករៀបចំស្តុកជំនួសម្ចាស់ហាង')}
        <div class="pane" id="paneL" style="${L}">
          <div class="pane-h km">${I.msg(26)} ការសន្ទនាជាមួយ Moni</div>
          <div class="pane-b">
            ${owner('o1', 'បង បន្ថែមស្បែកជើងថ្មីទាំងអស់នេះចូលកាតាឡុកឲ្យខ្ញុំផង')}
            <div class="attach" id="att"><img src="assets/shoe-hero.jpg"><div class="t km">១២ រូបភាព · បញ្ជីតម្លៃសរសេរដៃ</div></div>
            <div style="margin-top:28px">${agent('a1', 'បាទ ខ្ញុំកំពុងអានរូបភាព ដកឈ្មោះ ទំហំ និងតម្លៃ រួចបញ្ចូលទៅកាតាឡុក')}</div>
            <div style="margin-top:26px">
              ${tool('t1', I.eye(24), 'vision.extract(images: 12)', 'កំពុងអាន', 'អាន ១២ រូប')}
              ${tool('t2', I.tag(24), 'catalog.normalize()', 'កំពុងរៀបចំ', 'ទំហំ និងតម្លៃត្រឹមត្រូវ')}
              ${tool('t3', I.db(24), 'db.insert(products)', 'កំពុងរក្សាទុក', '១២ ជួរបានសរសេរ')}
            </div>
            <div style="margin-top:26px">${agent('a2', 'រូបភាពទី ៧ មិនច្បាស់ តម្លៃប៉ុន្មានដែរបង?')}</div>
            <div style="margin-top:20px">${owner('o2', '៣៨$ បាទ')}</div>
          </div>
        </div>
        <div class="pane" id="paneR" style="${R}">
          <div class="pane-h km">${I.tag(26)} កាតាឡុក · ផលិតផលដែលកំពុងបញ្ចូល</div>
          <div class="pane-b">
            <table class="tbl">
              <thead><tr id="thead"><th class="km">ឈ្មោះ</th><th class="km">ទំហំ</th><th class="km">តម្លៃ</th><th class="km">ស្តុក</th></tr></thead>
              <tbody>
                <tr class="r" id="r1"><td class="km">ស្បែកជើងស Crystal White</td><td class="km tn">៣៦ ដល់ ៤០</td><td class="km tn g">៤៥.០០$</td><td class="km tn d">៨</td></tr>
                <tr class="r" id="r2"><td class="km">ស្បែកជើងកីឡា Runner Pro</td><td class="km tn">៣៩ ដល់ ៤៣</td><td class="km tn g">៥២.០០$</td><td class="km tn d">៦</td></tr>
                <tr class="r" id="r3"><td class="km">ស្បែកជើងស្បែក Classic</td><td class="km tn">៣៨ ដល់ ៤៤</td><td class="km tn g">៦៥.០០$</td><td class="km tn d">៤</td></tr>
                <tr class="r" id="r4"><td class="km">ស្បែកជើងផ្ទះ Soft Step</td><td class="km tn">៣៦ ដល់ ៤២</td><td class="km tn g">២៥.០០$</td><td class="km tn d">១២</td></tr>
                <tr class="r" id="r5"><td class="km">ស្បែកជើងកវែង Rain</td><td class="km tn">៣៧ ដល់ ៤១</td><td class="km tn g">៤២.០០$</td><td class="km tn d">៥</td></tr>
                <tr class="r" id="r6"><td class="km">ស្បែកជើងខ្សែ Summer</td><td class="km tn">៣៦ ដល់ ៤០</td><td class="km tn g">៣៨.០០$</td><td class="km tn d">៩</td></tr>
              </tbody>
            </table>
            <div class="warn km" id="warn" style="margin-top:30px">${I.warn(30)} រូបភាព #៧ មិនច្បាស់ · តម្លៃមិនអាចអានបាន · កំពុងសួរម្ចាស់ហាង</div>
            <div class="warnfix km" id="warnfix" style="margin-top:30px">${I.check('#4bbd85', 28)} បានដោះស្រាយ · តម្លៃ ៣៨.០០$ ពីម្ចាស់ហាង</div>
            <div class="done km" id="done" style="margin-top:26px">${I.check('#4bbd85', 30)} ១២ ផលិតផលបានរក្សាទុក · កាតាឡុករួចរាល់សម្រាប់ឆ្លើយអតិថិជន</div>
          </div>
        </div>
        <div class="foot km" id="foot">${I.mark(38)}<span class="tag">ភ្នាក់ងារកាតាឡុក</span><span>ម្ចាស់ហាងបញ្ចូលរូបភាព ភ្នាក់ងាររៀបចំទិន្នន័យទាំងអស់</span></div>`,
  script: `
      tl.set("#warnfix", { display: "none" }, 0);
      rise("#hdr", 0.2, 0.6, 14);
      tl.fromTo("#pulse", { scale: 1 }, { scale: 0.45, duration: 0.55, repeat: 11, yoyo: true, ease: "sine.inOut" }, 0.6);
      tl.fromTo("#paneL", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.55)
        .fromTo("#paneR", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.7);
      rise("#o1", 1.0); rise("#att", 1.6, 0.5, 14);
      say("#a1", 2.2); tl.fromTo("#a1-c", { opacity: 0 }, { opacity: 1, duration: 0.3, repeat: 5, yoyo: true, ease: "none" }, 2.3);
      runTool("t1", 3.2, 1.5);
      rise("#thead", 3.9, 0.4, 10);
      ["#r1","#r2","#r3","#r4","#r5"].forEach((r, i) => rise(r, 4.4 + i * 0.55, 0.45, 16));
      runTool("t2", 5.1, 1.4);
      rise("#warn", 7.5, 0.5, 14);
      say("#a2", 8.2); tl.fromTo("#a2-c", { opacity: 0 }, { opacity: 1, duration: 0.3, repeat: 5, yoyo: true, ease: "none" }, 8.3);
      rise("#o2", 9.9, 0.5, 14);
      tl.to("#warn", { opacity: 0, duration: 0.35, ease: "power2.in" }, 10.5)
        .set("#warn", { display: "none" }, 10.86)
        .set("#warnfix", { display: "flex" }, 10.86);
      rise("#warnfix", 10.9, 0.5, 12);
      rise("#r6", 11.4, 0.45, 16);
      runTool("t3", 11.9, 1.6);
      rise("#done", 13.9, 0.6, 16);
      tl.to("#chip", { opacity: 0, duration: 0.3 }, 14.1).to("#chipdone", { opacity: 1, duration: 0.4 }, 14.3);
      rise("#foot", 14.8, 0.6, 14);`,
});

/* ------------------------------------------------------ 2 · reply to a customer */
const v2 = page({
  id: 'v2', duration: 18,
  extraCss: `
.evt{display:flex;align-items:center;gap:16px;border:1px solid var(--line);padding:16px 22px;font-size:22px;color:var(--gold);opacity:0}
.draft{border:1px solid var(--line2);padding:30px;font-size:30px;line-height:1.9;min-height:230px}
.src{display:flex;gap:40px;margin-top:26px;opacity:0}
.src div{flex:1;border:1px solid var(--line2);padding:20px 22px}
.src .k{font-size:20px;color:var(--dim2)}
.src .v{font-size:28px;margin-top:6px}
.sent{display:flex;align-items:center;gap:20px;border:1px solid rgba(75,189,133,.5);background:rgba(75,189,133,.1);padding:26px 30px;font-size:28px;color:var(--green);margin-top:30px;opacity:0}`,
  body: `
${hdr('ឆ្លើយអតិថិជន', 'ភ្នាក់ងារសារពិនិត្យស្តុកមុននឹងសន្យាអ្វីមួយ')}
        <div class="pane" id="paneL" style="${L}">
          <div class="pane-h km">${I.msg(26)} ការសន្ទនាជាមួយអតិថិជន</div>
          <div class="pane-b">
            <div class="evt km" id="evt">${I.msg(22)} សារថ្មីពី Messenger · ស្រីពៅ</div>
            <div style="margin-top:22px">${owner('o1', 'ស្បែកជើងស នៅមានទេបង? ខ្ញុំចង់បានទំហំ ៣៨ តម្លៃប៉ុន្មាន?')}</div>
            <div style="margin-top:28px">${agent('a1', 'ខ្ញុំពិនិត្យកាតាឡុក និងស្តុកជាក់ស្តែងជាមុនសិន មុននឹងឆ្លើយតម្លៃ')}</div>
            <div style="margin-top:26px">
              ${tool('t1', I.tag(24), 'catalog.search("Crystal White")', 'កំពុងស្វែងរក', 'រកឃើញ ១ ផលិតផល')}
              ${tool('t2', I.db(24), 'stock.check(size: 38)', 'កំពុងពិនិត្យ', 'នៅ ៣ គូ')}
              ${tool('t3', I.gear(24), 'pricing.quote(delivery: PP)', 'កំពុងគណនា', 'សរុប ៤៦.៥០$')}
              ${tool('t4', I.send(24, '#e8b455'), 'reply.send(channel: messenger)', 'កំពុងផ្ញើ', 'បានផ្ញើ')}
            </div>
            <div class="warn km" id="warn" style="margin-top:26px">${I.warn(30)} គោលការណ៍៖ ហាមប្រាប់តម្លៃ ឬស្តុក ដោយមិនពិនិត្យទិន្នន័យ</div>
            <div class="warnfix km" id="warnfix" style="margin-top:26px">${I.check('#4bbd85', 28)} តម្លៃទាំងអស់មកពីកាតាឡុក មិនមែនពីការទាយ</div>
          </div>
        </div>
        <div class="pane" id="paneR" style="${R}">
          <div class="pane-h km">${I.gear(26)} សេចក្តីព្រាងសារឆ្លើយតប</div>
          <div class="pane-b">
            <div class="draft km" id="draft"><span class="ph" id="draftph">កំពុងរៀបចំសេចក្តីព្រាង បន្ទាប់ពីពិនិត្យទិន្នន័យ</span>${stream('សួស្តីបង ស្បែកជើងស Crystal White ទំហំ ៣៨ នៅមានស្តុក ៣ គូបាទ។ តម្លៃ ៤៥.០០$ ដឹកជញ្ជូនក្នុងភ្នំពេញ ១.៥០$ សរុប ៤៦.៥០$។ បងចង់ឲ្យខ្ញុំកក់ទុកមួយគូទេ?')}<span class="caret" id="draft-c"></span></div>
            <div class="src" id="src">
              <div><div class="k km">ប្រភពតម្លៃ</div><div class="v km tn">កាតាឡុក #A-104</div></div>
              <div><div class="k km">ស្តុកជាក់ស្តែង</div><div class="v km tn">៣ គូ · ទំហំ ៣៨</div></div>
              <div><div class="k km">តំបន់ដឹក</div><div class="v km tn">ភ្នំពេញ · ១.៥០$</div></div>
            </div>
            <div class="sent km" id="sent">${I.check('#4bbd85', 30)} បានផ្ញើទៅ ស្រីពៅ · ឆ្លើយក្នុង ៤ វិនាទី ដោយគ្មានម្ចាស់ហាង</div>
          </div>
        </div>
        <div class="foot km" id="foot">${I.mark(38)}<span class="tag">ភ្នាក់ងារសារ</span><span>រាល់តម្លៃ និងស្តុកមកពីទិន្នន័យ មិនមែនពីការទាយ</span></div>`,
  script: `
      tl.set("#warnfix", { display: "none" }, 0);
      rise("#hdr", 0.2, 0.6, 14);
      tl.fromTo("#pulse", { scale: 1 }, { scale: 0.45, duration: 0.55, repeat: 11, yoyo: true, ease: "sine.inOut" }, 0.6);
      tl.fromTo("#paneL", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.55)
        .fromTo("#paneR", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.7);
      rise("#evt", 1.0, 0.45, 12); rise("#o1", 1.5);
      say("#a1", 2.3); tl.fromTo("#a1-c", { opacity: 0 }, { opacity: 1, duration: 0.3, repeat: 5, yoyo: true, ease: "none" }, 2.4);
      rise("#warn", 3.2, 0.5, 12);
      runTool("t1", 4.0, 1.2);
      runTool("t2", 5.5, 1.2);
      runTool("t3", 7.0, 1.2);
      say("#draft", 8.4, 0.075);
      tl.fromTo("#draft-c", { opacity: 0 }, { opacity: 1, duration: 0.3, repeat: 9, yoyo: true, ease: "none" }, 8.5);
      tl.to("#draftph", { opacity: 0, duration: 0.3 }, 8.2);
      rise("#src", 11.0, 0.55, 16);
      tl.to("#warn", { opacity: 0, duration: 0.35, ease: "power2.in" }, 11.3)
        .set("#warn", { display: "none" }, 11.66)
        .set("#warnfix", { display: "flex" }, 11.66);
      rise("#warnfix", 11.7, 0.5, 12);
      runTool("t4", 12.4, 1.1);
      rise("#sent", 14.2, 0.6, 16);
      tl.to("#chip", { opacity: 0, duration: 0.3 }, 14.4).to("#chipdone", { opacity: 1, duration: 0.4 }, 14.6);
      rise("#foot", 15.1, 0.6, 14);`,
});


/* ------------------------------------------------------------ 3 · payment */
const v3 = page({
  id: 'v3', duration: 18,
  extraCss: `
.evt{display:flex;align-items:center;gap:16px;border:1px solid var(--line);padding:16px 22px;font-size:22px;color:var(--gold);opacity:0}
.qrwrap{display:flex;gap:40px;align-items:flex-start}
.qrcard{width:420px;flex:none;background:var(--paper);padding:26px;opacity:0}
.qrcard img{width:100%;display:block}
.qrcard .amt{color:#14181c;font-size:44px;font-weight:700;text-align:center;margin-top:20px}
.qrcard .lb{color:#5c5951;font-size:20px;text-align:center;margin-top:4px}
.rec{flex:1}
.kv{display:flex;justify-content:space-between;gap:20px;padding:22px 0;border-bottom:1px solid var(--line2);font-size:25px;opacity:0}
.kv .k{color:var(--dim2)}
.kv .v{font-weight:600}
.st-wait{color:var(--gold)}
.st-paid{color:var(--green);position:absolute;right:0;top:22px;opacity:0}
.strow{position:relative}`,
  body: `
${hdr('ទទួលប្រាក់', 'ភ្នាក់ងារទូទាត់បង្កើត KHQR និងបញ្ជាក់ការបង់ប្រាក់')}
        <div class="pane" id="paneL" style="${L}">
          <div class="pane-h km">${I.msg(26)} ការសន្ទនាជាមួយអតិថិជន</div>
          <div class="pane-b">
            <div class="evt km" id="evt">${I.msg(22)} Telegram · រតនា យល់ព្រមទិញ</div>
            <div style="margin-top:22px">${owner('o1', 'យក ១ គូបាទ ទំហំ ៣៨ ដឹកមកផ្ទះ')}</div>
            <div style="margin-top:28px">${agent('a1', 'បាទ ខ្ញុំបង្កើតការបញ្ជាទិញ និង KHQR ជូនភ្លាម')}</div>
            <div style="margin-top:26px">
              ${tool('t1', I.tag(24), 'order.create(items: 1)', 'កំពុងបង្កើត', 'ការបញ្ជាទិញ #១០៤៣')}
              ${tool('t2', I.qr(24), 'khqr.generate(46.50 USD)', 'កំពុងបង្កើត QR', 'QR រួចរាល់')}
              ${tool('t3', I.gear(24), 'bakong.check(ref)', 'កំពុងបញ្ជាក់', 'បានទទួលប្រាក់')}
              ${tool('t4', I.db(24), 'db.insert(payments)', 'កំពុងរក្សាទុក', 'កត់ត្រារួច')}
            </div>
            <div class="warn km" id="warn" style="margin-top:26px">${I.warn(30)} ការតភ្ជាប់ទៅ Bakong យឺត · ព្យាយាមម្តងទៀត ២ ក្នុង ៣</div>
            <div class="warnfix km" id="warnfix" style="margin-top:26px">${I.check('#4bbd85', 28)} បញ្ជាក់រួច · ម្ចាស់ហាងទទួលដំណឹងភ្លាម</div>
          </div>
        </div>
        <div class="pane" id="paneR" style="${R}">
          <div class="pane-h km">${I.qr(26)} ការទូទាត់ · KHQR</div>
          <div class="pane-b">
            <div class="qrwrap">
              <div class="qrcard" id="qr"><img src="assets/qr.svg"><div class="amt km tn">៤៦.៥០$</div><div class="lb km">ហាងស្បែកជើង សុភា</div></div>
              <div class="rec">
                <div class="kv km" id="k1"><span class="k">ការបញ្ជាទិញ</span><span class="v tn">#១០៤៣</span></div>
                <div class="kv km" id="k2"><span class="k">ទំនិញ</span><span class="v">Crystal White · ៣៨</span></div>
                <div class="kv km" id="k3"><span class="k">ចំនួនទឹកប្រាក់</span><span class="v tn">៤៦.៥០ USD</span></div>
                <div class="kv km" id="k4"><span class="k">បណ្តាញ</span><span class="v">Telegram</span></div>
                <div class="kv km strow" id="k5"><span class="k">ស្ថានភាព</span><span class="v st-wait" id="stwait">រង់ចាំការទូទាត់</span><span class="v st-paid" id="stpaid">បានបង់រួច</span></div>
              </div>
            </div>
            <div class="done km" id="done" style="margin-top:36px">${I.check('#4bbd85', 30)} បានទទួល ៤៦.៥០$ · លុយចូលដោយគ្មានម្ចាស់ហាងចាំមើលទូរស័ព្ទ</div>
          </div>
        </div>
        <div class="foot km" id="foot">${I.mark(38)}<span class="tag">ភ្នាក់ងារទូទាត់</span><span>KHQR បង្កើត បញ្ជាក់ និងកត់ត្រាដោយស្វ័យប្រវត្តិ</span></div>`,
  script: `
      tl.set("#warnfix", { display: "none" }, 0);
      rise("#hdr", 0.2, 0.6, 14);
      tl.fromTo("#pulse", { scale: 1 }, { scale: 0.45, duration: 0.55, repeat: 11, yoyo: true, ease: "sine.inOut" }, 0.6);
      tl.fromTo("#paneL", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.55)
        .fromTo("#paneR", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.7);
      rise("#evt", 1.0, 0.45, 12); rise("#o1", 1.5);
      say("#a1", 2.3); tl.fromTo("#a1-c", { opacity: 0 }, { opacity: 1, duration: 0.3, repeat: 5, yoyo: true, ease: "none" }, 2.4);
      runTool("t1", 3.3, 1.2);
      ["#k1","#k2","#k3","#k4","#k5"].forEach((k, i) => rise(k, 4.2 + i * 0.35, 0.4, 12));
      runTool("t2", 5.2, 1.3);
      tl.fromTo("#qr", { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: E }, 6.4);
      runTool("t3", 7.6, 2.2);
      rise("#warn", 8.6, 0.5, 12);
      tl.to("#warn", { opacity: 0, duration: 0.35, ease: "power2.in" }, 10.4)
        .set("#warn", { display: "none" }, 10.76)
        .set("#warnfix", { display: "flex" }, 10.76);
      rise("#warnfix", 10.8, 0.5, 12);
      tl.to("#stwait", { opacity: 0, duration: 0.3 }, 10.6).to("#stpaid", { opacity: 1, duration: 0.4 }, 10.8);
      runTool("t4", 11.6, 1.3);
      rise("#done", 13.6, 0.6, 16);
      tl.to("#chip", { opacity: 0, duration: 0.3 }, 13.8).to("#chipdone", { opacity: 1, duration: 0.4 }, 14.0);
      rise("#foot", 14.4, 0.6, 14);`,
});

/* ------------------------------------------------------------ 4 · metrics */
const DAYS = [['ច', 96], ['អ', 128], ['ព', 112], ['ព្រ', 150], ['សុ', 176], ['ស', 232], ['អា', 188]];
const v4 = page({
  id: 'v4', duration: 19,
  extraCss: `
.stats{display:flex;gap:26px}
.stats .stat{flex:1}
.chartwrap{margin-top:38px;border:1px solid var(--line2);padding:30px;opacity:0}
.chartwrap .ttl{font-size:22px;color:var(--dim2);margin-bottom:26px}
.rec{display:flex;align-items:center;gap:20px;border:1px solid var(--line);background:rgba(232,180,85,.08);padding:24px 28px;font-size:26px;color:var(--gold);margin-top:32px;opacity:0}`,
  body: `
${hdr('មើលលទ្ធផល', 'ភ្នាក់ងារវិភាគរាយការណ៍អ្វីដែលកើតឡើងសប្តាហ៍នេះ')}
        <div class="pane" id="paneL" style="${L}">
          <div class="pane-h km">${I.msg(26)} ការសន្ទនាជាមួយ Moni</div>
          <div class="pane-b">
            ${owner('o1', 'សប្តាហ៍នេះលក់បានយ៉ាងម៉េចដែរបង?')}
            <div style="margin-top:28px">${agent('a1', 'ខ្ញុំកំពុងអានទិន្នន័យ ៧ ថ្ងៃចុងក្រោយ')}</div>
            <div style="margin-top:24px">
              ${tool('t1', I.chart(24), 'metrics.query(range: 7d)', 'កំពុងអាន', '១៦៨ សារ · ២៣ ការកម្មង់')}
              ${tool('t2', I.gear(24), 'analyze.trends()', 'កំពុងវិភាគ', 'ថ្ងៃសៅរ៍ខ្ពស់បំផុត')}
              ${tool('t3', I.db(24), 'stock.forecast(7d)', 'កំពុងព្យាករ', 'ទំហំ ៣៨ ជិតអស់')}
            </div>
            <div style="margin-top:26px">${agent('a2', 'សារ ១៦៨ ត្រូវបានឆ្លើយ ៩៤% ដោយស្វ័យប្រវត្តិ។ ថ្ងៃសៅរ៍មានអតិថិជនច្រើនជាងថ្ងៃធម្មតា ៣ ដង។')}</div>
            <div class="warn km" id="warn" style="margin-top:26px">${I.warn(30)} ស្តុកទំហំ ៣៨ នៅ ២ គូ · នឹងអស់ក្នុង ៣ ថ្ងៃ</div>
          </div>
        </div>
        <div class="pane" id="paneR" style="${R}">
          <div class="pane-h km">${I.chart(26)} លទ្ធផល ៧ ថ្ងៃចុងក្រោយ</div>
          <div class="pane-b">
            <div class="stats">
              <div class="stat" id="s1"><div class="k km">សារបានឆ្លើយ</div><div class="v km tn">១៦៨</div></div>
              <div class="stat" id="s2"><div class="k km">ឆ្លើយស្វ័យប្រវត្តិ</div><div class="v km tn">៩៤<small>%</small></div></div>
              <div class="stat" id="s3"><div class="k km">ចំណូល</div><div class="v km tn">៨៤២.៥០<small>$</small></div></div>
            </div>
            <div class="chartwrap" id="chart">
              <div class="ttl km">សារដែលបានឆ្លើយក្នុងមួយថ្ងៃ</div>
              <div class="bars">
                ${DAYS.map(([d, h], i) => `<div class="barcol"><div class="bar" id="b${i + 1}" style="height:${h}px"></div><div class="lb km">${d}</div></div>`).join('')}
              </div>
            </div>
            <div class="rec km" id="rec">${I.check('#e8b455', 28)} ស្នើ៖ បញ្ជាទិញបន្ថែម ១០ គូ ទំហំ ៣៨ មុនថ្ងៃសៅរ៍</div>
          </div>
        </div>
        <div class="foot km" id="foot">${I.mark(38)}<span class="tag">ភ្នាក់ងារវិភាគ</span><span>មិនត្រឹមរាយការណ៍ វាស្នើអ្វីដែលត្រូវធ្វើបន្ត</span></div>`,
  script: `
      rise("#hdr", 0.2, 0.6, 14);
      tl.fromTo("#pulse", { scale: 1 }, { scale: 0.45, duration: 0.55, repeat: 12, yoyo: true, ease: "sine.inOut" }, 0.6);
      tl.fromTo("#paneL", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.55)
        .fromTo("#paneR", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.7);
      rise("#o1", 1.0);
      say("#a1", 1.9); tl.fromTo("#a1-c", { opacity: 0 }, { opacity: 1, duration: 0.3, repeat: 5, yoyo: true, ease: "none" }, 2.0);
      runTool("t1", 2.9, 1.3);
      ["#s1","#s2","#s3"].forEach((s, i) => rise(s, 4.4 + i * 0.3, 0.5, 18));
      runTool("t2", 5.6, 1.4);
      tl.fromTo("#chart", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 6.4);
      ${[1, 2, 3, 4, 5, 6, 7].map((i) => `tl.set("#b${i}", { scaleY: 0 }, 0).to("#b${i}", { scaleY: 1, duration: 0.55, ease: "power2.out" }, ${(6.7 + (i - 1) * 0.14).toFixed(2)});`).join('\n      ')}
      runTool("t3", 8.4, 1.5);
      say("#a2", 9.6, 0.07);
      tl.fromTo("#a2-c", { opacity: 0 }, { opacity: 1, duration: 0.3, repeat: 9, yoyo: true, ease: "none" }, 9.7);
      rise("#warn", 12.4, 0.55, 14);
      rise("#rec", 13.4, 0.6, 16);
      tl.to("#chip", { opacity: 0, duration: 0.3 }, 13.8).to("#chipdone", { opacity: 1, duration: 0.4 }, 14.0);
      rise("#foot", 14.4, 0.6, 14);`,
});


/* --------------------------------------------- 0 · onboarding + orchestration */
const AGENTS = [
  ['កាតាឡុក', 'catalog', 'tag'],
  ['ម៉ោងបើកទ្វារ', 'hours', 'gear'],
  ['ការទូទាត់', 'payment', 'qr'],
  ['ដឹកជញ្ជូន', 'delivery', 'chart'],
  ['បណ្តាញសារ', 'channels', 'msg'],
];
const LOGS = [
  'INSERT businesses      ១ ជួរ',
  'INSERT services       ១២ ជួរ',
  'INSERT hours           ៧ ជួរ',
  'INSERT payment_methods ១ ជួរ',
  'UPDATE channels        ៣ ជួរ',
];

const v0 = page({
  id: 'v0', duration: 20,
  extraCss: `
.orch{width:460px;margin:0 auto;border:1px solid var(--gold);background:rgba(232,180,85,.09);padding:22px 26px;display:flex;align-items:center;gap:18px;opacity:0}
.orch .t{font-size:26px;color:var(--gold)}
.orch .s{font-size:19px;color:var(--dim);margin-top:2px}
.orch .dot{width:14px;height:14px;border-radius:50%;background:var(--gold);margin-left:auto;flex:none}
.stem{width:2px;height:42px;background:var(--line);margin:0 auto;transform-origin:top center}
.bus{width:1128px;height:2px;background:var(--line);margin:0 auto;transform-origin:center}
.drops{width:1128px;margin:0 auto;display:flex;justify-content:space-between}
.drop{width:2px;height:34px;background:var(--line);transform-origin:top center}
.agents{display:flex;gap:20px;margin-top:0}
.ag{flex:1;border:1px solid var(--line2);background:rgba(246,244,239,.028);padding:22px 20px;opacity:0}
.ag .ic{margin-bottom:14px}
.ag .nm{font-size:23px}
.ag .st{position:relative;height:30px;margin-top:12px;font-size:19px}
.ag .st span{position:absolute;left:0;top:0;white-space:nowrap}
.ag .wait{color:var(--dim2)}
.ag .run{color:var(--gold);opacity:0}
.ag .fin{color:var(--green);opacity:0;display:flex;align-items:center;gap:8px}
.logbox{margin-top:34px;border:1px solid var(--line2);padding:24px 26px}
.logbox .h{font-size:20px;color:var(--dim2);margin-bottom:16px;display:flex;align-items:center;gap:12px}
.logline{font-size:23px;color:var(--paper);padding:9px 0;opacity:0;display:flex;align-items:center;gap:16px}
.logline .ok{color:var(--green)}`,
  body: `
${hdr('បង្កើតជំនួយការ', 'អ្នកនិយាយមួយកថាខណ្ឌ ភ្នាក់ងារចាត់ចែងគ្នាបង្កើតនៅសល់')}
        <div class="pane" id="paneL" style="${L}">
          <div class="pane-h km">${I.msg(26)} ការសន្ទនាដំបូងជាមួយ Moni</div>
          <div class="pane-b">
            ${agent('a1', 'សួស្តីបង ប្រាប់ខ្ញុំពីហាងរបស់បងមួយកថាខណ្ឌ ខ្ញុំរៀបចំនៅសល់ជូន')}
            <div style="margin-top:24px">${owner('o1', 'ខ្ញុំលក់ស្បែកជើងនៅផ្សារទួលទំពូង បើក ៨ ព្រឹកដល់ ៦ ល្ងាច ដឹកក្នុងភ្នំពេញ ១.៥០$ ទទួលលុយតាម ABA')}</div>
            <div style="margin-top:26px">${agent('a2', 'យល់ហើយបង ខ្ញុំកំពុងបង្កើតជំនួយការ និងចាត់តាំងភ្នាក់ងារឲ្យធ្វើការស្របគ្នា')}</div>
            <div style="margin-top:24px">
              ${tool('t1', I.gear(24), 'agent.create("sophea-shoes")', 'កំពុងបង្កើត', 'ជំនួយការបានបង្កើត')}
              ${tool('t2', I.db(24), 'schema.migrate(business)', 'កំពុងរៀបចំទិន្នន័យ', '៥ តារាងរួចរាល់')}
              ${tool('t3', I.chart(24), 'agents.dispatch(5, parallel)', 'កំពុងចាត់ចែង', 'ភ្នាក់ងារ ៥ រត់ស្របគ្នា')}
            </div>
            <div class="warn km" id="warn" style="margin-top:24px">${I.warn(30)} មិនបានប្រាប់ថ្ងៃឈប់សម្រាក · សន្មតថាបើករាល់ថ្ងៃ</div>
            <div style="margin-top:20px">${owner('o2', 'ថ្ងៃអាទិត្យបិទបង')}</div>
            <div class="warnfix km" id="warnfix" style="margin-top:20px">${I.check('#4bbd85', 28)} បានកែ · ថ្ងៃអាទិត្យបិទ</div>
          </div>
        </div>
        <div class="pane" id="paneR" style="${R}">
          <div class="pane-h km">${I.gear(26)} ការចាត់ចែងភ្នាក់ងារ</div>
          <div class="pane-b">
            <div class="orch" id="orch">${I.mark(44)}<div><div class="t km">Moni Orchestrator</div><div class="s mono">plans · dispatches · verifies</div></div><div class="dot" id="odot"></div></div>
            <div class="stem" id="stem"></div>
            <div class="bus" id="bus"></div>
            <div class="drops">${AGENTS.map((_, i) => `<div class="drop" id="d${i + 1}"></div>`).join('')}</div>
            <div class="agents">
              ${AGENTS.map(([km, en, ico], i) => `<div class="ag" id="ag${i + 1}">
                <div class="ic">${I[ico](26)}</div>
                <div class="nm km">${km}</div>
                <div class="mono" style="font-size:18px;color:var(--dim2);margin-top:4px">${en}</div>
                <div class="st km"><span class="wait" id="w${i + 1}">រង់ចាំ</span><span class="run" id="r${i + 1}">កំពុងរត់</span><span class="fin" id="f${i + 1}">${I.check('#4bbd85', 20)} រួចរាល់</span></div>
              </div>`).join('')}
            </div>
            <div class="logbox">
              <div class="h km">${I.db(20)} កំណត់ត្រាដែលបានសរសេរ</div>
              ${LOGS.map((l, i) => `<div class="logline mono" id="lg${i + 1}"><span class="ok">${I.check('#4bbd85', 20)}</span>${l}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="foot km" id="foot">${I.mark(38)}<span class="tag">ការចាត់ចែង</span><span>ភ្នាក់ងារប្រាំរត់ស្របគ្នា ពីកថាខណ្ឌតែមួយ</span></div>`,
  script: `
      tl.set("#warnfix", { display: "none" }, 0);
      tl.set(["#stem", "#bus"], { scaleY: 0, scaleX: 0 }, 0);
      ${[1, 2, 3, 4, 5].map((i) => `tl.set("#d${i}", { scaleY: 0 }, 0);`).join('\n      ')}
      rise("#hdr", 0.2, 0.6, 14);
      tl.fromTo("#pulse", { scale: 1 }, { scale: 0.45, duration: 0.55, repeat: 13, yoyo: true, ease: "sine.inOut" }, 0.6);
      tl.fromTo("#paneL", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.55)
        .fromTo("#paneR", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.7);
      say("#a1", 1.1); tl.fromTo("#a1-c", { opacity: 0 }, { opacity: 1, duration: 0.3, repeat: 5, yoyo: true, ease: "none" }, 1.2);
      rise("#o1", 2.7);
      say("#a2", 3.7); tl.fromTo("#a2-c", { opacity: 0 }, { opacity: 1, duration: 0.3, repeat: 5, yoyo: true, ease: "none" }, 3.8);
      runTool("t1", 4.8, 1.2);
      tl.fromTo("#orch", { y: -18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: E }, 5.2)
        .fromTo("#odot", { scale: 1 }, { scale: 0.4, duration: 0.5, repeat: 15, yoyo: true, ease: "sine.inOut" }, 5.8);
      tl.to("#stem", { scaleY: 1, duration: 0.3, ease: "power2.out" }, 6.0)
        .to("#bus", { scaleX: 1, duration: 0.55, ease: "power2.inOut" }, 6.25);
      ${[1, 2, 3, 4, 5].map((i) => `tl.to("#d${i}", { scaleY: 1, duration: 0.25, ease: "power2.out" }, ${(6.75 + (i - 1) * 0.07).toFixed(2)});`).join('\n      ')}
      ${[1, 2, 3, 4, 5].map((i) => `rise("#ag${i}", ${(7.05 + (i - 1) * 0.12).toFixed(2)}, 0.45, 16);`).join('\n      ')}
      runTool("t2", 7.3, 1.3);
      ${[1, 2, 3, 4, 5].map((i) => `tl.to("#w${i}", { opacity: 0, duration: 0.2 }, ${(8.2 + (i - 1) * 0.1).toFixed(2)}).to("#r${i}", { opacity: 1, duration: 0.3 }, ${(8.3 + (i - 1) * 0.1).toFixed(2)});`).join('\n      ')}
      runTool("t3", 8.9, 1.6);
      ${[1, 2, 3, 4, 5].map((i) => `tl.to("#r${i}", { opacity: 0, duration: 0.25 }, ${(9.9 + (i - 1) * 0.55).toFixed(2)}).to("#f${i}", { opacity: 1, duration: 0.35 }, ${(10.05 + (i - 1) * 0.55).toFixed(2)});`).join('\n      ')}
      ${[1, 2, 3, 4].map((i) => `rise("#lg${i}", ${(10.3 + (i - 1) * 0.6).toFixed(2)}, 0.4, 10);`).join('\n      ')}
      rise("#warn", 12.6, 0.5, 12);
      rise("#o2", 13.6, 0.5, 12);
      tl.to("#warn", { opacity: 0, duration: 0.35, ease: "power2.in" }, 14.4)
        .set("#warn", { display: "none" }, 14.76)
        .set("#warnfix", { display: "flex" }, 14.76);
      rise("#warnfix", 14.8, 0.5, 12);
      rise("#lg5", 15.2, 0.4, 10);
      tl.to("#chip", { opacity: 0, duration: 0.3 }, 16.0).to("#chipdone", { opacity: 1, duration: 0.4 }, 16.2);
      rise("#foot", 16.8, 0.6, 14);`,
});

const VIDS = [
  ['v0-onboarding', v0],
  ['v1-products', v1],
  ['v2-reply', v2],
  ['v3-payment', v3],
  ['v4-metrics', v4],
];

if (require.main === module) {
  const base = { hyperframes: fs.readFileSync('hyperframes.json', 'utf8'), pkg: fs.readFileSync('package.json', 'utf8') };
  for (const [dir, html] of VIDS) {
    fs.mkdirSync(`${dir}/assets/fonts`, { recursive: true });
    for (const f of fs.readdirSync('assets')) {
      if (f === 'fonts') continue;
      fs.copyFileSync(`assets/${f}`, `${dir}/assets/${f}`);
    }
    for (const f of fs.readdirSync('assets/fonts')) fs.copyFileSync(`assets/fonts/${f}`, `${dir}/assets/fonts/${f}`);
    fs.writeFileSync(`${dir}/hyperframes.json`, base.hyperframes);
    fs.writeFileSync(`${dir}/package.json`, base.pkg.replace(/"name": "[^"]*"/, `"name": "${dir}"`));
    fs.writeFileSync(`${dir}/meta.json`, JSON.stringify({ id: dir, name: dir }, null, 2));
    fs.writeFileSync(`${dir}/index.html`, html);
    console.log(dir);
  }
}
