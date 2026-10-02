-- Link completion owns Link metadata, not concurrently received webhook progress.
do $$
declare
  v_definition text;
  v_original text := 'metadata = p_metadata,';
  v_replacement text := $patch$metadata = coalesce(metadata, '{}'::jsonb) ||
        (coalesce(p_metadata, '{}'::jsonb) - array['plaid_sync_status',
          'initial_update_complete', 'historical_update_complete', 'sync_status_updated_at']),$patch$;
begin
  v_definition := pg_get_functiondef(
    'public.complete_plaid_update_mode_v1(uuid,uuid,uuid,text,uuid,jsonb,text[],jsonb,text,text,text)'::regprocedure);
  if position(v_replacement in v_definition) > 0 then return; end if;
  if position(v_original in v_definition) = 0 then
    raise exception 'Unexpected Plaid update-mode metadata definition';
  end if;
  execute replace(v_definition, v_original, v_replacement);
end;
$$;
notify pgrst, 'reload schema';
