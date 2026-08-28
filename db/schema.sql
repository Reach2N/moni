-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Moni v1 schema, Postgres 15+ / Supabase.  Build once, never migrate.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Mirrors src/lib/types.ts. That file is the source of truth; this follows it.
--
-- The three rules that keep this from turning into a mess:
--  1. MONEY is integer minor units + currency per row. KHR has 0 decimals
--     (15000 = 15,000៛), USD has 2 (1500 = $15.00). No floats. No `money` type.
--  2. TIME is timestamptz, always. UTC in the DB, Asia/Phnom_Penh for display.
--     Occupancy is a tstzrange so sessions, hours, days and hotel nights are one
--     mechanism, not four.
--  3. TAXONOMIES that will grow (business_type, channel, provider) are plain
--     `text`, validated in TypeScript. Only genuinely closed sets (booking
--     status, payment status) get CHECK constraints. That is the difference
--     between "add hotels" being a code change and being a migration.
--
-- Structure copied from what already works: the booking core follows Cal.com's
-- model (service → resource → booking, availability as data), and the payment
-- core follows Stripe's (intent row + idempotency key + append-only event log).
--
-- Every table and key column carries a COMMENT. `select * from v_schema_doc`
-- dumps them, which is what you paste into the agent's system prompt so it knows
-- the database without you hand-writing a description that drifts.

create extension if not exists pgcrypto;   -- gen_random_bytes() for booking codes
create extension if not exists btree_gist; -- uuid = inside an exclusion constraint

-- ═══════════════════════════════════════════════════════════════ businesses

