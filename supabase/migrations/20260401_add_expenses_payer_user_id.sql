alter table public.expenses
add column if not exists payer_user_id uuid;
