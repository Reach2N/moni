-- Moni demo seed. Two businesses on purpose: a salon (30-minute sessions) and a
-- guesthouse (2-night stay): same tables, same constraint, no special cases.
-- Idempotent: fixed UUIDs + on conflict do nothing. Safe to re-run.

-- ═══════════════════════════════════════ 1. salon, Sokha Beauty, Takeo

insert into businesses (id, slug, name, business_type, category, phone, address, province,
                        locale, default_currency, raw_description, parsed_at, parse_model, hours)
values ('b0000000-0000-4000-8000-000000000001', 'sokha-beauty', 'Sokha Beauty',
        'salon', 'beauty', '+85512345678', 'Doun Kaev', 'Takeo', 'km', 'KHR',
        'កាត់សក់ 15000៛ 30 នាទី។ លាបសក់ 45000៛ ១ម៉ោងកន្លះ។ សក់អ៊ុត 60000៛ ២ម៉ោង។ '
        || 'លាងសក់ 8000៛។ តុបតែងមុខ 25000៛ 45 នាទី។ '
        || 'Open 8am to 7pm, Monday to Saturday. Closed Sunday. Two staff.',
        now(), 'claude-opus-5',
        '[{"dow":1,"open":"08:00","close":"19:00"},{"dow":2,"open":"08:00","close":"19:00"},
          {"dow":3,"open":"08:00","close":"19:00"},{"dow":4,"open":"08:00","close":"19:00"},
          {"dow":5,"open":"08:00","close":"19:00"},{"dow":6,"open":"08:00","close":"19:00"}]'::jsonb)
on conflict (id) do nothing;

insert into services (id, business_id, name, name_en, price_minor, currency, unit,
                      duration_min, buffer_min, capacity, requires_deposit, deposit_minor, sort_order) values
 ('50000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','កាត់សក់','Haircut',15000,'KHR','session',30,0,1,false,null,1),
 ('50000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','លាបសក់','Hair coloring',45000,'KHR','session',90,15,1,false,null,2),
 ('50000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001','សក់អ៊ុត','Perm',60000,'KHR','session',120,15,1,true,20000,3),
 ('50000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','លាងសក់','Wash & blow dry',8000,'KHR','session',20,0,1,false,null,4),
 ('50000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000001','តុបតែងមុខ','Makeup',25000,'KHR','session',45,0,1,false,null,5)
on conflict (id) do nothing;

insert into resources (id, business_id, name, kind) values
 ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','Sokha','chair'),
 ('a0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','Srey Mom','chair')
on conflict (id) do nothing;

insert into resource_services (resource_id, service_id)
select r.id, s.id from resources r join services s on s.business_id = r.business_id
where r.business_id = 'b0000000-0000-4000-8000-000000000001'
on conflict do nothing;

insert into channel_connections (id, business_id, channel, external_id, display_name, secret_ref, status, connected_at) values
 ('f0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','telegram','7788112233','@SokhaBeautyBot','TELEGRAM_BOT_TOKEN_SOKHA','connected', now())
on conflict (business_id, channel) do nothing;

insert into closures (id, business_id, starts_at, ends_at, reason) values
 ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',
  ((current_date + 4) + time '00:00') at time zone 'Asia/Phnom_Penh',
  ((current_date + 4) + time '23:59') at time zone 'Asia/Phnom_Penh',
  'បិទសម្រាប់អាពាហ៍ពិពាហ៍ / closed for a wedding')
on conflict (id) do nothing;

insert into customers (id, business_id, display_name, phone, locale, no_show_count) values
 ('d0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','Sophea','+85511111111','km',0),
 ('d0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','Ratana','+85522222222','km',0),
 ('d0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001','Dara','+85533333333','en',1)
on conflict (id) do nothing;