create table if not exists businesses (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  business_type      text not null default 'other',
  category           text not null default 'services',
  owner_user_id      uuid,
  clerk_user_id      text,
  phone              text,
  address            text,
  province           text,
  timezone           text not null default 'Asia/Phnom_Penh',
  default_currency   text not null default 'KHR',
  locale             text not null default 'km',
  raw_description    text,
  parsed_at          timestamptz,
  parse_model        text,
  ai_instructions    text,
  hours              jsonb not null default '[]'::jsonb,
  attributes         jsonb not null default '{}'::jsonb,
  plan               text not null default 'free',
  quota_txn_month    integer not null default 100,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table  businesses is 'One shop. The tenant. Everything else hangs off business_id.';
comment on column businesses.raw_description is 'The exact text the owner typed or dictated. Never overwrite: it is the parse input, the re-parse source, and the best training data this product will ever have.';
comment on column businesses.hours is 'Weekly opening hours: [{"dow":1,"open":"08:00","close":"19:00"}]. dow 0=Sunday. A day absent means closed.';
comment on column businesses.business_type is 'Taxonomy id from BUSINESS_TYPES in types.ts (salon, clinic, hotel, ...). Deliberately unconstrained text so new verticals need no migration.';
comment on column businesses.attributes is 'Vertical-specific fields that do not deserve a column. Keeps the table shape frozen.';
comment on column businesses.clerk_user_id is 'Clerk user id (text like user_2abc), the tenant key. Deliberately NOT unique: the chain plan allows several businesses per owner.';
comment on column businesses.ai_instructions is 'Owner''s standing instructions for the assistant ("never discount", "always offer the promo"). Appended to the system prompt. Separate from raw_description, which is never overwritten.';
create index if not exists businesses_clerk_user
  on businesses (clerk_user_id) where clerk_user_id is not null;

create table if not exists channel_connections (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  channel          text not null,
  external_id      text,
  display_name     text,
  secret_ref       text,
  token_ciphertext text,
  webhook_secret   text,
  status           text not null default 'disconnected',
  connected_at     timestamptz,
  last_error       text,
  unique (business_id, channel)
);
comment on table  channel_connections is 'Telegram / Messenger / Instagram hookups. Connecting a channel is data, not a code change.';
comment on column channel_connections.secret_ref is 'Key NAME resolved server-side (env or vault), for PLATFORM-owned secrets such as our Meta app secret.';
comment on column channel_connections.token_ciphertext is 'Owner-pasted credential (BotFather token, page access token), AES-256-GCM encrypted with the env key MONI_TOKEN_KEY before it reaches the row. Never plaintext, never sent to a client.';
comment on column channel_connections.webhook_secret is 'Random per-connection secret embedded in the webhook URL so inbound calls prove their origin.';

create table if not exists closures (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  constraint closures_time_order check (ends_at > starts_at)
);
comment on table closures is 'Exceptions to hours: Pchum Ben, Khmer New Year, "closed Thursday for a wedding". Without this the bot books customers into a shut shop.';
create index if not exists closures_business_time on closures (business_id, starts_at);

-- ═══════════════════════════════════════════════════════════════ catalogue

create table if not exists services (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  name             text not null,
  name_en          text,
  description      text,
  price_minor      integer not null,
  currency         text not null default 'KHR',
  unit             text not null default 'session',
  duration_min     integer not null default 30,
  buffer_min       integer not null default 0,
  capacity         integer not null default 1,
  requires_deposit boolean not null default false,
  deposit_minor    integer,
  active           boolean not null default true,
  sort_order       integer not null default 0,
  attributes       jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint services_price_nonneg  check (price_minor >= 0),
  constraint services_duration_pos  check (duration_min > 0),
  constraint services_buffer_nonneg check (buffer_min >= 0),
  constraint services_capacity_pos  check (capacity > 0),
  -- three-valued logic trap: `or deposit_minor > 0` evaluates to NULL (and therefore
  -- PASSES) when deposit_minor is null, so the null test has to be explicit.
  constraint services_deposit_ok    check (not requires_deposit or (deposit_minor is not null and deposit_minor > 0))
);
comment on table  services is 'What the shop sells, in the owner''s own words. The agent quotes prices from HERE, never from the model.';
comment on column services.name is 'As the owner wrote it, Khmer included. name_en is optional so the bot can answer in either language.';
comment on column services.unit is 'session | hour | day | night | walk_in. night is how hotels and guesthouses ride the same rails.';
comment on column services.buffer_min is 'Turnaround after the appointment (clean the room, wash the chair). Toy booking apps omit this and are useless on day two.';
comment on column services.capacity is 'How many customers one resource serves at once (a yoga class is 20, a haircut is 1).';
create unique index if not exists services_biz_name_uniq
  on services (business_id, lower(name)) where active;

create table if not exists resources (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  kind        text not null default 'staff',
  active      boolean not null default true,
  attributes  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
comment on table  resources is 'The thing that can only be in one place at a time: a stylist, a clinic room, a repair bay, a table, a hotel room. This is what double-booking is prevented against.';
comment on column resources.kind is 'staff | room | bay | table | chair | equipment';
create index if not exists resources_business on resources (business_id);

create table if not exists resource_services (
  resource_id uuid not null references resources(id) on delete cascade,
  service_id  uuid not null references services(id)  on delete cascade,
  primary key (resource_id, service_id)
);
comment on table resource_services is 'Who/what can perform which service. Empty means "anyone".';

-- ═══════════════════════════════════════════════════════════════ people

create table if not exists customers (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  display_name  text,
  phone         text,
  locale        text default 'km',
  no_show_count integer not null default 0,
  notes         text,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
comment on table  customers is 'One human, regardless of how many apps they message from.';
comment on column customers.no_show_count is 'Drives the deposit decision. Meaningless unless identities are merged properly.';
create index if not exists customers_business on customers (business_id);
create index if not exists customers_phone on customers (business_id, phone);

create table if not exists customer_identities (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  channel     text not null,
  external_id text not null,
  created_at  timestamptz not null default now(),
  unique (channel, external_id)
);
comment on table customer_identities is 'Telegram id, page-scoped Messenger id, Instagram id, phone number, all pointing at one customer row. She messages on Telegram, her husband calls, she walks in: still one history.';

-- ═══════════════════════════════════════════════════════════════ bookings

create table if not exists bookings (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references businesses(id) on delete cascade,
  service_id             uuid not null references services(id),
  resource_id            uuid not null references resources(id),
  customer_id            uuid not null references customers(id),
  starts_at              timestamptz not null,
  ends_at                timestamptz not null,
  slot                   tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  status                 text not null default 'pending',
  unit                   text not null default 'session',
  quantity               integer not null default 1,
  party_size             integer not null default 1,
  price_minor            integer not null,
  currency               text not null default 'KHR',
  deposit_required_minor integer,
  channel                text not null default 'telegram',
  created_by             text not null default 'ai',
  code                   text not null default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)),
  customer_note          text,
  owner_note             text,
  reminder_24h_at        timestamptz,
  reminder_1h_at         timestamptz,
  cancelled_at           timestamptz,
  cancel_reason          text,
  attributes             jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint bookings_time_order check (ends_at > starts_at),
  constraint bookings_status_ok  check (status in ('pending','confirmed','completed','cancelled','no_show')),
  constraint bookings_price_nonneg check (price_minor >= 0),
  constraint bookings_quantity_pos check (quantity > 0)
);
comment on table  bookings is 'The appointment. Also the hotel stay, the court hire, the tailoring job: it is a time range against a resource, so one table covers every vertical.';
comment on column bookings.slot is 'Generated tstzrange. Also rejects ends_at < starts_at before bookings_time_order is reached, so callers see a range error first. The exclusion constraint below uses it so double-booking is impossible at the storage layer, not merely unlikely in application code.';
comment on column bookings.price_minor is 'SNAPSHOT of the price at booking time. Never joined from services, so raising a price does not rewrite history.';
comment on column bookings.code is 'Six characters the customer can actually read back over the phone. Nobody quotes a UUID.';
comment on column bookings.quantity is 'Nights for a hotel, hours for a court, units for anything metered.';

create unique index if not exists bookings_code_uniq on bookings (business_id, code);
create index if not exists bookings_biz_start on bookings (business_id, starts_at);
create index if not exists bookings_customer on bookings (customer_id, starts_at desc);

-- THE constraint. Two customers messaging at the same instant cannot both get
-- the 2pm chair. Cancelled and no-show rows release the slot.
alter table bookings drop constraint if exists bookings_no_overlap;
alter table bookings add  constraint bookings_no_overlap
  exclude using gist (resource_id with =, slot with &&)
  where (status in ('pending','confirmed','completed'));

-- ═══════════════════════════════════════════════════════════════ payments
-- KHQR flow: create a payment row -> ask the provider for an EMVCo payload ->
-- store payload + its md5 as provider_ref -> poll check-transaction with that
-- md5 -> mark paid. Provider-agnostic on purpose: `provider` is text, so
-- swapping or adding a rail is a TypeScript adapter, never a migration.

create table if not exists payments (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  booking_id       uuid references bookings(id) on delete set null,
  customer_id      uuid references customers(id) on delete set null,
  kind             text not null default 'deposit',
  amount_minor     integer not null,
  currency         text not null default 'KHR',
  provider         text not null default 'khqr',
  provider_account text,
  qr_payload       text,
  provider_ref     text,
  provider_txn_id  text,
  status           text not null default 'pending',
  expires_at       timestamptz,
  paid_at          timestamptz,
  idempotency_key  text not null,
  last_checked_at  timestamptz,
  check_count      integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint payments_amount_pos check (amount_minor > 0),
  constraint payments_status_ok  check (status in ('pending','paid','expired','failed','refunded','cancelled')),
  constraint payments_paid_has_time check (status <> 'paid' or paid_at is not null),
  unique (business_id, idempotency_key)
);
comment on table  payments is 'One payment attempt. A booking may have several (deposit, then balance): never overwrite, always add a row.';
comment on column payments.qr_payload is 'Raw EMVCo KHQR string. Render to an image client-side; do not store a PNG.';
comment on column payments.provider_ref is 'For KHQR this is md5(qr_payload): the handle the check-transaction endpoint takes. Unique per provider so a duplicate QR cannot be counted twice.';
comment on column payments.idempotency_key is 'Set by the caller before the provider is contacted. Retried requests reuse the row instead of minting a second QR for the same booking.';
comment on column payments.check_count is 'Poll counter. KHQR confirmation is pull-based, so this is your abuse and cost guard.';

create unique index if not exists payments_provider_ref_uniq
  on payments (provider, provider_ref) where provider_ref is not null;
create index if not exists payments_pending_poll
  on payments (status, expires_at) where status = 'pending';
create index if not exists payments_booking on payments (booking_id);

create table if not exists payment_events (
  id              bigserial primary key,
  payment_id      uuid not null references payments(id) on delete cascade,
  source          text not null,
  status_reported text,
  raw             jsonb,
  created_at      timestamptz not null default now()
);
comment on table  payment_events is 'Append-only log of every provider reply (poll, webhook, manual mark-paid). When money is disputed this is the record; the payments row is only the current summary.';
comment on column payment_events.source is 'poll | webhook | manual';
create index if not exists payment_events_payment on payment_events (payment_id, created_at);

-- ═══════════════════════════════════════════════════════════ conversations

create table if not exists conversations (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references businesses(id) on delete cascade,
  customer_id        uuid not null references customers(id) on delete cascade,
  channel            text not null,
  status             text not null default 'open',
  needs_owner_reason text,
  last_message_at    timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  unique (business_id, customer_id, channel),
  constraint conversations_status_ok check (status in ('open','needs_owner','closed'))
);
comment on column conversations.status is 'open = AI is handling. needs_owner = AI escalated and MUST stop replying. closed = done. The escalation path is the feature every competitor demo skips.';

create table if not exists messages (
  id              bigserial primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  business_id     uuid not null references businesses(id) on delete cascade,
  role            text not null,
  body            text not null,
  lang            text,
  audio_url       text,
  transcribed_by  text,
  tool_calls      jsonb,
  booking_id      uuid references bookings(id) on delete set null,
  payment_id      uuid references payments(id) on delete set null,
  tokens_in       integer,
  tokens_out      integer,
  cost_micro_usd  integer,
  created_at      timestamptz not null default now(),
  constraint messages_role_ok check (role in ('ai','owner','customer','system'))
);
comment on column messages.audio_url is 'Voice note storage path. body always holds the transcript, so every reader stays text-only and the agent never needs the audio.';
comment on column messages.tool_calls is 'Exactly what the AI did, in order. This is what the owner reads in the audit view before she decides to trust it.';
comment on column messages.cost_micro_usd is 'Millionths of a dollar. Your margin, per message, and the number an investor will ask for.';
create index if not exists messages_convo on messages (conversation_id, created_at);
create index if not exists messages_biz_time on messages (business_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════ audit

create table if not exists events (
  id          bigserial primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  actor       text not null,
  actor_label text,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);
comment on table events is 'Append-only: who did what, before and after. Doubles as the agent''s memory of its own actions and as the owner''s undo history. Never UPDATE or DELETE here.';
create index if not exists events_biz_time on events (business_id, created_at desc);

-- ═══════════════════════════════════════════ platform tables (ours, not the tenant's)
-- The owner's data above is exportable and theirs. These two are operations data:
-- when RLS lands they get NO member policy, service-role access only.

create table if not exists waitlist (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null,
  locale                text not null default 'km',
  source                text not null default 'landing',
  note                  text,
  approved_at           timestamptz,
  approved_by           text,
  converted_business_id uuid references businesses(id) on delete set null,
  created_at            timestamptz not null default now()
);
comment on table  waitlist is 'Founding-shop applications from the public landing page. Membership here (or approved_at set) is what the app-subdomain gate checks after Clerk sign-in.';
comment on column waitlist.approved_at is 'Set by us, manually, until an admin surface exists. NULL means waiting.';
comment on column waitlist.converted_business_id is 'Filled when the member finishes onboarding, closing the loop from lead to live shop.';
create unique index if not exists waitlist_email_uniq on waitlist (lower(email));

create table if not exists webhook_events (
  id                bigserial primary key,
  channel           text not null,
  connection_id     uuid references channel_connections(id) on delete set null,
  business_id       uuid references businesses(id) on delete set null,
  external_event_id text,
  payload           jsonb not null,
  status            text not null default 'received',
  error             text,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  constraint webhook_events_status_ok check (status in ('received','processed','skipped','failed'))
);
comment on table  webhook_events is 'Raw inbound channel payloads (Telegram update, Meta message), append-first. Dedupe, replay and debugging all read from here; losing a webhook must never lose a customer message.';
comment on column webhook_events.external_event_id is 'The provider''s own id (Telegram update_id, Meta mid). The dedupe key: providers redeliver on slow responses.';
create unique index if not exists webhook_events_dedupe
  on webhook_events (channel, connection_id, external_event_id)
  where external_event_id is not null;
create index if not exists webhook_events_pending
  on webhook_events (status, received_at) where status = 'received';

-- These two start LOCKED, unlike the tenant tables below where RLS waits for
-- Clerk: they are new, the landing page feeds waitlist from the public
-- internet, and only the service role has any business reading them. RLS on
-- with no policy means exactly that.
alter table waitlist       enable row level security;
alter table webhook_events enable row level security;

-- ═══════════════════════════════════════════════════════════ updated_at

-- search_path pinned empty (advisor 0011): a trigger function with a mutable
-- search_path can be hijacked by objects planted in another schema. now() still
-- resolves because pg_catalog is always searched implicitly.
create or replace function moni_touch() returns trigger
  language plpgsql set search_path = '' as $fn$
begin new.updated_at = now(); return new; end $fn$;

drop trigger if exists businesses_touch on businesses;
create trigger businesses_touch before update on businesses
  for each row execute function moni_touch();
drop trigger if exists services_touch on services;
create trigger services_touch before update on services
  for each row execute function moni_touch();
drop trigger if exists bookings_touch on bookings;
create trigger bookings_touch before update on bookings
  for each row execute function moni_touch();
drop trigger if exists payments_touch on payments;
create trigger payments_touch before update on payments
  for each row execute function moni_touch();

-- ═══════════════════════════════════════════════════════════════ views
-- Written so the agent and the dashboard never hand-roll a join.
-- All security_invoker (advisor 0010): a definer view silently bypasses RLS,
-- which becomes a hole the day the member policies turn on. The service role
-- bypasses RLS anyway, so the app sees no difference today.

-- One row per business: everything the agent needs to be grounded.
create or replace view v_agent_business with (security_invoker = true) as
select b.id as business_id, b.slug, b.name, b.business_type, b.category,
       b.timezone, b.default_currency, b.locale, b.hours, b.phone, b.address,
       coalesce((select jsonb_agg(jsonb_build_object(
                  'id', s.id, 'name', s.name, 'name_en', s.name_en,
                  'price_minor', s.price_minor, 'currency', s.currency,
                  'unit', s.unit, 'duration_min', s.duration_min,
                  'buffer_min', s.buffer_min, 'capacity', s.capacity,
                  'requires_deposit', s.requires_deposit, 'deposit_minor', s.deposit_minor)
                  order by s.sort_order)
                from services s where s.business_id = b.id and s.active), '[]'::jsonb) as services,
       coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'kind', r.kind)
                  order by r.name)
                from resources r where r.business_id = b.id and r.active), '[]'::jsonb) as resources,
       coalesce((select jsonb_agg(jsonb_build_object(
                  'starts_at', c.starts_at, 'ends_at', c.ends_at, 'reason', c.reason))
                from closures c where c.business_id = b.id and c.ends_at >= now()), '[]'::jsonb) as upcoming_closures
