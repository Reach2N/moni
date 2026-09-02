# Moni: products, photos, and the menu

Status: draft, awaiting review. Scope: the product catalogue, its images, and the public
menu. It does not touch the marketing homepage (`docs/HOMEPAGE.md`), the booking engine, or
the payment rail shipped in PLAN.md Phase 10.

Date: 2026-09-02. Author: design pass, following the brainstorming skill.

## Problem

Moni cannot model a shop that sells things. Three findings, each verified against the
running code and the live key on 2 September 2026.

**1. A cafe has no catalogue.** `cafe` is a real business type with `unit: 'walk_in'`, and
the parse correctly returns it: typing "i want to create a coffee shop" into onboarding
produced `business_type: cafe`. Everything downstream then assumes services and
appointments. The setup spine counts rows in `services`, the storefront lists `services`,
the customer agent's `get_business` returns `services`, and the only selling tool it has
books a time range against a resource. A coffee shop has a menu, not appointments, so the
product's own first-run example produces a shop that can never say what it sells.

**2. `products` is a table nobody can reach.** It ships with stock decrement, orders,
gapless invoice numbers and real transactional assertions behind it. It also has no
TypeScript row type, no image column, no category, and not one reference in the dashboard
or in either agent tool set. `POST /api/orders` consumes product ids that no surface in the
product can create.

**3. There is no image path at all.** No storage bucket, no upload route, and
`@supabase/supabase-js` is installed for Storage per ARCHITECTURE.md but used only as the
database client. Image generation was probed against the live Gemini key: six image models
are visible to it, and every one answers 429 with
`GenerateRequestsPerDayPerProjectPerModel-FreeTier` among the violated quotas. Waiting past
the server's own stated retry delay did not clear it. The Vercel AI Gateway refuses the
same models outright with "Free tier users do not have access to this model".

## Decisions

### One catalogue, two kinds

ARCHITECTURE.md section 5 already specifies `v_catalog`, unioning `services` and `products`
into one shape "so the storefront and the agent read one thing rather than branching".
Build it. Every READ of what a shop sells goes through the view; every WRITE goes to the
table that owns the row.

The alternative, letting each consumer branch on business type, is how a cafe gets
forgotten in the fourth consumer somebody adds later. One view means the storefront, the
agent and the dashboard cannot disagree about what a shop sells.

### What a shop sells comes from its type, in TypeScript, with no migration

`BUSINESS_TYPES` gains `sells: 'time' | 'goods' | 'both'` on all 42 entries. A salon is
`time`. A cafe, a pharmacy and a print shop are `both`. A phone shop is `goods`. Hard rule 5
says a taxonomy that grows is `as const` in TypeScript and only closed sets get a
constraint, so this is a code change with no migration and no new column.

`businesses.capabilities`, which ARCHITECTURE.md also proposes, is deliberately **not
built**. Its purpose is to let an owner override the default, and no owner has asked to. It
stays reserved. Shipping it now would be a migration serving a hypothetical.

### Upload is the product. Generation is a bonus that may be refused

Photo upload must always work, because it is the only path that does not depend on somebody
else's billing state. Generation is offered beside it and is allowed to fail.

**No background job system in this pass.** A queue for a capability that currently cannot
run even once is infrastructure ahead of need. Generation is one request under the deadline
machinery added on 2 September, and a refusal is reported in the owner's own words: the
free allowance is used up, upload a photo instead. A product is never left holding a broken
or half written image.

This is the same shape as the payment rail: when no rail is configured, `create_payment`
says the shop cannot take QR payments yet rather than inventing one.

### Photos are public, and namespaced by shop

A product photo is displayed on a public storefront to visitors who never sign in, so a
signed URL buys nothing and costs a round trip per image. One public Supabase Storage
bucket, `shop-media`, written only by the service role, at
`{business_id}/{product_id}/{uuid}.webp`. The business id leads the path so a listing is
scoped by prefix and a deleted shop's media is one prefix to remove.

Supabase Storage rather than Vercel Blob, because ARCHITECTURE.md already rejected Blob:
Storage is provisioned, and this keeps one vendor.

## Scope

Seven pieces, in build order. Nothing else.

- **A. Types and schema.** `Product` row type, `CATALOG_KINDS`, `sells` on every business
  type, `products` gains `photo_path`, `photo_alt` and `category`, and the `v_catalog` view.
- **B. Storage and upload.** The bucket, and `POST /api/products/[id]/photo` taking raw
  bytes.
- **C. Generation.** An `image` task in `src/lib/ai/models.ts`, and an honest refusal.
- **D. Tools.** Owner tools to create, update, archive and photograph a product; a
  `search_catalogue` tool on both sides; `get_business` returns the catalogue.
- **E. Dashboard.** `/app/products`, in the shell.
- **F. Menu.** The storefront renders the catalogue, not just services.
- **G. Setup spine.** The catalogue row counts a catalogue, not services.

## Architecture

