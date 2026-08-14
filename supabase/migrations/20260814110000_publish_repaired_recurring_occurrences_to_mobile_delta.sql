-- The initial recurring-occurrence split repair predates this delta-publication
-- fix. Repaired actuals were linked to their new groups without advancing the
-- expenses delta cursor, leaving already-installed clients with stale local
-- rows that lacked split_group_id.
--
-- Restrict the touch to groups created materially after their confirmation:
-- normal confirmation creates its group within the same short transaction,
-- whereas this legacy repair creates the group long after the occurrence.

set lock_timeout = '10s';

update public.expenses actual
set updated_at = clock_timestamp()
from public.recurring_occurrences occurrence
join public.expense_split_groups split_group
  on split_group.id = occurrence.split_group_id
 and split_group.expense_id = occurrence.actual_transaction_id
 and split_group.recurring_occurrence_id = occurrence.id
 and split_group.is_recurring_template is false
where actual.id = occurrence.actual_transaction_id
  and actual.deleted_at is null
  and occurrence.status = 'confirmed'
  and actual.split_group_id = split_group.id
  and occurrence.confirmed_at is not null
  and split_group.created_at > occurrence.confirmed_at + interval '1 minute'
  and actual.updated_at < split_group.created_at;

reset lock_timeout;