from businesses b;
comment on view v_agent_business is 'The agent''s grounding payload: one row, hours + services + resources + closures. Serialise straight into the system prompt.';

-- Bookings with everything a human or an agent needs to talk about them.
create or replace view v_bookings_agent with (security_invoker = true) as
select bk.id, bk.business_id, bk.code, bk.status, bk.starts_at, bk.ends_at,
       bk.unit, bk.quantity, bk.party_size, bk.price_minor, bk.currency, bk.channel,
       s.name as service_name, s.name_en as service_name_en,
       r.name as resource_name, r.kind as resource_kind,
       c.display_name as customer_name, c.phone as customer_phone, c.no_show_count,
       coalesce(p.paid_minor, 0) as paid_minor,
       bk.price_minor - coalesce(p.paid_minor, 0) as balance_minor,
       bk.customer_note, bk.owner_note, bk.created_by, bk.created_at
from bookings bk
join services s  on s.id = bk.service_id
join resources r on r.id = bk.resource_id
join customers c on c.id = bk.customer_id
left join (select booking_id, sum(amount_minor) as paid_minor
             from payments where status = 'paid' group by booking_id) p
       on p.booking_id = bk.id;
comment on view v_bookings_agent is 'Balance is derived from paid payments, never stored, so it cannot drift.';

