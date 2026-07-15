-- Allow identifier-free, automatically granted trials to be replaced by
-- household subscription access. Genuine Stripe, App Store, and Play Store
-- trials remain protected by their durable purchase identifiers.

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
    v_has_existing_subscription boolean := false;
    v_existing_has_direct_access boolean := false;
    v_existing_has_purchase_identifiers boolean := false;
    v_existing_is_auto_granted_trial boolean := false;
    v_existing_grant_count integer := 0;
    v_descendant_grant_count integer := 0;
    v_descendant_has_purchase_identifiers boolean := false;
    v_descendant_chain_has_cycle boolean := false;
    v_binding_created boolean := false;
    v_owner_chain_ids uuid[] := array[]::uuid[];
    v_lock_user_id uuid;
    v_locked_root_id uuid;
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

    v_has_existing_subscription := found;

    if v_has_existing_subscription then
        v_existing_has_purchase_identifiers :=
            v_existing_subscription.stripe_subscription_id is not null
            or v_existing_subscription.store_product_id is not null
            or v_existing_subscription.app_store_transaction_id is not null
            or v_existing_subscription.app_store_original_transaction_id is not null
            or v_existing_subscription.play_purchase_token is not null
            or v_existing_subscription.play_order_id is not null;

        -- The onboarding trial reservation marker is written atomically before
        -- the identifier-free trial row. A Stripe customer id alone is not
        -- purchase evidence because opening the billing portal can create one.
        select exists (
            select 1
            from public.users
            where id = p_user_id
              and paywall_return_trial_granted_at is not null
        )
        into v_existing_is_auto_granted_trial;

        v_existing_is_auto_granted_trial :=
            v_existing_is_auto_granted_trial
            and v_existing_subscription.status = 'trialing'
            and not v_existing_has_purchase_identifiers;

        -- Durable provider purchase identifiers always win, including genuine
        -- Stripe, App Store, and Play Store trials.
        if v_existing_has_purchase_identifiers then
            return false;
        end if;
    end if;

    if v_has_existing_subscription
       and v_existing_subscription.bound_to_user_id is null then
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

        -- Only trials carrying Moneko's authoritative automatic-grant marker
        -- may replace active direct access. Identifier-free trial rows without
        -- that marker remain protected.
        if v_existing_has_direct_access
           and not v_existing_is_auto_granted_trial then
            return false;
        end if;
    end if;

    v_effective_owner_id := v_household_owner_id;
    v_owner_chain_ids := array[v_household_owner_id];

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

        if not v_effective_owner_id = any(v_owner_chain_ids) then
            v_owner_chain_ids := array_append(
                v_owner_chain_ids,
                v_effective_owner_id
            );
        end if;
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

    -- Serialize the target and every ownership-chain node in deterministic
    -- order. This prevents both double-binding and an intermediate owner being
    -- rebound while a downstream grant is being created.
    v_locked_root_id := v_effective_owner_id;

    for v_lock_user_id in
        select distinct lock_user_id
        from unnest(v_owner_chain_ids || array[p_user_id]) as lock_ids(lock_user_id)
        order by lock_user_id::text
    loop
        perform pg_advisory_xact_lock(hashtext(v_lock_user_id::text));
    end loop;

    perform 1
    from public.subscriptions
    where user_id = any(v_owner_chain_ids)
    order by user_id
    for update;

    -- Provider webhooks do not use the advisory locks, so validate the locked
    -- chain again after waiting for any concurrent row update.
    v_effective_owner_id := v_household_owner_id;
    v_hop_count := 0;

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

        if not found then
            return false;
        end if;

        exit when v_owner_subscription.bound_to_user_id is null;
        v_effective_owner_id := v_owner_subscription.bound_to_user_id;
    end loop;

    if v_effective_owner_id is distinct from v_locked_root_id then
        return false;
    end if;

    -- Re-read and lock the root after serialization so a concurrent provider
    -- webhook cannot invalidate the lifecycle between validation and binding.
    select *
    into v_owner_subscription
    from public.subscriptions
    where user_id = v_effective_owner_id
    order by created_at desc
    limit 1
    for update;

    if not found or v_owner_subscription.bound_to_user_id is not null then
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
            and v_owner_subscription.status in ('active', 'trialing', 'past_due')
            and v_owner_period_end is not null
            and v_owner_period_end > now()
        )
    ) then
        return false;
    end if;

    -- Re-read and lock the target too. The earlier check is only a fast exit;
    -- this locked check is authoritative against a simultaneous purchase.
    select *
    into v_existing_subscription
    from public.subscriptions
    where user_id = p_user_id
    order by created_at desc
    limit 1
    for update;

    v_has_existing_subscription := found;
    v_existing_has_purchase_identifiers := false;
    v_existing_is_auto_granted_trial := false;
    v_existing_has_direct_access := false;

    if v_has_existing_subscription then
        v_existing_has_purchase_identifiers :=
            v_existing_subscription.stripe_subscription_id is not null
            or v_existing_subscription.store_product_id is not null
            or v_existing_subscription.app_store_transaction_id is not null
            or v_existing_subscription.app_store_original_transaction_id is not null
            or v_existing_subscription.play_purchase_token is not null
            or v_existing_subscription.play_order_id is not null;

        if v_existing_has_purchase_identifiers then
            return false;
        end if;

        select exists (
            select 1
            from public.users
            where id = p_user_id
              and paywall_return_trial_granted_at is not null
        )
        into v_existing_is_auto_granted_trial;

        v_existing_is_auto_granted_trial :=
            v_existing_is_auto_granted_trial
            and v_existing_subscription.status = 'trialing';

        if v_existing_subscription.bound_to_user_id is null then
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
                    and v_existing_subscription.status in (
                        'active',
                        'trialing',
                        'past_due'
                    )
                    and v_existing_period_end is not null
                    and v_existing_period_end > now()
                );

            if v_existing_has_direct_access
               and not v_existing_is_auto_granted_trial then
                return false;
            end if;
        end if;
    end if;

    -- A user can already be a grant owner before joining another household.
    -- Flatten their entire borrowed subtree to the new root owner so future
    -- upgrade/cancellation cascades cannot leave stale intermediate grants.
    with recursive descendants(user_id) as (
        select user_id
        from public.subscriptions
        where bound_to_user_id = p_user_id

        union

        select child.user_id
        from public.subscriptions child
        join descendants parent
          on child.bound_to_user_id = parent.user_id
    )
    select
        count(*)::integer,
        coalesce(bool_or(
            s.stripe_subscription_id is not null
            or s.store_product_id is not null
            or s.app_store_transaction_id is not null
            or s.app_store_original_transaction_id is not null
            or s.play_purchase_token is not null
            or s.play_order_id is not null
        ), false),
        coalesce(bool_or(descendants.user_id = p_user_id), false)
    into
        v_descendant_grant_count,
        v_descendant_has_purchase_identifiers,
        v_descendant_chain_has_cycle
    from descendants
    join public.subscriptions s on s.user_id = descendants.user_id;

    if v_descendant_chain_has_cycle then
        raise exception 'Subscription grant chain contains a cycle';
    end if;

    if v_descendant_has_purchase_identifiers then
        return false;
    end if;

    select count(*)
    into v_existing_grant_count
    from public.subscriptions
    where bound_to_user_id = v_effective_owner_id
      and user_id <> p_user_id;

    -- The target user consumes one root grant and every descendant remains a
    -- distinct grant after flattening.
    if v_existing_grant_count + v_descendant_grant_count + 1 > 5 then
        return false;
    end if;

    -- A Stripe customer id alone is account metadata, not purchase evidence.
    -- Preserve it in the dedicated mapping before clearing the borrowed row.
    if v_has_existing_subscription
       and nullif(trim(v_existing_subscription.stripe_customer_id), '') is not null then
        insert into public.user_stripe_mapping (user_id, stripe_customer_id)
        values (p_user_id, v_existing_subscription.stripe_customer_id)
        on conflict (user_id) do update set
            stripe_customer_id = excluded.stripe_customer_id;
    end if;

    with recursive descendants(user_id) as (
        select user_id
        from public.subscriptions
        where bound_to_user_id = p_user_id

        union

        select child.user_id
        from public.subscriptions child
        join descendants parent
          on child.bound_to_user_id = parent.user_id
    )
    insert into public.user_stripe_mapping (user_id, stripe_customer_id)
    select descendants.user_id, subscriptions.stripe_customer_id
    from descendants
    join public.subscriptions subscriptions
      on subscriptions.user_id = descendants.user_id
    where nullif(trim(subscriptions.stripe_customer_id), '') is not null
    on conflict (user_id) do update set
        stripe_customer_id = excluded.stripe_customer_id;

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
        store_product_id,
        app_store_transaction_id,
        app_store_original_transaction_id,
        app_store_environment,
        app_store_in_app_ownership_type,
        play_purchase_token,
        play_order_id,
        play_package_name,
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
        null,
        null,
        null,
        null,
        null,
        null,
        null,
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
        store_product_id = null,
        app_store_transaction_id = null,
        app_store_original_transaction_id = null,
        app_store_environment = null,
        app_store_in_app_ownership_type = null,
        play_purchase_token = null,
        play_order_id = null,
        play_package_name = null,
        updated_at = now()
    where (
            public.subscriptions.bound_to_user_id is not null
            or coalesce(public.subscriptions.plan, 'free') = 'free'
            or public.subscriptions.status = 'trialing'
            or (
                coalesce(public.subscriptions.plan, 'free') <> 'free'
                and not (
                    (
                        public.subscriptions.plan = 'lifetime'
                        and public.subscriptions.status = 'active'
                    )
                    or (
                        public.subscriptions.plan <> 'free'
                        and public.subscriptions.status = 'active'
                        and (
                            public.subscriptions.plan = 'lifetime'
                            or (
                                coalesce(
                                    public.subscriptions.current_period_end,
                                    public.subscriptions.trial_end
                                ) is not null
                                and coalesce(
                                    public.subscriptions.current_period_end,
                                    public.subscriptions.trial_end
                                ) > now()
                            )
                        )
                    )
                    or (
                        public.subscriptions.plan <> 'free'
                        and public.subscriptions.status = 'past_due'
                        and coalesce(
                            public.subscriptions.current_period_end,
                            public.subscriptions.trial_end
                        ) is not null
                        and coalesce(
                            public.subscriptions.current_period_end,
                            public.subscriptions.trial_end
                        ) > now()
                    )
                )
            )
        )
      and public.subscriptions.stripe_subscription_id is null
      and public.subscriptions.store_product_id is null
      and public.subscriptions.app_store_transaction_id is null
      and public.subscriptions.app_store_original_transaction_id is null
      and public.subscriptions.play_purchase_token is null
      and public.subscriptions.play_order_id is null;

    v_binding_created := found;

    if not v_binding_created then
        return false;
    end if;

    with recursive descendants(user_id) as (
        select user_id
        from public.subscriptions
        where bound_to_user_id = p_user_id

        union

        select child.user_id
        from public.subscriptions child
        join descendants parent
          on child.bound_to_user_id = parent.user_id
    )
    update public.subscriptions s
    set
        plan = v_owner_subscription.plan,
        status = v_owner_subscription.status,
        bound_to_user_id = v_effective_owner_id,
        provider = v_owner_subscription.provider,
        stripe_subscription_id = null,
        stripe_customer_id = null,
        billing_interval = v_owner_subscription.billing_interval,
        current_period_end = v_owner_subscription.current_period_end,
        cancel_at_period_end = false,
        trial_start = v_owner_subscription.trial_start,
        trial_end = v_owner_subscription.trial_end,
        ended_at = null,
        store_product_id = null,
        app_store_transaction_id = null,
        app_store_original_transaction_id = null,
        app_store_environment = null,
        app_store_in_app_ownership_type = null,
        play_purchase_token = null,
        play_order_id = null,
        play_package_name = null,
        updated_at = now()
    where s.user_id in (select user_id from descendants);

    return true;
