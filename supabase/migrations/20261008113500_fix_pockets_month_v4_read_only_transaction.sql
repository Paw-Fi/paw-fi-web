-- The v4 month reader calls v3, whose legacy v1 helper can repair unbound
-- budget envelopes with an UPDATE. PostgREST runs STABLE RPCs in read-only
-- transactions, so that conditional repair fails with SQLSTATE 25006.
-- Change only the volatility; retain the function body and revision contract.
alter function public.get_pockets_month_v4(
  uuid,
  text,
  date,
  uuid,
  text,
  boolean,
  boolean
) volatile;

-- Refresh PostgREST's cached function volatility after the change commits.
notify pgrst, 'reload schema';
