-- One-time, user-authorized transfer of the verified App Store yearly
-- entitlement from the original Apple-sign-in account to the Android account.
DO $$
DECLARE
    v_source_user_id CONSTANT UUID := '88f9ee55-840e-473d-98bc-0810f56f3d51';
    v_target_user_id CONSTANT UUID := '9fccbe1f-8b2a-4203-a970-05b7b7894b32';
    v_original_transaction_id CONSTANT TEXT := '450002807353086';
    v_target_email CONSTANT TEXT := 'roberto.centeno.estevez@gmail.com';
    v_now CONSTANT TIMESTAMPTZ := now();
    v_source_subscription public.subscriptions%ROWTYPE;
    v_target_subscription public.subscriptions%ROWTYPE;
    v_target_subscription_exists BOOLEAN;
    v_target_is_system_granted_trial BOOLEAN;
    v_binding public.iap_account_bindings%ROWTYPE;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = v_source_user_id
          AND email = 'gqpsmkxxwn@privaterelay.appleid.com'
    ) THEN
        RAISE EXCEPTION 'Source Moneko account does not match the confirmed account';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = v_target_user_id
          AND email = v_target_email
    ) THEN
        RAISE EXCEPTION 'Target Moneko account does not match the confirmed Android account';
    END IF;

    SELECT *
    INTO v_source_subscription
    FROM public.subscriptions
    WHERE user_id = v_source_user_id
      AND provider = 'app_store'
      AND app_store_original_transaction_id = v_original_transaction_id
      AND store_product_id = 'yearly'
      AND plan = 'plus'
      AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Confirmed active App Store yearly subscription is missing or changed';
    END IF;

    SELECT *
    INTO v_binding
    FROM public.iap_account_bindings
    WHERE provider = 'app_store'
      AND original_transaction_id = v_original_transaction_id
      AND user_id = v_source_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'App Store ownership binding is missing or owned by another account';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.iap_account_binding_conflicts
        WHERE provider = 'app_store'
          AND original_transaction_id = v_original_transaction_id
          AND resolved_at IS NULL
    ) THEN
        RAISE EXCEPTION 'App Store purchase has an unresolved ownership conflict';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.subscriptions
        WHERE bound_to_user_id = v_source_user_id
          AND status IN ('active', 'trialing', 'past_due')
          AND plan <> 'free'
    ) THEN
        RAISE EXCEPTION 'Source account has active dependent subscription grants; resolve them before transferring ownership';
    END IF;

    SELECT *
    INTO v_target_subscription
    FROM public.subscriptions
    WHERE user_id = v_target_user_id
    FOR UPDATE;

    v_target_subscription_exists := FOUND;
    v_target_is_system_granted_trial := v_target_subscription_exists
        AND lower(coalesce(v_target_subscription.provider, '')) = 'stripe'
        AND lower(coalesce(v_target_subscription.plan, '')) = 'plus'
        AND lower(coalesce(v_target_subscription.status, '')) = 'trialing'
        AND nullif(trim(v_target_subscription.stripe_subscription_id), '') IS NULL
        AND nullif(trim(v_target_subscription.stripe_customer_id), '') IS NULL
        AND nullif(trim(v_target_subscription.store_product_id), '') IS NULL
        AND v_target_subscription.bound_to_user_id IS NULL
        AND v_target_subscription.bound_to_household_id IS NULL;

    IF v_target_subscription_exists
       AND v_target_subscription.bound_to_user_id IS NULL
       AND v_target_subscription.plan <> 'free'
       AND v_target_subscription.status IN ('active', 'trialing', 'past_due')
       AND NOT v_target_is_system_granted_trial THEN
        RAISE EXCEPTION 'Target account already has an active paid entitlement';
    END IF;

    UPDATE public.iap_account_bindings
    SET
        user_id = v_target_user_id,
        claim_source = 'admin_verified_account_transfer',
        last_verified_at = v_now,
        updated_at = v_now
    WHERE id = v_binding.id;

    IF v_target_subscription_exists THEN
        UPDATE public.subscriptions
        SET
            provider = v_source_subscription.provider,
            plan = v_source_subscription.plan,
            status = v_source_subscription.status,
            billing_interval = v_source_subscription.billing_interval,
            payment_interval = v_source_subscription.payment_interval,
            commitment_months = v_source_subscription.commitment_months,
            commitment_end = v_source_subscription.commitment_end,
            current_period_end = v_source_subscription.current_period_end,
            cancel_at_period_end = v_source_subscription.cancel_at_period_end,
            trial_start = v_source_subscription.trial_start,
            trial_end = v_source_subscription.trial_end,
            ended_at = null,
            bound_to_user_id = null,
            bound_to_household_id = null,
            stripe_subscription_id = null,
            stripe_customer_id = null,
            store_product_id = v_source_subscription.store_product_id,
            app_store_transaction_id = v_source_subscription.app_store_transaction_id,
            app_store_original_transaction_id = v_source_subscription.app_store_original_transaction_id,
            app_store_environment = v_source_subscription.app_store_environment,
            app_store_in_app_ownership_type = v_source_subscription.app_store_in_app_ownership_type,
            play_purchase_token = null,
            play_order_id = null,
            play_package_name = null,
            lifetime_source = null,
            lifetime_source_id = null,
            last_event_id = 'admin_app_store_account_transfer:450002807353086',
            updated_at = v_now
        WHERE user_id = v_target_user_id;
    ELSE
        INSERT INTO public.subscriptions (
            user_id,
            provider,
            plan,
            status,
            billing_interval,
            payment_interval,
            commitment_months,
            commitment_end,
            current_period_end,
            cancel_at_period_end,
            trial_start,
            trial_end,
            ended_at,
            bound_to_user_id,
            bound_to_household_id,
            stripe_subscription_id,
            stripe_customer_id,
            store_product_id,
            app_store_transaction_id,
            app_store_original_transaction_id,
            app_store_environment,
            app_store_in_app_ownership_type,
            play_purchase_token,
            play_order_id,
            play_package_name,
            lifetime_source,
            lifetime_source_id,
            last_event_id,
            created_at,
            updated_at
        ) VALUES (
            v_target_user_id,
            v_source_subscription.provider,
            v_source_subscription.plan,
            v_source_subscription.status,
            v_source_subscription.billing_interval,
            v_source_subscription.payment_interval,
            v_source_subscription.commitment_months,
            v_source_subscription.commitment_end,
            v_source_subscription.current_period_end,
            v_source_subscription.cancel_at_period_end,
            v_source_subscription.trial_start,
            v_source_subscription.trial_end,
            null,
            null,
            null,
            null,
            null,
            v_source_subscription.store_product_id,
            v_source_subscription.app_store_transaction_id,
            v_source_subscription.app_store_original_transaction_id,
            v_source_subscription.app_store_environment,
            v_source_subscription.app_store_in_app_ownership_type,
            null,
            null,
            null,
            null,
            null,
            'admin_app_store_account_transfer:450002807353086',
            v_now,
            v_now
        );
    END IF;

    UPDATE public.subscriptions
    SET
        plan = 'free',
        status = 'active',
        billing_interval = null,
        payment_interval = null,
        commitment_months = null,
        commitment_end = null,
        current_period_end = null,
        cancel_at_period_end = false,
        trial_start = null,
        trial_end = null,
        ended_at = v_now,
        bound_to_user_id = null,
        bound_to_household_id = null,
        stripe_subscription_id = null,
        stripe_customer_id = null,
        store_product_id = null,
        app_store_transaction_id = null,
        app_store_original_transaction_id = null,
        app_store_environment = null,
        app_store_in_app_ownership_type = null,
        play_purchase_token = null,
        play_order_id = null,
        play_package_name = null,
        lifetime_source = null,
        lifetime_source_id = null,
        last_event_id = 'admin_app_store_account_transfer:450002807353086',
        updated_at = v_now
    WHERE id = v_source_subscription.id;
END;
$$;