-- Revenue counts completed bookings and paid payments only. Pending is not revenue.
create or replace view v_month_stats with (security_invoker = true) as
select b.id as business_id,
       date_trunc('month', now() at time zone b.timezone) as month,
       count(bk.id) filter (where bk.status = 'completed')                 as completed,
       count(bk.id) filter (where bk.status in ('pending','confirmed'))    as upcoming,
       count(bk.id) filter (where bk.status = 'no_show')                   as no_shows,
       coalesce(sum(bk.price_minor) filter (where bk.status = 'completed'), 0) as booked_revenue_minor,
       coalesce((select sum(p.amount_minor) from payments p
                  where p.business_id = b.id and p.status = 'paid'
                    and p.paid_at >= date_trunc('month', now())), 0)       as collected_minor,
       b.default_currency as currency
from businesses b
left join bookings bk
       on bk.business_id = b.id
      and bk.starts_at >= date_trunc('month', now())
group by b.id, b.default_currency, b.timezone;

-- Free-tier metering. A billable transaction is a booking that got real
-- (confirmed or completed) plus any standalone paid sale with no booking behind
-- it, so a booking that is also paid counts once, not twice.
create or replace view v_month_usage with (security_invoker = true) as
select b.id as business_id, b.plan, b.quota_txn_month,
       coalesce(bk.n, 0) + coalesce(pay.n, 0) as txn_used,
       greatest(b.quota_txn_month - (coalesce(bk.n, 0) + coalesce(pay.n, 0)), 0) as txn_left,
       coalesce(cv.n, 0) as conversations_this_month
