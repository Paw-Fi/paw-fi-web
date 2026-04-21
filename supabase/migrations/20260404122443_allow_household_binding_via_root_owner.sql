-- Allow household members to inherit shared subscription access even when the
-- household owner is already bound to an upstream subscription owner.
--
-- This keeps the existing one-level entitlement model for downstream members by
-- resolving the effective/root subscription owner first, then binding invitees
-- directly to that owner while preserving the household context.

CREATE OR REPLACE FUNCTION public.bind_user_to_household_subscription(
    p_user_id UUID,
    p_household_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_household_owner_id UUID;
    v_effective_owner_id UUID;
    v_owner_subscription RECORD;
    v_hop_count INTEGER := 0;
BEGIN
    SELECT owner_id INTO v_household_owner_id
    FROM public.households
    WHERE id = p_household_id;

    IF v_household_owner_id IS NULL THEN
        RAISE EXCEPTION 'Household not found';
    END IF;

    IF v_household_owner_id = p_user_id THEN
        RETURN FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.household_members
        WHERE household_id = p_household_id
          AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this household';
    END IF;

    v_effective_owner_id := v_household_owner_id;

    LOOP
        v_hop_count := v_hop_count + 1;

        IF v_hop_count > 10 THEN
            RAISE EXCEPTION 'Subscription ownership chain is too deep';
        END IF;

        SELECT
            plan,
            status,
            bound_to_user_id,
            stripe_customer_id,
            billing_interval,
            current_period_end,
            trial_start,
            trial_end
        INTO v_owner_subscription
        FROM public.subscriptions
        WHERE user_id = v_effective_owner_id
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_owner_subscription.plan IS NULL THEN
            RETURN FALSE;
        END IF;

        EXIT WHEN v_owner_subscription.bound_to_user_id IS NULL;

        IF v_owner_subscription.bound_to_user_id = v_effective_owner_id THEN
            RAISE EXCEPTION 'Subscription ownership chain contains a cycle';
        END IF;

        v_effective_owner_id := v_owner_subscription.bound_to_user_id;
    END LOOP;

    IF v_effective_owner_id = p_user_id THEN
        RETURN FALSE;
    END IF;

    IF NOT (
        (v_owner_subscription.plan = 'lifetime' AND v_owner_subscription.status = 'active') OR
        (v_owner_subscription.status = 'trialing') OR
        (v_owner_subscription.status = 'active' AND v_owner_subscription.plan != 'free')
    ) THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.subscriptions (
        user_id,
        plan,
        status,
        bound_to_user_id,
        bound_to_household_id,
        stripe_subscription_id,
        stripe_customer_id,
        billing_interval,
        current_period_end,
        cancel_at_period_end,
        trial_start,
        trial_end,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        v_owner_subscription.plan,
        v_owner_subscription.status,
        v_effective_owner_id,
        p_household_id,
        NULL,
        v_owner_subscription.stripe_customer_id,
        v_owner_subscription.billing_interval,
        v_owner_subscription.current_period_end,
        FALSE,
        v_owner_subscription.trial_start,
        v_owner_subscription.trial_end,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        bound_to_user_id = EXCLUDED.bound_to_user_id,
        bound_to_household_id = EXCLUDED.bound_to_household_id,
        stripe_subscription_id = NULL,
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        billing_interval = EXCLUDED.billing_interval,
        current_period_end = EXCLUDED.current_period_end,
        trial_start = EXCLUDED.trial_start,
        trial_end = EXCLUDED.trial_end,
        updated_at = NOW();

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.bind_user_to_household_subscription(UUID, UUID) TO service_role;
