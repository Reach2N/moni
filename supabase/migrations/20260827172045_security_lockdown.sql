-- Security lockdown, 27 August 2026. Fixes every advisor ERROR except
-- extension_in_public (btree_gist stays put: moving an extension under a live
-- exclusion constraint is not worth the risk for a WARN).
--
-- 1. RLS ON everywhere, deny by default. No policies yet: anon and
--    authenticated can do NOTHING through the Data API. The app is unaffected,
--    it talks to Postgres with the service role, which bypasses RLS. Member
--    policies land with Clerk (PLAN.md Phase 2).
-- 2. Views become security_invoker so they cannot bypass RLS once policies
--    exist (advisor 0010).
-- 3. moni_touch gets a pinned search_path (advisor 0011).

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

alter view v_agent_business  set (security_invoker = true);
alter view v_bookings_agent  set (security_invoker = true);
alter view v_month_stats     set (security_invoker = true);
alter view v_month_usage     set (security_invoker = true);
alter view v_schema_doc      set (security_invoker = true);

alter function moni_touch() set search_path = '';
