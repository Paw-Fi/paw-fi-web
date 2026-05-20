-- One-time production audit for household subscription binding downgrades.
-- Review rows manually against Stripe/App Store/Play Store before repair.

with suspicious_subscription_events as (
  select
    se.user_id,
    max(se.created_at) as last_suspicious_event_at,
    array_agg(
      distinct concat_ws(
        ' -> ',
        nullif(se.old_plan, ''),
        nullif(se.new_plan, '')
      )
    ) filter (
      where se.old_plan is not null or se.new_plan is not null
    ) as plan_transitions
  from public.subscription_events se
  where coalesce(se.old_plan, '') in ('lifetime', 'plus', 'premium')
    and coalesce(se.new_plan, '') in ('free', 'plus', 'premium', 'lifetime')
  group by se.user_id
),
current_subscription_snapshot as (
  select distinct on (s.user_id)
    s.*
  from public.subscriptions s
  order by s.user_id, s.updated_at desc nulls last, s.created_at desc
),
iap_binding_snapshot as (
  select
    iab.user_id,
    array_agg(distinct iab.original_transaction_id) as app_store_original_transaction_ids,
    array_agg(distinct iab.store_product_id) filter (
      where iab.store_product_id is not null
    ) as app_store_product_ids
  from public.iap_account_bindings iab
  group by iab.user_id
)
select
  s.user_id,
  u.email,
  s.id as subscription_id,
  s.plan,
  s.status,
  s.provider,
  s.bound_to_user_id,
  s.bound_to_household_id,
  s.stripe_subscription_id,
  s.stripe_customer_id,
  s.store_product_id,
  s.app_store_transaction_id,
  s.app_store_original_transaction_id,
  s.play_purchase_token,
  s.play_order_id,
  usm.stripe_customer_id as mapped_stripe_customer_id,
  ib.app_store_original_transaction_ids,
  ib.app_store_product_ids,
  s.current_period_end,
  s.updated_at,
  e.last_suspicious_event_at,
  e.plan_transitions,
  case
    when s.bound_to_user_id is not null
      and (
        s.stripe_subscription_id is not null
        or s.store_product_id is not null
        or s.app_store_transaction_id is not null
        or s.app_store_original_transaction_id is not null
        or s.play_purchase_token is not null
        or s.play_order_id is not null
      ) then 'bound_row_still_has_direct_purchase_identifiers'
    when s.plan = 'free'
      and (
        usm.user_id is not null
        or ib.user_id is not null
      ) then 'free_row_with_external_purchase_mapping'
    when s.bound_to_user_id is not null then 'currently_borrowed_access'
    when s.plan = 'free' and e.user_id is not null then 'prior_paid_plan_now_free'
    when s.stripe_subscription_id is null
      and s.plan = 'free'
      and e.user_id is not null then 'possible_cleared_stripe_entitlement'
    else 'review'
  end as audit_reason
from current_subscription_snapshot s
left join auth.users u on u.id = s.user_id
left join suspicious_subscription_events e on e.user_id = s.user_id
left join public.user_stripe_mapping usm on usm.user_id = s.user_id
left join iap_binding_snapshot ib on ib.user_id = s.user_id
where s.bound_to_user_id is not null
   or (
     s.plan = 'free'
     and e.user_id is not null
   )
   or (
     s.plan = 'free'
     and (
       usm.user_id is not null
       or ib.user_id is not null
     )
   )
   or (
     s.stripe_subscription_id is null
     and s.plan = 'free'
     and e.user_id is not null
   )
order by
  e.last_suspicious_event_at desc nulls last,
  s.updated_at desc nulls last;
