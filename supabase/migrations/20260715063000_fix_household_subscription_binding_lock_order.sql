-- PostgreSQL requires ORDER BY expressions in a SELECT DISTINCT query to
-- appear in its select list. UUID ordering is deterministic without casting.
-- Patch databases where the preceding binding migration was already applied;
-- remain a no-op on clean installs containing the corrected definition.

do $migration$
declare
    v_function_definition text;
begin
    select pg_get_functiondef(
        'public.bind_user_to_household_subscription(uuid,uuid)'::regprocedure
    )
    into v_function_definition;

    if position(
        'order by lock_user_id::text' in v_function_definition
    ) > 0 then
        execute replace(
            v_function_definition,
            'order by lock_user_id::text',
            'order by lock_user_id'
        );
    elsif position(
        'order by lock_user_id' in v_function_definition
    ) = 0 then
        raise exception
            'Unexpected bind_user_to_household_subscription definition';
    end if;
end;
$migration$;
