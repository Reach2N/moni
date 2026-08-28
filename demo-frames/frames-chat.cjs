// Owner point of view: these are the shop's inboxes on the owner's phone.
// Incoming (left, grey) = the customer. Outgoing (right) = the reply Moni sent for her.
const { sb, ic, logo, avatar, photoAvatar, page, SHOP, CUST } = require('./lib.cjs');

const moniTag = (secs, pad = '2px') => `<div class="tag km">${logo.moni(13)}<b>ឆ្លើយស្វ័យប្រវត្តិដោយ Moni</b><span>· ${secs}</span></div>`;

/* ---------------------------------------------------------------- Messenger */
const mCss = `
.nav{height:54px;display:flex;align-items:center;gap:11px;padding:0 16px;border-bottom:.5px solid #E4E6EB;background:#fff}
.nav .nm{font-size:16.5px;font-weight:600;color:#050505;line-height:1.35}
.nav .st{font-size:11.5px;color:#8A8D91;line-height:1.6;display:flex;align-items:center;gap:4px}
.ri{display:flex;gap:18px;margin-left:auto;align-items:center}
.feed{padding:12px 16px 6px;display:flex;flex-direction:column;justify-content:flex-end;height:calc(720px - 54px - 54px - 100px);overflow:hidden}
.day{text-align:center;font-size:11.5px;color:#8A8D91;margin:2px 0 12px;font-weight:600}
.mkt{display:flex;align-items:center;gap:5px;font-size:10.5px;color:#8A8D91;padding:0 0 5px 33px}
.r{display:flex;align-items:flex-end;gap:7px}
.r.me{justify-content:flex-end}
.bub{max-width:74%;padding:9px 14px;font-size:15px;color:#050505;background:#F1F1F2;border-radius:19px}
.me .bub{background:#0084FF;color:#fff}
.grp .bub{border-bottom-left-radius:6px}
.grp2 .bub{border-top-left-radius:6px}
.me.grp .bub{border-bottom-right-radius:6px;border-bottom-left-radius:19px}
.me.grp2 .bub{border-top-right-radius:6px;border-top-left-radius:19px}
.tag{display:flex;align-items:center;gap:5px;font-size:10.5px;color:#8A8D91;justify-content:flex-end;padding:6px 2px 0}
.tag b{font-weight:600;color:#6B7280}
.card{width:176px;background:#fff;border:.5px solid #DCDFE3;border-radius:18px;overflow:hidden}
.card img{width:100%;height:106px;object-fit:cover}
.card .cb{padding:8px 11px 10px}
.card .t{font-size:12px;font-weight:600;color:#050505}
.card .p{font-size:13.5px;font-weight:700;color:#050505;margin-top:1px}
.card .s{font-size:10.5px;color:#65686C;margin-top:4px}
.typing{background:#0084FF;border-radius:19px;padding:12px 16px;display:flex;gap:5px}
.typing i{width:7px;height:7px;border-radius:50%;background:#fff;display:block}
.typing i:nth-child(2){opacity:.68}.typing i:nth-child(3){opacity:.4}
.bar{position:absolute;bottom:64px;left:0;right:0;height:36px;background:#F0F7FF;border-top:.5px solid #D6E7FA;display:flex;align-items:center;gap:7px;padding:0 16px;font-size:11.5px;color:#1B62A8}
.bar .btn{margin-left:auto;background:#0084FF;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:14px}
.comp{position:absolute;bottom:0;left:0;right:0;height:64px;display:flex;align-items:center;gap:15px;padding:0 16px 10px;background:#fff}
.inp{flex:1;height:36px;background:#F1F1F2;border-radius:18px;display:flex;align-items:center;padding:0 15px;font-size:14.5px;color:#8A8D91}
`;

const mNav = () => `<div class="nav">
  ${ic.back('#0084FF', 13)}
  ${avatar('ស', '#B06CE8', 36)}
  <div><div class="nm km">${CUST}</div><div class="st km">${logo.facebook(11)} <span>Messenger · ${SHOP}</span></div></div>
  <div class="ri">${ic.phone('#0084FF')}${ic.info('#0084FF')}</div>
</div>`;

const mCard = `<div class="card">
  <img src="../assets/shoe-hero.jpg">
  <div class="cb"><div class="t km">ស្បែកជើងស Crystal White</div><div class="p">45.00$</div>
  <div class="s km">Marketplace · ភ្នំពេញ</div></div>
</div>`;