### A. Types and schema

`src/lib/types.ts` first, `db/schema.sql` follows, `npm run db:test` proves it (hard rule 2).

```ts
export const CATALOG_KINDS = ['service', 'product'] as const
export type CatalogKind = (typeof CATALOG_KINDS)[number]

export type Product = {
  id: string
  business_id: string
  name: string
  name_en: string | null
  description: string | null
  price_minor: number
  currency: CurrencyCode
  stock: number | null      // NULL means uncounted, which is not zero
  category: string | null   // "drinks", "pastries": the menu's own grouping
  photo_path: string | null // Storage key, never a URL. The bucket can move.
  photo_alt: string | null
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}
```

`photo_path` holds a Storage key and never a full URL, so the bucket or the CDN in front of
it can change without rewriting every row. One helper turns a key into a URL, in one place.

Migration `20260902140000_product_catalogue`, additive only. Every column selected below
exists on both tables today, checked against `db/schema.sql` rather than assumed:

```sql
alter table products add column if not exists category   text;
alter table products add column if not exists photo_path text;
alter table products add column if not exists photo_alt  text;

create or replace view v_catalog with (security_invoker = true) as
  select 'service'::text as kind, id, business_id, name, name_en, description,
         price_minor, currency, null::integer as stock, null::text as category,
         null::text as photo_path, null::text as photo_alt, active, sort_order,
         duration_min, unit
    from services
  union all
  select 'product'::text, id, business_id, name, name_en, description,
         price_minor, currency, stock, category, photo_path, photo_alt, active,
         sort_order, null::integer, 'item'::text
    from products;
```

The view is `security_invoker`, matching the five that already exist and the Supabase
advisor note in CLAUDE.md.

### B. Storage and upload

The bucket is created by migration rather than by hand, so a fresh checkout of the schema
produces a working product:

```sql
insert into storage.buckets (id, name, public)
values ('shop-media', 'shop-media', true)
on conflict (id) do nothing;
```

`POST /api/products/[id]/photo` takes the raw image bytes as the request body, not JSON and
not multipart, exactly as `/api/transcribe` does and for the same reason: base64 costs a
third more bytes on a phone in Takeo, and the blob's own content type is the media type.

The route validates before it writes:

- content type in `image/jpeg`, `image/png`, `image/webp`. Anything else is 415 with the
  list, never a silent accept.
- at most 6 MB, refused with 413 before the bytes reach Storage.
- the product must belong to the member's shop, checked with `businessId` like every other
  query, because RLS has zero policies and a query that forgets its tenant has nothing to
  catch it.

`DELETE` on the same path removes the photo and clears the columns.

### C. Generation, and its refusal

`src/lib/ai/models.ts` gains an `image` task, because nothing outside that file may name a
model. Its chain is the direct Gemini image models, in descending quality, with the gateway
slug first so a deployment with credits uses it:

```ts
image: ['google/gemini-3.1-flash-image', 'google:gemini-3.1-flash-image', 'google:gemini-3.1-flash-lite-image']
```

The task's budget is generous, because an image is slower than a sentence, and it is bounded
because the deadline work of 2 September applies to every task.

`generateProductPhoto()` builds the prompt from the product's own name, description and the
shop's type, and forbids text in the image: a generated photo carrying invented Khmer words
would put a lie on a real shop's menu, and letters are what image models get wrong.

Refusal is a first class result, not an exception to swallow. The route returns the reason,
and the panel says it in Khmer with the upload button beside it. The three cases worth
telling apart are the ones the router already distinguishes: the plan does not include the
model, the daily allowance is spent, and the model did not answer in time.

### D. Tools

Owner tools, added to `OWNER_TOOLS` and to `ownerTools()`, which is now
`satisfies Record<OwnerTool, Tool>` so a declared tool that is not built is a compile error:

| Tool | Group | Notes |
| --- | --- | --- |
| `create_product` | ORGANIZE | name, price, optional category and stock |
| `create_products_bulk` | ORGANIZE | "here is my menu": one call, not fifteen |
| `update_product` | ORGANIZE | price, name, stock, category, active |
| `generate_product_photo` | ORGANIZE | returns the refusal verbatim when it cannot |
| `search_catalogue` | PLAN | over `v_catalog`, both kinds |

Customer side: `search_catalogue` joins `CUSTOMER_TOOLS`, and `get_business` returns the
catalogue rather than only services, so a customer asking a cafe what it sells gets an
answer grounded in rows. `CUSTOMER_TOOLS` gets the same `satisfies` guard the owner set now
has, since leaving one side unchecked is how the owner side drifted to three declared tools
that never existed.

The agent still may not state a price it did not read from a tool. Nothing about that
changes.

### E. Dashboard

`/app/products`, added to `APP_DESTINATIONS`, which puts it in the desktop rail and the
mobile "more" sheet with no other change. The panel lists the catalogue from `v_catalog`,
filtered by a search box, with each row showing its photo, name, price through
`formatMoney()`, and stock when counted.

