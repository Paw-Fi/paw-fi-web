begin;

create extension if not exists pgtap;

select plan(25);

do $$
declare
    v_stripe_owner_id uuid := gen_random_uuid();
    v_stripe_auto_trial_user_id uuid := gen_random_uuid();
    v_stripe_direct_trial_user_id uuid := gen_random_uuid();
    v_stripe_unmarked_trial_user_id uuid := gen_random_uuid();
    v_stripe_descendant_user_id uuid := gen_random_uuid();
    v_app_store_owner_id uuid := gen_random_uuid();
    v_app_store_auto_trial_user_id uuid := gen_random_uuid();
    v_app_store_direct_trial_user_id uuid := gen_random_uuid();
    v_stripe_household_id uuid := gen_random_uuid();
    v_app_store_household_id uuid := gen_random_uuid();
    v_stripe_descendant_household_id uuid := gen_random_uuid();
    v_user_id uuid;
begin
    perform set_config('test.stripe_owner_id', v_stripe_owner_id::text, false);
    perform set_config(
        'test.stripe_auto_trial_user_id',
        v_stripe_auto_trial_user_id::text,
        false
    );
    perform set_config(
        'test.stripe_direct_trial_user_id',
        v_stripe_direct_trial_user_id::text,
        false
    );
    perform set_config(
        'test.stripe_unmarked_trial_user_id',
        v_stripe_unmarked_trial_user_id::text,
        false
    );
    perform set_config(
        'test.stripe_descendant_user_id',
        v_stripe_descendant_user_id::text,
        false
    );
    perform set_config('test.app_store_owner_id', v_app_store_owner_id::text, false);
    perform set_config(
        'test.app_store_auto_trial_user_id',
        v_app_store_auto_trial_user_id::text,
        false
    );
    perform set_config(
        'test.app_store_direct_trial_user_id',
        v_app_store_direct_trial_user_id::text,
        false
    );
    perform set_config(
        'test.stripe_household_id',
        v_stripe_household_id::text,
        false
    );
    perform set_config(
        'test.app_store_household_id',
        v_app_store_household_id::text,
        false
    );

    foreach v_user_id in array array[
        v_stripe_owner_id,
        v_stripe_auto_trial_user_id,
        v_stripe_direct_trial_user_id,
        v_stripe_unmarked_trial_user_id,
        v_stripe_descendant_user_id,
        v_app_store_owner_id,
        v_app_store_auto_trial_user_id,
        v_app_store_direct_trial_user_id
    ] loop
        insert into auth.users (
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        )
        values (
            v_user_id,
            'authenticated',
            'authenticated',
            v_user_id::text || '@household-binding.test',
            '',
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{}'::jsonb,
            now(),
            now()
        );
    end loop;

    update public.users
    set paywall_return_trial_granted_at = now()
    where id in (
        v_stripe_auto_trial_user_id,
        v_app_store_auto_trial_user_id
    );

    insert into public.households (id, name, owner_id, currency, created_at)
    values
        (
            v_stripe_household_id,
            'Stripe household binding test',
            v_stripe_owner_id,
            'USD',
            now()
        ),
        (
            v_app_store_household_id,
            'App Store household binding test',
            v_app_store_owner_id,
            'USD',
            now()
        ),
        (
            v_stripe_descendant_household_id,
            'Intermediate grant owner household test',
            v_stripe_auto_trial_user_id,
            'USD',
            now()
        );

    insert into public.household_members (household_id, user_id, role, joined_at)
    values
        (v_stripe_household_id, v_stripe_owner_id, 'owner', now()),
        (
            v_stripe_household_id,
            v_stripe_auto_trial_user_id,
            'admin',
            now()
        ),
        (
            v_stripe_household_id,
            v_stripe_direct_trial_user_id,
            'admin',
            now()
        ),
        (
            v_stripe_household_id,
            v_stripe_unmarked_trial_user_id,
            'admin',
            now()
        ),
        (v_app_store_household_id, v_app_store_owner_id, 'owner', now()),
        (
            v_app_store_household_id,
            v_app_store_auto_trial_user_id,
            'admin',
            now()
        ),
        (
            v_app_store_household_id,
            v_app_store_direct_trial_user_id,
            'admin',
            now()
        ),
        (
            v_stripe_descendant_household_id,
            v_stripe_auto_trial_user_id,
            'owner',
            now()
        ),
        (
            v_stripe_descendant_household_id,
            v_stripe_descendant_user_id,
            'admin',
            now()
        )
    on conflict (household_id, user_id) do update
    set role = excluded.role;

    insert into public.subscriptions (
        user_id,
        plan,
        status,
        provider,
        billing_interval,
        current_period_end,
        cancel_at_period_end,
        trial_start,
        trial_end,
        stripe_subscription_id,
        stripe_customer_id,
        store_product_id,
        app_store_transaction_id,
        app_store_original_transaction_id
    )
    values
        (
            v_stripe_owner_id,
            'plus',
            'active',
            'stripe',
            'yearly',
            now() + interval '1 year',
            false,
            null,
            null,
            'sub_household_binding_owner',
            'cus_household_binding_owner',
            null,
            null,
            null
        ),
        (
            v_stripe_auto_trial_user_id,
            'plus',
            'trialing',
            'stripe',
            'yearly',
            now() + interval '7 days',
            false,
            now(),
            now() + interval '7 days',
            null,
            'cus_automatic_trial_portal_only',
            null,
            null,
            null
        ),
        (
            v_stripe_direct_trial_user_id,
            'plus',
            'trialing',
            'stripe',
            'yearly',
            now() + interval '7 days',
            false,
            now(),
            now() + interval '7 days',
            'sub_household_binding_direct_trial',
            'cus_household_binding_direct_trial',
            null,
            null,
            null
        ),
        (
            v_stripe_unmarked_trial_user_id,
            'plus',
            'trialing',
            'stripe',
            'yearly',
            now() + interval '7 days',
            false,
            now(),
            now() + interval '7 days',
            null,
            null,
            null,
            null,
            null
        ),
        (
            v_stripe_descendant_user_id,
            'plus',
            'trialing',
            'stripe',
            'yearly',
            now() + interval '7 days',
            false,
            now(),
            now() + interval '7 days',
            null,
            null,
            null,
            null,
            null
        ),
        (
            v_app_store_owner_id,
            'plus',
            'active',
            'app_store',
            'yearly',
            now() + interval '1 year',
            false,
            null,
            null,
            null,
            null,
            'moneko_plus_yearly_owner_test',
            'app_store_owner_transaction_test',
            'app_store_owner_original_test'
        ),
        (
            v_app_store_auto_trial_user_id,
            'plus',
            'trialing',
            'stripe',
            'yearly',
            now() + interval '7 days',
            false,
            now(),
            now() + interval '7 days',
            null,
            null,
            null,
            null,
            null
        ),
        (
            v_app_store_direct_trial_user_id,
            'plus',
            'trialing',
            'app_store',
            'yearly',
            now() + interval '7 days',
            false,
            now(),
            now() + interval '7 days',
            null,
            null,
            'moneko_plus_yearly_direct_trial_test',
            'app_store_direct_trial_transaction_test',
            'app_store_direct_trial_original_test'
        );

    update public.subscriptions
    set
        bound_to_user_id = v_stripe_auto_trial_user_id,
        bound_to_household_id = v_stripe_descendant_household_id
    where user_id = v_stripe_descendant_user_id;
