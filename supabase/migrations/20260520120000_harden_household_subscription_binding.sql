-- Harden household subscription sharing so borrowed access can never overwrite
-- a user's direct paid subscription entitlement.

create or replace function public.bind_user_to_household_subscription(
    p_user_id uuid,
    p_household_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_household_owner_id uuid;
    v_effective_owner_id uuid;
    v_owner_subscription record;
    v_existing_subscription record;
    v_hop_count integer := 0;
    v_owner_period_end timestamptz;
    v_existing_period_end timestamptz;
    v_existing_has_direct_access boolean := false;
    v_existing_has_direct_purchase_evidence boolean := false;
    v_existing_has_direct_identifiers boolean := false;
begin
    select owner_id into v_household_owner_id
    from public.households
    where id = p_household_id;

    if v_household_owner_id is null then
        raise exception 'Household not found';
    end if;

    if v_household_owner_id = p_user_id then
        return false;
    end if;

    if not exists (
        select 1
        from public.household_members
        where household_id = p_household_id
          and user_id = p_user_id
    ) then
        raise exception 'User is not a member of this household';
    end if;

    select *
    into v_existing_subscription
    from public.subscriptions
    where user_id = p_user_id
    order by created_at desc
    limit 1;

    if found then
        v_existing_has_direct_identifiers :=
            v_existing_subscription.stripe_subscription_id is not null
            or v_existing_subscription.store_product_id is not null
            or v_existing_subscription.app_store_transaction_id is not null
            or v_existing_subscription.app_store_original_transaction_id is not null
            or v_existing_subscription.play_purchase_token is not null
            or v_existing_subscription.play_order_id is not null;
    end if;

    if found and v_existing_subscription.bound_to_user_id is not null then
        if v_existing_has_direct_identifiers then
            return false;
        end if;
    elsif found then
        v_existing_period_end := coalesce(
            v_existing_subscription.current_period_end,
            v_existing_subscription.trial_end
        );

        v_existing_has_direct_access :=
            (
                v_existing_subscription.plan = 'lifetime'
                and v_existing_subscription.status = 'active'
            )
            or (
                v_existing_subscription.plan <> 'free'
                and v_existing_subscription.status = 'active'
                and (
                    v_existing_subscription.plan = 'lifetime'
                    or (
                        v_existing_period_end is not null
                        and v_existing_period_end > now()
                    )
                )
            )
            or (
                v_existing_subscription.plan <> 'free'
                and v_existing_subscription.status = 'trialing'
                and v_existing_period_end is not null
                and v_existing_period_end > now()
            )
            or (
                v_existing_subscription.plan <> 'free'
                and v_existing_subscription.status = 'past_due'
                and v_existing_period_end is not null
                and v_existing_period_end > now()
            );

        -- Provider alone is not durable purchase evidence for inactive rows.
        -- Active direct access is protected by v_existing_has_direct_access;
        -- stored billing/store identifiers protect direct purchase ownership.
        v_existing_has_direct_purchase_evidence :=
            v_existing_has_direct_identifiers;

        if v_existing_has_direct_access or v_existing_has_direct_purchase_evidence then
            return false;
        end if;
    end if;

    v_effective_owner_id := v_household_owner_id;

    loop
        v_hop_count := v_hop_count + 1;

        if v_hop_count > 10 then
            raise exception 'Subscription ownership chain is too deep';
        end if;

        select *
        into v_owner_subscription
        from public.subscriptions
        where user_id = v_effective_owner_id
        order by created_at desc
        limit 1;

        if not found or v_owner_subscription.plan is null then
            return false;
        end if;

        exit when v_owner_subscription.bound_to_user_id is null;

        if v_owner_subscription.bound_to_user_id = v_effective_owner_id then
            raise exception 'Subscription ownership chain contains a cycle';
        end if;

        v_effective_owner_id := v_owner_subscription.bound_to_user_id;
    end loop;

    if v_effective_owner_id = p_user_id then
        return false;
    end if;

    v_owner_period_end := coalesce(
        v_owner_subscription.current_period_end,
        v_owner_subscription.trial_end
    );

    if not (
        (
            v_owner_subscription.plan = 'lifetime'
            and v_owner_subscription.status = 'active'
        )
        or (
            v_owner_subscription.plan <> 'free'
            and v_owner_subscription.status = 'active'
            and (
                v_owner_subscription.plan = 'lifetime'
                or (
                    v_owner_period_end is not null
                    and v_owner_period_end > now()
                )
            )
        )
        or (
            v_owner_subscription.plan <> 'free'
            and v_owner_subscription.status = 'trialing'
            and v_owner_period_end is not null
            and v_owner_period_end > now()
        )
        or (
            v_owner_subscription.plan <> 'free'
            and v_owner_subscription.status = 'past_due'
            and v_owner_period_end is not null
            and v_owner_period_end > now()
        )
    ) then
        return false;
    end if;

    insert into public.subscriptions (
        user_id,
        plan,
        status,
        bound_to_user_id,
        bound_to_household_id,
        provider,
        stripe_subscription_id,
        stripe_customer_id,
        billing_interval,
        current_period_end,
        cancel_at_period_end,
        trial_start,
        trial_end,
        ended_at,
        created_at,
        updated_at
    )
    values (
        p_user_id,
        v_owner_subscription.plan,
        v_owner_subscription.status,
        v_effective_owner_id,
        p_household_id,
        v_owner_subscription.provider,
        null,
        null,
        v_owner_subscription.billing_interval,
        v_owner_subscription.current_period_end,
        false,
        v_owner_subscription.trial_start,
        v_owner_subscription.trial_end,
        null,
        now(),
        now()
    )
    on conflict (user_id) do update set
        plan = excluded.plan,
        status = excluded.status,
        bound_to_user_id = excluded.bound_to_user_id,
        bound_to_household_id = excluded.bound_to_household_id,
        provider = excluded.provider,
        stripe_subscription_id = null,
        stripe_customer_id = null,
        billing_interval = excluded.billing_interval,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = false,
        trial_start = excluded.trial_start,
        trial_end = excluded.trial_end,
        ended_at = null,
        updated_at = now()
    where (
            public.subscriptions.bound_to_user_id is not null
            or coalesce(public.subscriptions.plan, 'free') = 'free'
        )
      and public.subscriptions.stripe_subscription_id is null
      and public.subscriptions.store_product_id is null
      and public.subscriptions.app_store_transaction_id is null
      and public.subscriptions.app_store_original_transaction_id is null
      and public.subscriptions.play_purchase_token is null
      and public.subscriptions.play_order_id is null;

    return found;
end;
$$;

grant execute on function public.bind_user_to_household_subscription(uuid, uuid) to service_role;

comment on function public.bind_user_to_household_subscription(uuid, uuid) is
    'Binds a free or already-borrowed user to household subscription access without overwriting direct paid/IAP/Stripe entitlements.';

create or replace function public.remove_household_subscription_binding(
    p_user_id uuid,
    p_household_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_current_subscription record;
    v_candidate record;
    v_rebound boolean;
    v_current_has_direct_identifiers boolean := false;
begin
    select *
    into v_current_subscription
    from public.subscriptions
    where user_id = p_user_id
    order by created_at desc
    limit 1;

    if not found or v_current_subscription.bound_to_user_id is null then
        return;
    end if;

    if p_household_id is not null
       and v_current_subscription.bound_to_household_id is distinct from p_household_id then
        return;
    end if;

    v_current_has_direct_identifiers :=
        v_current_subscription.stripe_subscription_id is not null
        or v_current_subscription.store_product_id is not null
        or v_current_subscription.app_store_transaction_id is not null
        or v_current_subscription.app_store_original_transaction_id is not null
        or v_current_subscription.play_purchase_token is not null
        or v_current_subscription.play_order_id is not null;

    if v_current_has_direct_identifiers then
        update public.subscriptions
        set
            bound_to_user_id = null,
            bound_to_household_id = null,
            updated_at = now()
        where user_id = p_user_id
          and bound_to_user_id is not null
          and (p_household_id is null or bound_to_household_id = p_household_id);

        return;
    end if;

    for v_candidate in
        select hm.household_id
        from public.household_members hm
        where hm.user_id = p_user_id
          and (p_household_id is null or hm.household_id <> p_household_id)
        order by hm.joined_at desc, hm.created_at desc
    loop
        v_rebound := public.bind_user_to_household_subscription(
            p_user_id,
            v_candidate.household_id
        );

        if v_rebound then
            return;
        end if;
    end loop;

    update public.subscriptions
    set
        plan = 'free',
        status = 'active',
        bound_to_user_id = null,
        bound_to_household_id = null,
        provider = 'stripe',
        stripe_subscription_id = null,
        stripe_customer_id = null,
        billing_interval = null,
        current_period_end = null,
        cancel_at_period_end = false,
        trial_start = null,
        trial_end = null,
        updated_at = now()
    where user_id = p_user_id
      and bound_to_user_id is not null
      and (p_household_id is null or bound_to_household_id = p_household_id);
end;
$$;

grant execute on function public.remove_household_subscription_binding(uuid, uuid) to service_role;

comment on function public.remove_household_subscription_binding(uuid, uuid) is
    'Removes borrowed household subscription access, rebinding through another active household before falling back to free.';

create or replace function public.cascade_subscription_cancellation(
    p_owner_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_affected_count integer;
    v_owner_stripe_customer_id text;
    v_candidate record;
begin
    select stripe_customer_id
    into v_owner_stripe_customer_id
    from public.subscriptions
    where user_id = p_owner_user_id
    order by created_at desc
    limit 1;

    v_affected_count := 0;

    for v_candidate in
        select user_id, bound_to_household_id
        from public.subscriptions
        where (
                bound_to_user_id = p_owner_user_id
                or (
                    bound_to_user_id is not null
                    and stripe_customer_id = v_owner_stripe_customer_id
                    and stripe_customer_id is not null
                    and user_id <> p_owner_user_id
                )
            )
          and stripe_subscription_id is null
          and store_product_id is null
          and app_store_transaction_id is null
          and app_store_original_transaction_id is null
          and play_purchase_token is null
          and play_order_id is null
    loop
        perform public.remove_household_subscription_binding(
            v_candidate.user_id,
            v_candidate.bound_to_household_id
        );
        v_affected_count := v_affected_count + 1;
    end loop;

    return v_affected_count;
end;
$$;

grant execute on function public.cascade_subscription_cancellation(uuid) to service_role;

comment on function public.cascade_subscription_cancellation(uuid) is
    'Removes borrowed household access when an owner subscription is canceled without mutating direct purchase rows.';

create or replace function public.cascade_subscription_upgrade(
    p_owner_user_id uuid,
    p_new_plan text,
    p_new_status text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_affected_count integer;
    v_owner_subscription record;
begin
    select
        plan,
        status,
        provider,
        billing_interval,
        current_period_end,
        trial_start,
        trial_end
    into v_owner_subscription
    from public.subscriptions
    where user_id = p_owner_user_id
    order by created_at desc
    limit 1;

    if not found then
        return 0;
    end if;

    update public.subscriptions
    set
        plan = v_owner_subscription.plan,
        status = v_owner_subscription.status,
        provider = v_owner_subscription.provider,
        billing_interval = v_owner_subscription.billing_interval,
        current_period_end = v_owner_subscription.current_period_end,
        cancel_at_period_end = false,
        trial_start = v_owner_subscription.trial_start,
        trial_end = v_owner_subscription.trial_end,
        stripe_subscription_id = null,
        stripe_customer_id = null,
        ended_at = null,
        updated_at = now()
    where bound_to_user_id = p_owner_user_id
      and stripe_subscription_id is null
      and store_product_id is null
      and app_store_transaction_id is null
      and app_store_original_transaction_id is null
      and play_purchase_token is null
      and play_order_id is null;

    get diagnostics v_affected_count = row_count;
    return v_affected_count;
end;
$$;

grant execute on function public.cascade_subscription_upgrade(uuid, text, text) to service_role;

comment on function public.cascade_subscription_upgrade(uuid, text, text) is
    'Refreshes borrowed household access after owner subscription changes without copying owner billing identifiers.';