from businesses b
left join (select business_id, count(*) n from bookings
            where status in ('confirmed','completed')
              and created_at >= date_trunc('month', now())
            group by business_id) bk on bk.business_id = b.id
left join (select business_id, count(*) n from payments
            where status = 'paid' and booking_id is null
              and paid_at >= date_trunc('month', now())
            group by business_id) pay on pay.business_id = b.id
left join (select business_id, count(distinct customer_id) n from conversations
            where last_message_at >= date_trunc('month', now())
            group by business_id) cv on cv.business_id = b.id;
comment on view v_month_usage is 'The free-tier meter. Transactions, not conversations: the owner is charged when the product made her money, which is the only fair place to meter.';

-- Self-documenting schema: feed this to the agent instead of maintaining a
-- hand-written description that drifts from reality.
create or replace view v_schema_doc with (security_invoker = true) as
select c.relname as table_name,
       a.attname as column_name,
       format_type(a.atttypid, a.atttypmod) as data_type,
       col_description(c.oid, a.attnum) as column_comment,
       obj_description(c.oid) as table_comment
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
where n.nspname = 'public' and c.relkind in ('r','v')
order by c.relname, a.attnum;

-- ═══════════════════════════════════════════════════════════════ RLS
-- ON everywhere, deny by default, since 27 August 2026. No policies exist yet,
-- so the anon and authenticated roles can do NOTHING through the Data API,
-- which is exactly right for a live database with no auth story shipped. The
-- app is unaffected: the server talks to Postgres with the service role, which
-- bypasses RLS.
--
-- What waits for Clerk (PLAN.md Phase 2) is the MEMBER POLICIES below, not the
-- lockdown. They are written for Clerk via Supabase third-party auth: the JWT
-- subject is the Clerk user id, a TEXT like "user_2abc", not a uuid, so user_id
-- is text and the member check reads auth.jwt()->>'sub', never auth.uid()
-- (which expects uuid).