end;
$$;

select is(
    public.bind_user_to_household_subscription(
        current_setting('test.stripe_auto_trial_user_id')::uuid,
        current_setting('test.stripe_household_id')::uuid
    ),
    true,
    'identifier-free automatic trial binds to a Stripe owner'
);

select is(
    (
        select bound_to_user_id
        from public.subscriptions
        where user_id = current_setting('test.stripe_auto_trial_user_id')::uuid
    ),
    current_setting('test.stripe_owner_id')::uuid,
    'Stripe owner binding is stored on the automatic-trial user'
);

select is(
    (
        select bound_to_household_id
        from public.subscriptions
        where user_id = current_setting('test.stripe_auto_trial_user_id')::uuid
    ),
    current_setting('test.stripe_household_id')::uuid,
    'Stripe household binding is stored on the automatic-trial user'
);

select is(
    (
        select provider
        from public.subscriptions
        where user_id = current_setting('test.stripe_auto_trial_user_id')::uuid
    ),
    'stripe',
    'borrowed row follows the Stripe owner provider'
);

select is(
    (
        select status
        from public.subscriptions
        where user_id = current_setting('test.stripe_auto_trial_user_id')::uuid
    ),
    'active',
    'borrowed row replaces the automatic trial with the owner lifecycle'
);

select ok(
    (
        select stripe_subscription_id is null
           and stripe_customer_id is null
        from public.subscriptions
        where user_id = current_setting('test.stripe_auto_trial_user_id')::uuid
    ),
    'borrowed Stripe row does not copy direct Stripe ownership identifiers'
);

select is(
    (
        select stripe_customer_id
        from public.user_stripe_mapping
        where user_id = current_setting('test.stripe_auto_trial_user_id')::uuid
    ),
    'cus_automatic_trial_portal_only',
    'portal-created Stripe customer is preserved outside the borrowed row'
);

