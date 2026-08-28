-- Platform rework for the MVP plan (PLAN.md), 27 August 2026.
-- Additive only. Mirrors db/schema.sql, which mirrors src/lib/types.ts.
--
--  1. businesses gains the Clerk tenant key and the owner's teachable prompt.
--  2. channel_connections gains per-tenant credentials (owners paste their own
--     bot tokens, so the old "env key name only" design no longer covers it).
--  3. waitlist: founding-shop applications from the public landing page. The
--     app-subdomain gate checks membership here after Clerk sign-in.
--  4. webhook_events: raw inbound channel payloads, for dedupe and replay.

-- ── 1. businesses ───────────────────────────────────────────────────────────

alter table businesses add column if not exists clerk_user_id   text;
alter table businesses add column if not exists ai_instructions text;

comment on column businesses.clerk_user_id is 'Clerk user id (text like user_2abc), the tenant key. Deliberately NOT unique: the chain plan allows several businesses per owner.';
comment on column businesses.ai_instructions is 'Owner''s standing instructions for the assistant ("never discount", "always offer the promo"). Appended to the system prompt. Separate from raw_description, which is never overwritten.';

create index if not exists businesses_clerk_user
  on businesses (clerk_user_id) where clerk_user_id is not null;

-- ── 2. channel_connections ──────────────────────────────────────────────────

alter table channel_connections add column if not exists token_ciphertext text;
alter table channel_connections add column if not exists webhook_secret   text;

comment on column channel_connections.secret_ref is 'Key NAME resolved server-side (env or vault), for PLATFORM-owned secrets such as our Meta app secret.';
comment on column channel_connections.token_ciphertext is 'Owner-pasted credential (BotFather token, page access token), AES-256-GCM encrypted with the env key MONI_TOKEN_KEY before it reaches the row. Never plaintext, never sent to a client.';
comment on column channel_connections.webhook_secret is 'Random per-connection secret embedded in the webhook URL so inbound calls prove their origin.';

-- ── 3. waitlist ─────────────────────────────────────────────────────────────

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

-- ── 4. webhook_events ───────────────────────────────────────────────────────

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

-- ── platform tables are ours, not the tenant's ──────────────────────────────
-- RLS enabled with NO member policy: only the service role reads or writes.
-- Tenant tables keep RLS off until Clerk lands (PLAN.md Phase 2); these two are
-- new and public-facing (the landing page writes to waitlist), so they start
-- locked rather than inheriting the deferred plan.

alter table waitlist       enable row level security;
alter table webhook_events enable row level security;