end;
$$;

revoke execute on function public.bind_user_to_household_subscription(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.bind_user_to_household_subscription(uuid, uuid)
to service_role;

comment on function public.bind_user_to_household_subscription(uuid, uuid) is
    'Binds marked Moneko trials, free users, or already-borrowed users to household access; preserves genuine provider purchases, flattens dependent grant chains, and caps each root owner at five borrowed users.';

-- A borrowed household owner can sponsor members using the root payer's
-- entitlement. If that intermediate owner later loses or changes its binding,
-- refresh those downstream grants so they cannot retain orphaned access.
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
    v_previous_grant_owner_id uuid;
    v_rebound boolean := false;
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

    v_previous_grant_owner_id := v_current_subscription.bound_to_user_id;

    -- Match the binding function's advisory-lock order before taking row
    -- locks. This avoids bind/remove deadlocks on the same target and root.
    if p_user_id::text < v_previous_grant_owner_id::text then
        perform pg_advisory_xact_lock(hashtext(p_user_id::text));
        perform pg_advisory_xact_lock(hashtext(v_previous_grant_owner_id::text));
    else
        perform pg_advisory_xact_lock(hashtext(v_previous_grant_owner_id::text));
        perform pg_advisory_xact_lock(hashtext(p_user_id::text));
    end if;

    select *
    into v_current_subscription
    from public.subscriptions
    where user_id = p_user_id
    order by created_at desc
    limit 1
    for update;

    if not found or v_current_subscription.bound_to_user_id is null then
        return;
    end if;

    if v_current_subscription.bound_to_user_id is distinct from
       v_previous_grant_owner_id then
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
    else
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

            exit when v_rebound;
        end loop;

        if not v_rebound then
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
        end if;
    end if;

    for v_candidate in
        select
            subscriptions.user_id,
            subscriptions.bound_to_household_id
        from public.subscriptions subscriptions
        join public.households households
          on households.id = subscriptions.bound_to_household_id
        where households.owner_id = p_user_id
          and subscriptions.bound_to_user_id = v_previous_grant_owner_id
          and subscriptions.user_id <> p_user_id
    loop
        v_rebound := public.bind_user_to_household_subscription(
            v_candidate.user_id,
            v_candidate.bound_to_household_id
        );

        if not v_rebound then
            perform public.remove_household_subscription_binding(
                v_candidate.user_id,
                v_candidate.bound_to_household_id
            );
        end if;
    end loop;
end;
$$;

revoke execute on function public.remove_household_subscription_binding(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.remove_household_subscription_binding(uuid, uuid)
to service_role;

comment on function public.remove_household_subscription_binding(uuid, uuid) is
    'Removes borrowed access, attempts a valid rebind, and refreshes downstream grants sponsored by a borrowed household owner.';