insert into customer_identities (customer_id, channel, external_id) values
 ('d0000000-0000-4000-8000-000000000001','telegram','tg_884411'),
 ('d0000000-0000-4000-8000-000000000002','telegram','tg_884412'),
 ('d0000000-0000-4000-8000-000000000003','instagram','ig_99213'),
 ('d0000000-0000-4000-8000-000000000003','phone','+85533333333')
on conflict (channel, external_id) do nothing;

insert into bookings (id, business_id, service_id, resource_id, customer_id, starts_at, ends_at,
                      status, unit, price_minor, currency, deposit_required_minor, channel, created_by, code) values
 ('90000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002',
  (current_date + time '09:00') at time zone 'Asia/Phnom_Penh',
  (current_date + time '09:30') at time zone 'Asia/Phnom_Penh',
  'completed','session',15000,'KHR',null,'telegram','ai','MN4K2P'),
 ('90000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001',
  (current_date + time '14:00') at time zone 'Asia/Phnom_Penh',
  (current_date + time '15:45') at time zone 'Asia/Phnom_Penh',
  'confirmed','session',45000,'KHR',null,'telegram','ai','MN7Q1A'),
 ('90000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000003',
  ((current_date + 1) + time '10:00') at time zone 'Asia/Phnom_Penh',
  ((current_date + 1) + time '12:15') at time zone 'Asia/Phnom_Penh',
  'pending','session',60000,'KHR',20000,'instagram','ai','MN9X5C'),
 ('90000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000003',
  ((current_date - 2) + time '16:00') at time zone 'Asia/Phnom_Penh',
  ((current_date - 2) + time '16:20') at time zone 'Asia/Phnom_Penh',
  'no_show','session',8000,'KHR',null,'telegram','ai','MN2B8D')
on conflict (id) do nothing;

-- payments: one KHQR deposit already paid, one still pending with a live QR.
-- qr_payload is a structurally-shaped sample EMVCo string, not a real merchant QR.
insert into payments (id, business_id, booking_id, customer_id, kind, amount_minor, currency,
                      provider, provider_account, qr_payload, provider_ref, provider_txn_id,
                      status, expires_at, paid_at, idempotency_key, last_checked_at, check_count) values
 ('70000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000001',
  'deposit',15000,'KHR','khqr','sokha_beauty@aba',
  '00020101021230500014sokha_beauty@aba0111Sokha Beauty5204739953031165405150005802KH5912Sokha Beauty6006Takeo6304A1B2',
  md5('00020101021230500014sokha_beauty@aba0111Sokha Beauty5204739953031165405150005802KH5912Sokha Beauty6006Takeo6304A1B2'),
  'BKG20260819A7741','paid', now() - interval '20 minutes', now() - interval '25 minutes',
  'booking:90000000-0000-4000-8000-000000000002:deposit', now() - interval '25 minutes', 3),
 ('70000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000003',
  'deposit',20000,'KHR','khqr','sokha_beauty@aba',
  '00020101021230500014sokha_beauty@aba0111Sokha Beauty5204739953031165405200005802KH5912Sokha Beauty6006Takeo6304C3D4',
  md5('00020101021230500014sokha_beauty@aba0111Sokha Beauty5204739953031165405200005802KH5912Sokha Beauty6006Takeo6304C3D4'),
  null,'pending', now() + interval '9 minutes', null,
  'booking:90000000-0000-4000-8000-000000000003:deposit', now() - interval '30 seconds', 6)
on conflict (id) do nothing;

delete from payment_events where payment_id in
  ('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002');
insert into payment_events (payment_id, source, status_reported, raw) values
 ('70000000-0000-4000-8000-000000000001','poll','pending','{"responseCode":1,"responseMessage":"Transaction not found"}'::jsonb),
 ('70000000-0000-4000-8000-000000000001','poll','paid','{"responseCode":0,"data":{"hash":"BKG20260819A7741","amount":15000,"currency":"KHR"}}'::jsonb),
 ('70000000-0000-4000-8000-000000000002','poll','pending','{"responseCode":1,"responseMessage":"Transaction not found"}'::jsonb);