alter table businesses          enable row level security;
alter table channel_connections enable row level security;
alter table closures            enable row level security;
alter table services            enable row level security;
alter table resources           enable row level security;
alter table resource_services   enable row level security;
alter table customers           enable row level security;
alter table customer_identities enable row level security;
alter table bookings            enable row level security;
alter table payments            enable row level security;
alter table payment_events      enable row level security;
alter table conversations       enable row level security;
alter table messages            enable row level security;
alter table events              enable row level security;

-- Phase 2, with Clerk:
--
-- create table business_members (
--   business_id uuid references businesses(id) on delete cascade,
--   user_id     text not null,   -- Clerk user id
--   role        text not null default 'owner',
--   primary key (business_id, user_id)
-- );
-- create or replace function moni_is_member(bid uuid) returns boolean
--   language sql security definer stable set search_path = '' as $fn$
--     select exists (select 1 from public.business_members
--                     where business_id = bid and user_id = auth.jwt()->>'sub') $fn$;
--
-- create policy tenant on businesses          using (moni_is_member(id));
-- create policy tenant on channel_connections using (moni_is_member(business_id));
-- create policy tenant on closures            using (moni_is_member(business_id));
-- create policy tenant on services            using (moni_is_member(business_id));
-- create policy tenant on resources           using (moni_is_member(business_id));
-- create policy tenant on customers           using (moni_is_member(business_id));
-- create policy tenant on bookings            using (moni_is_member(business_id));
-- create policy tenant on payments            using (moni_is_member(business_id));
-- create policy tenant on conversations       using (moni_is_member(business_id));
-- create policy tenant on messages            using (moni_is_member(business_id));
-- create policy tenant on events              using (moni_is_member(business_id));
