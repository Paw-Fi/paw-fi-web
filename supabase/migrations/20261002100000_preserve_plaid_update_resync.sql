-- Preserve the follow-up sync request when update-mode completion finds an
-- already pending or processing job for this connection.
do $$
declare
  v_definition text;
  v_declaration text := '  v_now TIMESTAMPTZ := NOW();';
  v_insert text := '  ON CONFLICT DO NOTHING;';
  v_replacement text := $patch$  ON CONFLICT DO NOTHING
  RETURNING id INTO v_job_id;

  IF v_job_id IS NULL THEN
    UPDATE public.bank_connections
    SET needs_resync = TRUE, updated_at = v_now
    WHERE id = p_connection_id;
  END IF;$patch$;
begin
  v_definition := pg_get_functiondef(
    'public.complete_plaid_update_mode_v1(uuid,uuid,uuid,text,uuid,jsonb,text[],jsonb,text,text,text)'::regprocedure);
  if position(v_replacement in v_definition) > 0 then
    return;
  end if;
  if position(v_declaration in v_definition) = 0
    or position(v_insert in v_definition) = 0 then
    raise exception 'Unexpected Plaid update-mode completion definition';
  end if;
  v_definition := replace(v_definition, v_declaration,
    v_declaration || E'\n  v_job_id UUID;');
  execute replace(v_definition, v_insert, v_replacement);
end;
$$;

notify pgrst, 'reload schema';
