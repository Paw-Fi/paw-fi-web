-- Fix receipt storage policies to match actual folder structure: receipts/{userId}/{filename}
-- This migration updates the policies to work with the receipts/ prefix folder
-- and allows all authenticated users to view receipts (for household sharing)

-- Drop old policies that expected {userId}/ as first folder
drop policy if exists "Users can upload their own receipts" on storage.objects;
drop policy if exists "Users can view their own receipts" on storage.objects;
drop policy if exists "Public can view all receipts" on storage.objects;

-- Create new policies for receipts/{userId}/ folder structure
-- Allow authenticated users to upload their own receipts
create policy "Users can upload their own receipts"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'expense-receipts' and
  (storage.foldername(name))[1] = 'receipts' and
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow ALL authenticated users to view any receipt (for household sharing)
create policy "Authenticated users can view all receipts"
on storage.objects for select
to authenticated
using (
  bucket_id = 'expense-receipts' and
  (storage.foldername(name))[1] = 'receipts'
);