const mIncoming = `
  <div class="day km">ថ្ងៃនេះ 10:22</div>
  <div class="mkt km">បានចែករំលែកបញ្ជីលក់របស់អ្នក</div>
  <div class="r grp">${avatar('ស', '#B06CE8', 26)}<div class="bub" style="padding:0;background:none">${mCard}</div></div>
  <div class="r grp2" style="margin-top:3px;padding-left:33px"><div class="bub km">សួស្តី ស្បែកជើងនេះនៅមានទេ? ខ្ញុំចង់បានទំហំ 38</div></div>`;

const mComp = () => `<div class="comp">
  ${ic.plus('#0084FF')}${ic.camera('#0084FF')}${ic.gallery('#0084FF')}${ic.mic('#0084FF')}
  <div class="inp km">សរសេរសារ</div>
  ${ic.send('#0084FF')}
</div>`;

const messengerIncoming = () => page(mCss, `
${sb('dark')}${mNav()}
<div class="feed">
  ${mIncoming}
  <div class="r me" style="margin-top:12px"><div class="typing"><i></i><i></i><i></i></div></div>
  ${moniTag('កំពុងឆ្លើយ')}
</div>
<div class="bar km">${logo.moni(13)}<span>Moni កំពុងឆ្លើយជំនួសអ្នក</span><div class="btn km">ឆ្លើយដោយខ្លួនឯង</div></div>
${mComp()}`);

const messengerReply = () => page(mCss, `
${sb('dark')}${mNav()}
<div class="feed">
  ${mIncoming}
  <div class="r me grp" style="margin-top:12px"><div class="bub km">សួស្តីបង នៅមានស្តុកបាទ ទំហំ 38 តម្លៃ 45.00$</div></div>
  <div class="r me grp2" style="margin-top:3px"><div class="bub km">ដឹកជញ្ជូនក្នុងភ្នំពេញ 1.50$ សរុប 46.50$</div></div>
  ${moniTag('4 វិនាទី')}
  <div class="r" style="margin-top:10px">${avatar('ស', '#B06CE8', 26)}<div class="bub km">យក 1 គូបាទ ខ្ញុំបង់ប្រាក់តាម KHQR បាន</div></div>
</div>
<div class="bar km">${logo.moni(13)}<span>Moni បានឆ្លើយ 2 សារ · មិនទាន់ត្រូវការអ្នក</span><div class="btn km">ឆ្លើយដោយខ្លួនឯង</div></div>
${mComp()}`);

/* -------------------------------------------------------------- Instagram DM */
const iCss = `
.nav{height:54px;display:flex;align-items:center;gap:11px;padding:0 16px;border-bottom:.5px solid #EFEFEF;background:#fff}
.nav .nm{font-size:16px;font-weight:600;color:#000}
.nav .st{font-size:11.5px;color:#8E8E8E;display:flex;align-items:center;gap:4px}
.ri{display:flex;gap:18px;margin-left:auto;align-items:center}
.feed{padding:12px 16px 6px;display:flex;flex-direction:column;justify-content:flex-end;height:calc(720px - 54px - 54px - 102px);overflow:hidden}
.day{text-align:center;font-size:11px;color:#8E8E8E;margin:4px 0 12px}
.r{display:flex;align-items:flex-end;gap:7px}
.r.me{justify-content:flex-end}
.bub{max-width:74%;padding:10px 15px;font-size:14.5px;color:#000;background:#EFEFEF;border-radius:22px}
.me .bub{background:linear-gradient(100deg,#5B51D8,#833AB4 55%,#C13584);color:#fff}
.tag{display:flex;align-items:center;gap:5px;font-size:10.5px;color:#8E8E8E;justify-content:flex-end;padding:6px 2px 0}
.tag b{font-weight:600;color:#6B7280}
.story{width:168px;border-radius:18px;overflow:hidden;border:.5px solid #EFEFEF}
.story img{width:100%;height:198px;object-fit:cover}
.story .lb{padding:7px 11px 9px;font-size:11px;color:#8E8E8E}
.bar{position:absolute;bottom:66px;left:0;right:0;height:36px;background:#FBF6FE;border-top:.5px solid #EFE3F7;display:flex;align-items:center;gap:7px;padding:0 16px;font-size:11.5px;color:#7B3FB0}
.bar .btn{margin-left:auto;background:#833AB4;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:14px}
.comp{position:absolute;bottom:0;left:0;right:0;height:66px;display:flex;align-items:center;gap:12px;padding:0 14px 12px}
.camc{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#5B51D8,#C13584);display:flex;align-items:center;justify-content:center;flex:none}
.inp{flex:1;height:38px;border:1px solid #DBDBDB;border-radius:19px;display:flex;align-items:center;padding:0 16px;font-size:14px;color:#8E8E8E;gap:12px}
`;

