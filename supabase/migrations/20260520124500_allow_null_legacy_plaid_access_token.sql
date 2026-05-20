do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'bank_connections'
  ) then
    -- Preserve active legacy Plaid tokens by copying them into the normalized
    -- provider token column before relaxing the old provider-specific column.
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'bank_connections'
        and column_name = 'access_token_encrypted'
    ) and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'bank_connections'
        and column_name = 'plaid_access_token_encrypted'
    ) then
      update public.bank_connections
      set access_token_encrypted = nullif(plaid_access_token_encrypted, '')
      where access_token_encrypted is null
        and nullif(plaid_access_token_encrypted, '') is not null
        and removed_at is null;
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'bank_connections'
        and column_name = 'plaid_access_token_encrypted'
    ) then
      alter table public.bank_connections
        alter column plaid_access_token_encrypted drop not null;

      comment on column public.bank_connections.plaid_access_token_encrypted is
        'Legacy Plaid-specific access token column. New code uses access_token_encrypted and reads this only as a fallback for old rows; removed connections must not retain tokens here.';
    end if;

    -- After the column is nullable, clear legacy token residue on rows that are
    -- already removed. Active rows are left intact for fallback compatibility.
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'bank_connections'
        and column_name = 'access_token_encrypted'
    ) and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'bank_connections'
        and column_name = 'plaid_access_token_encrypted'
    ) then
      update public.bank_connections
      set
        access_token_encrypted = null,
        plaid_access_token_encrypted = null
      where provider = 'plaid'
        and removed_at is not null
        and (
          access_token_encrypted is not null
          or plaid_access_token_encrypted is not null
        );
    end if;
  end if;
end $$;