Per the sourcing rule, the row and the editing surface are selected from Beautiful UI
first, and the gap is reported rather than hand drawn if nothing fits. The vendored
`RecordsTable` primitive is the first candidate to evaluate.

A shop whose type `sells` is `time` sees services first and products second. `goods` is the
reverse. `both` shows both, services first only because a booking is time critical.

### F. The menu

`getStorefront()` reads `v_catalog` instead of `services`, and the four themes render a
product with its photo and a service without one. `StorefrontData` gains the kind, the
photo URL and the category so a theme can group a menu into drinks and pastries.

The generated copy is unaffected: the model still fills validated strings and never emits
markup, and prices are still rendered from rows beside its text, never inside it.

### G. The setup spine

The catalogue row currently counts active `services`, so a cafe with a full menu would sit
on "no services" forever. It counts rows in `v_catalog` instead. `hasCatalogue()` changes
with it, which also fixes the `/app` redirect that sends a shop with no services back to
onboarding.

## Data flow

```
Owner types "add iced coffee 5000 riel" into the panel or Ask Moni
  -> create_product writes products
  -> owner uploads a photo, or asks for one
       upload  -> POST /api/products/[id]/photo -> Storage -> photo_path
       generate-> image task -> bytes -> Storage -> photo_path
                  or a refusal shown beside the upload button
  -> v_catalog now carries it

Customer on Telegram: "do you have iced coffee?"
  -> search_catalogue reads v_catalog for this shop
  -> the agent quotes the row's own price

Visitor on {slug}.moni.cam
  -> getStorefront reads v_catalog
  -> the theme renders the menu with photos
```

## Error handling

- Generation refused, quota spent, or timed out: the product keeps whatever photo it had,
  the owner is told which of the three happened, and upload is offered in the same place.
- An upload of the wrong type or an oversized file is refused before anything is written,
  naming what is accepted.
- A product with no photo renders as a named row, never as a broken image. The menu must
  read correctly for a shop that uploaded nothing.
- Storage unreachable: the product is still created. A catalogue entry without a picture is
  a working catalogue entry, so the write order is row first, photo second.
- `v_catalog` for a shop with neither services nor products returns nothing, and the panel
  and menu both say so plainly rather than rendering an empty frame.

## Testing

`npm run db:test`, extended:

- `v_catalog` returns both kinds for a shop that has both, and each row carries its own
  kind, price and currency.
- the view is scoped: another shop's products never appear.
- a product with NULL stock is uncounted, not zero, through the view as well as the table.
- `hasCatalogue` is true for a shop with only products, which is the cafe case and the bug
  this pass exists to fix.
- the photo path is a key and never a URL, asserted on the shape.

`npm run test:setup`: the catalogue row completes for a products-only shop.

`npm run test:models`: the `image` task has a chain, and its refusal is classified as an
entitlement rather than a stall.

`npm run lint`, `npm run build`, `npm run shoot` at both widths.

Manual, and only possible once billing is enabled: a generated photo appears on a product
and then on the public menu.

## Non-goals

Named so they are not smuggled in.

- **Taking an order through chat.** `CUSTOMER_TOOLS` has no `create_order`, so after this
  pass a cafe's customer can be told what a drink costs but cannot buy it in the
  conversation. `POST /api/orders` and the transactional `createOrder` already exist, so
  this is the natural next pass, and it is not this one.
- **A background job system.** Revisit when generation can actually run.
- **`businesses.capabilities`.** Reserved, not built.
- **Product variants, sizes and modifiers.** A large iced coffee is a second product until
  a real shop says otherwise.
- **Instagram and TikTok**, each of which needs its own app review.
- The marketing homepage and the booking engine stay untouched.

## Verification

Complete when all of the following hold:

1. `npm run db:test`, `test:setup`, `test:models`, `test:signals` pass, extended as above.
2. `npm run lint` and `npm run build` pass.
3. A shop of type `cafe` can be described, given a menu with photos, and that menu appears
   on its public address.
4. Asking the assistant what the shop sells returns product rows with their own prices.
5. Image generation, when refused, states which refusal it was and offers the upload.
6. `npm run shoot` is clean at both widths and the marketing captures are unchanged.

## Human blockers

- **Image generation needs billing.** The Gemini free tier's daily per-model allowance for
  every image model is spent, and the Vercel gateway refuses them on the free tier. Enable
  billing on the Google Cloud project, or top up gateway credits. Until then the feature
  ships, is reachable, and honestly reports that it cannot run.

## Related documents

- `docs/superpowers/specs/2026-09-02-universal-app-design.md`: the pass this builds on.
- `ARCHITECTURE.md` section 5: the data model additions this implements, and the
  `capabilities` column it deliberately leaves reserved.
- `PLAN.md` Phase 8: orders, stock and invoices, which already stand behind `products`.
- `docs/ONBOARDING.md`: the setup spine whose catalogue row changes here.
