-- Create storage bucket for expense receipt images

-- Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('expense-receipts', 'expense-receipts', true)
on conflict (id) do nothing;

-- Set up storage policies for the bucket
-- Allow authenticated users to upload their own receipts
create policy "Users can upload their own receipts"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'expense-receipts' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own receipts
create policy "Users can view their own receipts"
on storage.objects for select
to authenticated
using (
  bucket_id = 'expense-receipts' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow service role to upload receipts (for WhatsApp webhook)
create policy "Service role can upload all receipts"
on storage.objects for insert
to service_role
with check (bucket_id = 'expense-receipts');

-- Allow service role to view all receipts (for WhatsApp webhook)
create policy "Service role can view all receipts"
on storage.objects for select
to service_role
using (bucket_id = 'expense-receipts');

-- Allow public read access (since bucket is public)
create policy "Public can view all receipts"
on storage.objects for select
to public
using (bucket_id = 'expense-receipts');
