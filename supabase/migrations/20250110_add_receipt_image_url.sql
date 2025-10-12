-- Add receipt_image_url column to expenses table for storing WhatsApp receipt images

-- Add column if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'expenses'
    and column_name = 'receipt_image_url'
  ) then
    alter table public.expenses add column receipt_image_url text;
    comment on column public.expenses.receipt_image_url is 'Supabase Storage URL for receipt image if uploaded via WhatsApp';
  end if;
end $$;
