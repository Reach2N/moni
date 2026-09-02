-- The shop's own Bakong account, 2 September 2026.
-- Additive only. Mirrors db/schema.sql, which mirrors src/lib/types.ts.
--
-- Until now the only payment rail was the platform CutLuy token, which means
-- every customer of every shop paid into Moni's account. A shop that takes
-- KHQR must take it into ITS OWN account: the owner pastes the Bakong id from
-- her banking app, the KHQR is generated offline into it (verified byte for
-- byte against ts-khqr in db/test.mjs), and she confirms receipt in the app
-- she already watches. No relay, no third-party signup.

alter table businesses add column if not exists khqr_account_id    text;
alter table businesses add column if not exists khqr_merchant_name text;
alter table businesses add column if not exists khqr_merchant_city text;

comment on column businesses.khqr_account_id is 'The shop''s OWN Bakong account ("sokha@wing"). KHQR payments are generated offline into it, so money lands with the shop, never with Moni. NULL means the shop cannot take QR payments yet.';
comment on column businesses.khqr_merchant_name is 'Merchant name printed on the QR (max 25 chars per EMVCo). NULL falls back to the shop name.';
comment on column businesses.khqr_merchant_city is 'Merchant city on the QR. NULL falls back to the province, then Phnom Penh.';
