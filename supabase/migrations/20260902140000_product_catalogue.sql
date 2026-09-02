-- The product catalogue, 2 September 2026.
-- Additive only. Mirrors db/schema.sql, which mirrors src/lib/types.ts.
--
-- `products` has shipped since Phase 8 with stock decrement, orders and gapless
-- invoice numbers behind it, and nothing could reach it: no row type, no image,
-- and not one reference in the dashboard or either agent tool set. A cafe was
-- therefore unmodellable, which is what this migration ends.

alter table products add column if not exists category   text;
alter table products add column if not exists photo_path text;
alter table products add column if not exists photo_alt  text;

comment on column products.category is 'The menu''s own grouping, in the owner''s words. NULL means ungrouped, which is correct for a shop with six things.';
comment on column products.photo_path is 'Supabase Storage key inside the shop-media bucket, never a URL. The bucket or the CDN in front of it can change without rewriting every row.';

create or replace view
v_catalog with (security_invoker = true) as
  select 'service'::text as kind, s.id, s.business_id, s.name, s.name_en, s.description,
         s.price_minor, s.currency, null::integer as stock, null::text as category,
         null::text as photo_path, null::text as photo_alt, s.active, s.sort_order,
         s.duration_min, s.unit
    from services s
  union all
  select 'product'::text, p.id, p.business_id, p.name, p.name_en, p.description,
         p.price_minor, p.currency, p.stock, p.category, p.photo_path, p.photo_alt,
         p.active, p.sort_order, null::integer, 'item'::text
    from products p;

-- Product photos are shown to visitors who never sign in, so a signed URL buys
-- nothing and costs a round trip per image. Public read, service role write.
insert into storage.buckets (id, name, public)
values ('shop-media', 'shop-media', true)
on conflict (id) do nothing;
