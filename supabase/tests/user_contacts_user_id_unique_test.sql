BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(1);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_contacts_user_id_unique'
      AND conrelid = 'public.user_contacts'::regclass
      AND contype = 'u'
  ),
  'user_contacts has a unique constraint for one row per user_id'
);

SELECT * FROM finish();

ROLLBACK;
