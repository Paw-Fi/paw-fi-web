-- Enforce a maximum of five borrowed subscription grants per root owner.

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
    v_existing_grant_count integer := 0;
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
            or v_existing_subscription.stripe_customer_id is not null
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

    perform pg_advisory_xact_lock(hashtext(v_effective_owner_id::text));

    select count(*)
    into v_existing_grant_count
    from public.subscriptions
    where bound_to_user_id = v_effective_owner_id
      and user_id <> p_user_id;

    if v_existing_grant_count >= 5 then
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
                        and public.subscriptions.status = 'trialing'
                        and coalesce(
                            public.subscriptions.current_period_end,
                            public.subscriptions.trial_end
                        ) is not null
                        and coalesce(
                            public.subscriptions.current_period_end,
                            public.subscriptions.trial_end
                        ) > now()
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
      and public.subscriptions.stripe_customer_id is null
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
    'Binds a free or already-borrowed user to household subscription access without overwriting direct paid/IAP/Stripe entitlements, capped at five borrowed users per root subscription owner.';

create or replace function public.enforce_household_subscription_grant_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    v_existing_grant_count integer := 0;
begin
    if new.bound_to_user_id is null then
        return new;
    end if;

    if new.stripe_subscription_id is not null
       or new.stripe_customer_id is not null
       or new.store_product_id is not null
       or new.app_store_transaction_id is not null
       or new.app_store_original_transaction_id is not null
       or new.play_purchase_token is not null
       or new.play_order_id is not null then
        raise exception 'Bound subscription rows cannot contain direct purchase identifiers';
    end if;

    if tg_op = 'UPDATE'
       and old.bound_to_user_id is not distinct from new.bound_to_user_id
       and old.user_id is not distinct from new.user_id then
        return new;
    end if;

    perform pg_advisory_xact_lock(hashtext(new.bound_to_user_id::text));

    select count(*)
    into v_existing_grant_count
    from public.subscriptions
    where bound_to_user_id = new.bound_to_user_id
      and user_id <> new.user_id;

    if v_existing_grant_count >= 5 then
        raise exception 'Household subscription sharing limit reached';
    end if;

    return new;
end;
$$;

drop trigger if exists enforce_household_subscription_grant_limit on public.subscriptions;

create trigger enforce_household_subscription_grant_limit
before insert or update of user_id, bound_to_user_id
on public.subscriptions
for each row
execute function public.enforce_household_subscription_grant_limit();