select is(
    (
        select bound_to_user_id
        from public.subscriptions
        where user_id = current_setting('test.stripe_descendant_user_id')::uuid
    ),
    current_setting('test.stripe_owner_id')::uuid,
    'existing dependent grant is flattened to the new root owner'
);

select is(
    public.bind_user_to_household_subscription(
        current_setting('test.app_store_auto_trial_user_id')::uuid,
        current_setting('test.app_store_household_id')::uuid
    ),
    true,
    'identifier-free automatic trial binds to an App Store owner'
);

select is(
    (
        select bound_to_user_id
        from public.subscriptions
        where user_id = current_setting('test.app_store_auto_trial_user_id')::uuid
    ),
    current_setting('test.app_store_owner_id')::uuid,
    'App Store owner binding is stored on the automatic-trial user'
);

select is(
    (
        select provider
        from public.subscriptions
        where user_id = current_setting('test.app_store_auto_trial_user_id')::uuid
    ),
    'app_store',
    'borrowed row follows the App Store owner provider'
);

select ok(
    (
        select store_product_id is null
           and app_store_transaction_id is null
           and app_store_original_transaction_id is null
        from public.subscriptions
        where user_id = current_setting('test.app_store_auto_trial_user_id')::uuid
    ),
    'borrowed App Store row does not copy direct App Store ownership identifiers'
);

select is(
    public.bind_user_to_household_subscription(
        current_setting('test.stripe_direct_trial_user_id')::uuid,
        current_setting('test.stripe_household_id')::uuid
    ),
    false,
    'genuine Stripe trial is not overwritten'
);

select is(
    (
        select bound_to_user_id
        from public.subscriptions
        where user_id = current_setting('test.stripe_direct_trial_user_id')::uuid
    ),
    null::uuid,
    'genuine Stripe trial remains unbound'
);

select is(
    (
        select stripe_subscription_id
        from public.subscriptions
        where user_id = current_setting('test.stripe_direct_trial_user_id')::uuid
    ),
    'sub_household_binding_direct_trial',
    'genuine Stripe trial identifier is preserved'
);

select is(
    public.bind_user_to_household_subscription(
        current_setting('test.stripe_unmarked_trial_user_id')::uuid,
        current_setting('test.stripe_household_id')::uuid
    ),
    false,
    'identifier-free trial without the automatic-grant marker is protected'
);

select is(
    (
        select bound_to_user_id
        from public.subscriptions
        where user_id = current_setting('test.stripe_unmarked_trial_user_id')::uuid
    ),
    null::uuid,
    'unmarked trial remains unbound'
);

select is(
    public.bind_user_to_household_subscription(
        current_setting('test.app_store_direct_trial_user_id')::uuid,
        current_setting('test.app_store_household_id')::uuid
    ),
    false,
    'genuine App Store trial is not overwritten'
);

select is(
    (
        select bound_to_user_id
        from public.subscriptions
        where user_id = current_setting('test.app_store_direct_trial_user_id')::uuid
    ),
    null::uuid,
    'genuine App Store trial remains unbound'
);

select is(
    (
        select app_store_transaction_id
        from public.subscriptions
        where user_id = current_setting('test.app_store_direct_trial_user_id')::uuid
    ),
    'app_store_direct_trial_transaction_test',
    'genuine App Store transaction identifier is preserved'
);

select is(
    (
        select app_store_original_transaction_id
        from public.subscriptions
        where user_id = current_setting('test.app_store_direct_trial_user_id')::uuid
    ),
    'app_store_direct_trial_original_test',
    'genuine App Store original transaction identifier is preserved'
);

select lives_ok(
    format(
        'select public.remove_household_subscription_binding(%L::uuid, %L::uuid)',
        current_setting('test.stripe_auto_trial_user_id'),
        current_setting('test.stripe_household_id')
    ),
    'removing an intermediate owner binding succeeds'
);

select is(
    (
        select bound_to_user_id
        from public.subscriptions
        where user_id = current_setting('test.stripe_auto_trial_user_id')::uuid
    ),
    null::uuid,
    'removed intermediate owner no longer borrows access'
);

select is(
    (
        select bound_to_user_id
        from public.subscriptions
        where user_id = current_setting('test.stripe_descendant_user_id')::uuid
    ),
    null::uuid,
    'downstream member cannot retain orphaned root-owner access'
);

select is(
    (
        select plan
        from public.subscriptions
        where user_id = current_setting('test.stripe_descendant_user_id')::uuid
    ),
    'free',
    'downstream member falls back to free when no alternate owner is active'
);

select * from finish();

rollback;
