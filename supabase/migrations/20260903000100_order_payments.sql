-- A payment can pay for goods, not only for time. Phase 13.
--
-- `on delete set null` and not cascade: a deleted order must never take the
-- record of money with it. The payment row is the accounting record and it
-- outlives whatever it was for.
--
-- No CHECK forcing exactly one of booking_id and order_id. A standalone sale
-- with neither is already a legitimate row today (`record_manual_payment`
-- writes one for cash over the counter), so a constraint written for tidiness
-- would refuse working data.
alter table payments
  add column if not exists order_id uuid references orders(id) on delete set null;

comment on column payments.order_id is 'The order this pays for, when it pays for goods rather than time. A payment hangs off a booking or an order and never both, and neither is also legal (cash over the counter). booking_id staying NULL here is what makes a paid row count as a standalone sale in v_month_usage.';

-- Partial: the overwhelming majority of payment rows are for bookings and carry
-- a null here, and they have no business in an index nothing queries them by.
create index if not exists payments_order on payments (order_id)
  where order_id is not null;
