const fs = require('fs');
const chat = require('./frames-chat.cjs');
const moni = require('./frames-moni.cjs');
const misc = require('./frames-misc.cjs');
const frames = {
  '01-marketplace-listing': misc.marketplace(),
  '02-messenger-incoming': chat.messengerIncoming(),
  '03-messenger-autoreply': chat.messengerReply(),
  '04-instagram-dm': chat.instagram(),
  '05-telegram-khqr': chat.telegramKhqr(),
  '06-telegram-paid': chat.telegramPaid(),
  '07-moni-inbox': moni.inbox(),
  '08-moni-order-paid': moni.orderPaid(),
  '09-moni-takeover': moni.takeover(),
  '10-moni-connections': moni.connections(),
  '11-grab-delivery': misc.grab(),
};
for (const [n, h] of Object.entries(frames)) fs.writeFileSync(`build/${n}.html`, h);
console.log(Object.keys(frames).join(' '));
