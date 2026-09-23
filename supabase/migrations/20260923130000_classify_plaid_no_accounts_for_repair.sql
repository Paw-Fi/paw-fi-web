update public.bank_connections
set status = 'needs_reauth',
    item_status = 'pending_relink',
    item_health_state = 'unhealthy',
    relink_state = 'no_accounts',
    error_message = 'No eligible bank accounts are shared. Please reconnect and select an account.',
    updated_at = now()
where provider = 'plaid'
  and removed_at is null
  and coalesce(item_status, '') not in ('removed', 'pending_removal')
  and upper(coalesce(error_code, '')) = 'NO_ACCOUNTS';