-- ═══════════════════════════════════════ 2. guesthouse, nights, same rails

insert into businesses (id, slug, name, business_type, category, phone, address, province,
                        locale, default_currency, raw_description, parsed_at, parse_model, hours)
values ('b0000000-0000-4000-8000-000000000002', 'angkor-rest', 'Angkor Rest Guesthouse',
        'guesthouse', 'hospitality', '+85577889900', 'Wat Bo', 'Siem Reap', 'en', 'USD',
        'Standard room 15 dollars a night, family room 25 dollars. Check in 2pm, check out 12. '
        || 'Four rooms. Open every day.',
        now(), 'claude-opus-5',
        '[{"dow":0,"open":"00:00","close":"23:59"},{"dow":1,"open":"00:00","close":"23:59"},
          {"dow":2,"open":"00:00","close":"23:59"},{"dow":3,"open":"00:00","close":"23:59"},
          {"dow":4,"open":"00:00","close":"23:59"},{"dow":5,"open":"00:00","close":"23:59"},
          {"dow":6,"open":"00:00","close":"23:59"}]'::jsonb)
on conflict (id) do nothing;

-- USD: price_minor is cents. 1500 = $15.00
insert into services (id, business_id, name, name_en, price_minor, currency, unit,
                      duration_min, capacity, requires_deposit, deposit_minor, sort_order) values
 ('50000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-000000000002','Standard room','Standard room',1500,'USD','night',1440,2,true,500,1),
 ('50000000-0000-4000-8000-000000000012','b0000000-0000-4000-8000-000000000002','Family room','Family room',2500,'USD','night',1440,4,true,1000,2)
on conflict (id) do nothing;

insert into resources (id, business_id, name, kind, attributes) values
 ('a0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-000000000002','Room 101','room','{"floor":1,"aircon":true}'::jsonb),
 ('a0000000-0000-4000-8000-000000000012','b0000000-0000-4000-8000-000000000002','Room 102','room','{"floor":1,"aircon":true}'::jsonb),
 ('a0000000-0000-4000-8000-000000000013','b0000000-0000-4000-8000-000000000002','Room 201','room','{"floor":2,"aircon":false}'::jsonb)
on conflict (id) do nothing;

insert into customers (id, business_id, display_name, phone, locale) values
 ('d0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-000000000002','Marta','+34600111222','en')
on conflict (id) do nothing;

-- a two-night stay: check in 2pm, check out noon two days later
insert into bookings (id, business_id, service_id, resource_id, customer_id, starts_at, ends_at,
                      status, unit, quantity, party_size, price_minor, currency,
                      deposit_required_minor, channel, created_by, code) values
 ('90000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-000000000002',
  '50000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000011','d0000000-0000-4000-8000-000000000011',
  ((current_date + 3) + time '14:00') at time zone 'Asia/Phnom_Penh',
  ((current_date + 5) + time '12:00') at time zone 'Asia/Phnom_Penh',
  'confirmed','night',2,2,3000,'USD',500,'web','ai','AR8T3M')
on conflict (id) do nothing;

-- ═══════════════════════════════════════ conversations (both shops)

delete from messages where business_id in
  ('b0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002');
delete from events   where business_id in
  ('b0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002');

insert into conversations (id, business_id, customer_id, channel, status, needs_owner_reason) values
 ('e0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','telegram','open',null),
 ('e0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000003','instagram','needs_owner','customer asking for a price below the listed price'),
 ('e0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000011','web','open',null)
on conflict (id) do nothing;

