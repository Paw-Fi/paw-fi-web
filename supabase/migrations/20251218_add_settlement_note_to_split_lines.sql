-- Allow attaching a user-entered note to settlements.
-- Stored on the split line so both directions of express netting can carry the note.

alter table public.expense_split_lines
  add column if not exists settlement_note text;

comment on column public.expense_split_lines.settlement_note is 'Optional note provided when marking the split line as settled.';
