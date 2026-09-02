-- A shop's look becomes a function of this integer. Phase 12.
-- The default fires for existing rows too, so every shop already published
-- gets a stable seed at migration time rather than a null the renderer has to
-- guess around.
alter table storefronts
  add column if not exists seed integer not null
    default (floor(random() * 2147483647))::int;

comment on column storefronts.seed is 'The integer a shop''s whole look is a function of. Set once per row and stable by construction. Changing it is the owner''s act on /app/site, never the model''s.';
