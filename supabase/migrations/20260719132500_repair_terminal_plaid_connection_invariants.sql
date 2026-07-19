set lock_timeout = '5s';
set statement_timeout = '10min';

-- Older lifecycle code could leave a Plaid connection partially terminal.
-- Normalize the complete tuple in one statement so both the original and the
-- stricter terminal-preservation trigger accept the repair. pending_removal
-- rows without removed_at are excluded because those Items still require
-- provider cleanup.
update public.bank_connections connection
set status = 'disabled',
    item_status = 'removed',
    item_health_state = 'removed',
    relink_state = null,
    removed_at = coalesce(connection.removed_at, now()),
    access_token_encrypted = null,
    plaid_access_token_encrypted = null,
    next_manual_refresh_eligible_at = null,
    updated_at = now()
where connection.provider = 'plaid'
  and (
    connection.status = 'disabled'
    or connection.item_status = 'removed'
    or connection.removed_at is not null
  )
  and (
    connection.item_status is distinct from 'pending_removal'
    or connection.removed_at is not null
  )
  and (
    connection.status is distinct from 'disabled'
    or connection.item_status is distinct from 'removed'
    or connection.item_health_state is distinct from 'removed'
    or connection.relink_state is not null
    or connection.removed_at is null
    or connection.access_token_encrypted is not null
    or connection.plaid_access_token_encrypted is not null
    or connection.next_manual_refresh_eligible_at is not null
  );

delete from public.bank_connection_tokens token
using public.bank_connections connection
where connection.id = token.bank_connection_id
  and connection.provider = 'plaid'
  and connection.status = 'disabled'
  and connection.item_status = 'removed'
  and connection.removed_at is not null;
