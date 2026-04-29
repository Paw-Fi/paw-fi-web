-- Allow users to delete receipt images they own.
-- Receipt uploads use receipts/{userId}/{filename}.

create policy "Users can delete their own receipts"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'expense-receipts' and
  (storage.foldername(name))[1] = 'receipts' and
  (storage.foldername(name))[2] = auth.uid()::text
);