insert into messages (conversation_id, business_id, role, body, lang, audio_url, transcribed_by,
                      tool_calls, booking_id, payment_id, tokens_in, tokens_out, cost_micro_usd) values
 -- Khmer booking, ending in a KHQR deposit
 ('e0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','customer',
  'សុំសួរ លាបសក់ថ្លៃប៉ុន្មាន?','km',null,null,null,null,null,null,null,null),
 ('e0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','ai',
  'លាបសក់ 45,000៛ ប្រើពេល ១ម៉ោង៣០នាទីបាទ។ ថ្ងៃនេះនៅទំនេរ ម៉ោង ២ រសៀល ឬ ៤ រសៀល។','km',
  null,null,'[{"tool":"get_business","args":{}},{"tool":"list_slots","args":{"service":"លាបសក់","date":"today"}}]'::jsonb,
  null,null,1840,96,4100),
 -- voice note in: body holds the transcript, audio_url holds the file
 ('e0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','customer',
  'ម៉ោង ២ រសៀល បាទ','km','voice/tg_884411/1789234.ogg','whisper-1',null,null,null,null,null,null),
 ('e0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','ai',
  'កក់ជូនរួចរាល់បាទ, លាបសក់ ថ្ងៃនេះ ម៉ោង ២:០០ រសៀល ជាមួយ Sokha។ លេខកូដ MN7Q1A។ '
  || 'សុំបង់កក់ 15,000៛ តាម QR នេះបាទ។','km',null,null,
  '[{"tool":"create_booking","args":{"code":"MN7Q1A","starts_at":"14:00"}},{"tool":"create_payment","args":{"kind":"deposit","amount_minor":15000}}]'::jsonb,
  '90000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000001',2010,124,4800),
 ('e0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','system',
  'Payment confirmed: 15,000៛ received via KHQR (BKG20260819A7741).','en',null,null,null,
  '90000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000001',null,null,null),
 -- escalation: the AI declines to negotiate and hands over
 ('e0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','customer',
  'Can you do the perm for 40000? I come with my sister.','en',null,null,null,null,null,null,null,null),
 ('e0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','ai',
  'Let me check with the owner about the price for two people, she will reply here shortly.','en',
  null,null,'[{"tool":"escalate_to_owner","args":{"reason":"discount request below list price"}}]'::jsonb,
  null,null,1620,78,3400),
 -- guesthouse: two nights, in English
 ('e0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-000000000002','customer',
  'Do you have a room for 2 nights from Saturday? Two people.','en',null,null,null,null,null,null,null,null),
 ('e0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-000000000002','ai',
  'Yes, Room 101, standard, $15 a night, $30 for two nights. Check in 2pm Saturday, check out 12pm Monday. '
  || 'Booking code AR8T3M. A $5 deposit holds it.','en',null,null,
  '[{"tool":"list_slots","args":{"service":"Standard room","nights":2}},{"tool":"create_booking","args":{"code":"AR8T3M","quantity":2}}]'::jsonb,
  '90000000-0000-4000-8000-000000000011',null,1720,142,4600);

insert into events (business_id, actor, actor_label, action, entity_type, entity_id, after) values
 ('b0000000-0000-4000-8000-000000000001','owner','owner:Sokha','business.parsed','business','b0000000-0000-4000-8000-000000000001','{"services_found":5,"source":"paste"}'::jsonb),
 ('b0000000-0000-4000-8000-000000000001','ai','ai:claude-opus-5','booking.created','booking','90000000-0000-4000-8000-000000000002','{"code":"MN7Q1A","price_minor":45000}'::jsonb),
 ('b0000000-0000-4000-8000-000000000001','ai','ai:claude-opus-5','payment.paid','payment','70000000-0000-4000-8000-000000000001','{"amount_minor":15000,"provider":"khqr"}'::jsonb),
 ('b0000000-0000-4000-8000-000000000001','ai','ai:claude-opus-5','ai.escalated','conversation','e0000000-0000-4000-8000-000000000002','{"reason":"discount request"}'::jsonb),
 ('b0000000-0000-4000-8000-000000000002','ai','ai:claude-opus-5','booking.created','booking','90000000-0000-4000-8000-000000000011','{"code":"AR8T3M","nights":2}'::jsonb);
