-- Backfill denormalized household member names from users.full_name.
-- Some environments do not have household_members.user_name; in that case,
-- this migration is a safe no-op.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'household_members'
      AND column_name = 'user_name'
  ) THEN
    UPDATE public.household_members AS hm
    SET user_name = trim(u.full_name)
    FROM public.users AS u
    WHERE hm.user_id = u.id
      AND nullif(trim(u.full_name), '') IS NOT NULL
      AND hm.user_name IS DISTINCT FROM trim(u.full_name);
  ELSE
    RAISE NOTICE 'Skipping backfill: public.household_members.user_name does not exist';
  END IF;
END
$$;
