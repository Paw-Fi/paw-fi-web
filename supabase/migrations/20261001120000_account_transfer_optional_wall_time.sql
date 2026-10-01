-- Preserve historical calendar dates; NULL means no transfer time was recorded.
alter table public.account_transfers
  add column if not exists time time without time zone null;

comment on column public.account_transfers.time is
  'User-entered wall-clock time, independent of timezone changes. NULL means unknown.';