const instagram = () => page(iCss, `
${sb('dark')}
<div class="nav">${ic.back('#000', 13)}
  ${avatar('ដ', '#E4405F', 36)}
  <div><div class="nm">dara.vireak</div><div class="st km">${logo.instagram(11)} <span>Instagram · sophea_shoes</span></div></div>
  <div class="ri">${ic.phone('#000')}${ic.info('#000')}</div>
</div>
<div class="feed">
  <div class="day km">ថ្ងៃនេះ 10:31</div>
  <div class="r">${avatar('ដ', '#E4405F', 26)}<div class="story">
      <img src="../assets/shoe-hero.jpg"><div class="lb km">បានឆ្លើយតបស្តូរីរបស់អ្នក</div>
  </div></div>
  <div class="r" style="margin-top:5px;padding-left:33px"><div class="bub km">គូនេះនៅមានទេបង? ខ្ញុំនៅសៀមរាប</div></div>
  <div class="r me grp" style="margin-top:12px"><div class="bub km">សួស្តីបង នៅមានបាទ តម្លៃ 45.00$</div></div>
  <div class="r me grp2" style="margin-top:3px"><div class="bub km">ដឹកទៅសៀមរាប 3.00$ ដល់ក្នុង 2 ថ្ងៃបាទ</div></div>
  ${moniTag('6 វិនាទី')}
</div>
<div class="bar km">${logo.moni(13)}<span>Moni កំពុងគ្រប់គ្រងការសន្ទនានេះ</span><div class="btn km">ឆ្លើយដោយខ្លួនឯង</div></div>
<div class="comp">
  <div class="camc"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3.5 8.4h3.2l1.5-2.2h7.6l1.5 2.2h3.2v10.4H3.5Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13.2" r="3.4" stroke="#fff" stroke-width="1.8"/></svg></div>
  <div class="inp km"><span style="flex:1">ផ្ញើសារ</span>${ic.mic('#262626')}${ic.gallery('#262626')}</div>
</div>`);

/* ----------------------------------------------------------------- Telegram */
const tCss = `
.nav{height:54px;display:flex;align-items:center;gap:10px;padding:0 14px;background:#F7F7F7;border-bottom:.5px solid #D8D8DC}
.nav .bk{display:flex;align-items:center;gap:4px;color:#007AFF;font-size:15px}
.nav .mid{position:absolute;left:0;right:0;text-align:center;pointer-events:none}
.nav .nm{font-size:15.5px;font-weight:600;color:#000}
.nav .st{font-size:11.5px;color:#8E8E93}
.wall{position:relative;height:calc(720px - 54px - 54px - 62px);background:#CFE3F0;overflow:hidden;padding:12px 12px 8px;display:flex;flex-direction:column;justify-content:flex-end}
.wall:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle at 20% 30%,rgba(255,255,255,.5) 0 2px,transparent 3px),radial-gradient(circle at 70% 65%,rgba(255,255,255,.42) 0 2px,transparent 3px),radial-gradient(circle at 45% 85%,rgba(255,255,255,.35) 0 2px,transparent 3px);background-size:120px 120px}
.day{position:relative;text-align:center;margin-bottom:10px}
.day span{background:rgba(0,0,0,.16);color:#fff;font-size:11px;padding:3px 11px;border-radius:11px}
.r{position:relative;display:flex;margin-bottom:5px}
.r.me{justify-content:flex-end}
.bub{max-width:76%;background:#fff;border-radius:14px;padding:8px 12px 7px;font-size:14.5px;color:#000;box-shadow:0 1px 1px rgba(0,0,0,.09)}
.me .bub{background:#E1FFC7}
.meta{display:flex;align-items:center;justify-content:flex-end;gap:3px;font-size:10px;color:#8E9AA4;margin-top:2px}
.me .meta{color:#5FA355}
.qr{background:#fff;border-radius:14px;padding:11px;box-shadow:0 1px 1px rgba(0,0,0,.09);width:214px}
.qr .qh{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:#0F172A;margin-bottom:9px}
.qr img{width:100%;height:auto;border:1px solid #EEF1F4}
.qr .amt{font-size:19px;font-weight:700;text-align:center;margin-top:9px;color:#0F172A}
.qr .sub{font-size:10.5px;color:#7B8794;text-align:center;margin-top:2px}
.kb{display:flex;gap:5px;margin-top:5px}
.kb div{flex:1;background:rgba(255,255,255,.92);border-radius:10px;text-align:center;font-size:12px;color:#2C7BC9;padding:8px 4px}
.paid{background:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 1px 1px rgba(0,0,0,.09);width:250px;border-left:3px solid #059669}
.paid .h{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:700;color:#047857}
.paid .l{display:flex;justify-content:space-between;font-size:12px;color:#4A5563;margin-top:7px}
.tag{display:flex;align-items:center;gap:5px;font-size:10.5px;color:#5A6B7A;justify-content:flex-end;padding:3px 4px 8px}
.tag b{font-weight:600}
.comp{position:absolute;bottom:0;left:0;right:0;height:62px;background:#F7F7F7;border-top:.5px solid #D8D8DC;display:flex;align-items:center;gap:14px;padding:0 14px 8px}
.inp{flex:1;height:36px;background:#fff;border:.5px solid #D8D8DC;border-radius:18px;display:flex;align-items:center;padding:0 14px;font-size:14.5px;color:#A0A0A5}
`;

const tNav = (name, sub) => `<div class="nav">
  <span class="bk">${ic.back('#007AFF', 11)} <span class="km">សារ</span></span>
  <div class="mid"><div class="nm km">${name}</div><div class="st km">${sub}</div></div>
  <div style="margin-left:auto">${avatar('រ', '#EF8A3C', 34)}</div>
</div>`;

const telegramKhqr = () => page(tCss, `
${sb('dark')}
${tNav('រតនា', 'តាមរយៈ @SopheaShoesBot')}
<div class="wall">
  <div class="day"><span class="km">ថ្ងៃនេះ</span></div>
  <div class="r"><div class="bub"><span class="km">បង យកគូនេះ 1 ទំហំ 38 ដឹកមកផ្ទះ</span><div class="meta">10:38</div></div></div>
  <div class="r me"><div class="bub"><span class="km">បាទ សរុប 46.50$ (ស្បែកជើង 45.00$ + ដឹកជញ្ជូន 1.50$)។ សូមស្កេន KHQR ខាងក្រោមបាទ</span><div class="meta">10:38 ${ic.check2('#5FA355', 14)}</div></div></div>
  <div class="r me"><div class="qr">
    <div class="qh km">${ic.qr('#0F172A')} បង់ប្រាក់ដោយ KHQR</div>
    <img src="../assets/qr.svg">
    <div class="amt">46.50 USD</div>
    <div class="sub km">ហាងស្បែកជើង សុភា · ការបញ្ជាទិញ #1043</div>
  </div></div>
  ${moniTag('ភ្លាមៗ')}
  <div class="kb"><div class="km">បានបង់រួច</div><div class="km">ប្តូរទំហំ</div><div class="km">និយាយជាមួយម្ចាស់ហាង</div></div>
</div>
<div class="comp">${ic.plus('#8E8E93')}<div class="inp km">សារ</div>${ic.mic('#8E8E93')}</div>`);

const telegramPaid = () => page(tCss, `
${sb('dark')}
${tNav('រតនា', 'តាមរយៈ @SopheaShoesBot')}
<div class="wall">
  <div class="day"><span class="km">ថ្ងៃនេះ</span></div>
  <div class="r me"><div class="bub"><span class="km">សរុប 46.50$ សូមស្កេន KHQR បាទ</span><div class="meta">10:38 ${ic.check2('#5FA355', 14)}</div></div></div>
  <div class="r"><div class="bub"><span class="km">បង់រួចហើយបង</span><div class="meta">10:41</div></div></div>
  <div class="r me"><div class="paid">
    <div class="h km">${ic.check2('#047857', 17)} បានទទួលប្រាក់ 46.50$</div>
    <div class="l"><span class="km">ការបញ្ជាទិញ</span><b>#1043</b></div>
    <div class="l"><span class="km">ស្បែកជើងស Crystal White · ទំហំ 38</span></div>
    <div class="l"><span class="km">ដឹកជញ្ជូន</span><span class="km">ភ្នំពេញ · ថ្ងៃនេះ</span></div>
  </div></div>
  <div class="r me"><div class="bub"><span class="km">អរគុណបង យើងនឹងដឹកជញ្ជូនក្នុងថ្ងៃនេះ។ ម្ចាស់ហាងបានទទួលការបញ្ជាទិញរួចហើយបាទ</span><div class="meta">10:41 ${ic.check2('#5FA355', 14)}</div></div></div>
  ${moniTag('ភ្លាមៗ')}
</div>
<div class="comp">${ic.plus('#8E8E93')}<div class="inp km">សារ</div>${ic.mic('#8E8E93')}</div>`);

module.exports = { messengerIncoming, messengerReply, instagram, telegramKhqr, telegramPaid };
