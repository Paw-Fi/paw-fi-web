-- ISOLATED DATABASE ONLY.
--
-- Run after the recurring occurrence fixture and all recurring lazy-read
-- migrations have been applied to the same disposable database.

begin;

create extension if not exists pgtap;

select plan(26);

select has_function(
  'public',
  'has_actionable_recurring_occurrences_v1',
  array['uuid', 'uuid', 'text[]'],
  'the lightweight recurring navigation badge RPC exists'
);

select has_function(
  'public',
  'list_recurring_series_summary_v1',
  array['uuid', 'uuid', 'text[]', 'date', 'uuid', 'integer'],
  'the keyset-paginated recurring summary RPC exists'
);

select has_function(
  'public',
  'get_recurring_series_detail_v1',
  array['uuid', 'uuid'],
  'the lazy recurring series detail RPC exists'
);

select has_function(
  'public',
  'list_recurring_occurrences_v2',
  array['uuid', 'uuid', 'date', 'integer'],
  'the minimal keyset-paginated occurrence history RPC exists'
);

select has_function(
  'public',
  'get_recurring_occurrence_detail_v1',
  array['uuid', 'uuid'],
  'the lazy occurrence detail RPC exists'
);

select is(
  pg_get_function_result(
    'public.has_actionable_recurring_occurrences_v1(uuid,uuid,text[])'::regprocedure
  ),
  'boolean',
  'the navigation badge RPC returns only a boolean'
);

select is(
  pg_get_function_result(
    'public.list_recurring_series_summary_v1(uuid,uuid,text[],date,uuid,integer)'::regprocedure
  ),
  'jsonb',
  'the recurring summary RPC returns a structured page'
);

select is(
  pg_get_function_result(
    'public.list_recurring_occurrences_v2(uuid,uuid,date,integer)'::regprocedure
  ),
  'jsonb',
  'the occurrence history RPC returns a structured page'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.list_recurring_series_summary_v1(uuid,uuid,text[],date,uuid,integer)',
    'EXECUTE'
  ),
  'the service role can execute recurring summary reads'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.list_recurring_series_summary_v1(uuid,uuid,text[],date,uuid,integer)',
    'EXECUTE'
  ),
  'authenticated clients cannot bypass the recurring summary Edge boundary'
);

select set_config('request.jwt.claim.role', 'service_role', true);

select ok(
  jsonb_typeof(
    public.list_recurring_series_summary_v1(
      (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
      (select (payload ->> 'household_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
      array['USD'],
      null,
      null,
      20
    ) -> 'items'
  ) = 'array',
  'recurring summary returns an items array for an authorized household member'
);

select ok(
  coalesce((
    select item ? 'next_occurrence_date'
      and item ? 'latest_actionable_occurrence_date'
      and item ? 'actionable_count'
      and item ? 'recurrence_rule'
      and not item ? 'attachments'
      and not item ? 'breakdown'
    from jsonb_array_elements(
      public.list_recurring_series_summary_v1(
        (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
        (select (payload ->> 'household_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
        array['USD'], null, null, 20
      ) -> 'items'
    ) item
    limit 1
  ), true),
  'summary rows include schedule metadata and exclude heavy detail fields'
);

select ok(
  coalesce((
    select jsonb_typeof(item -> 'actionable_count') = 'number'
      and (item ->> 'actionable_count')::integer >= 0
    from jsonb_array_elements(
      public.list_recurring_series_summary_v1(
        (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
        (select (payload ->> 'household_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
        array['USD'], null, null, 20
      ) -> 'items'
    ) item
    limit 1
  ), true),
  'summary rows include a non-negative actionable occurrence count'
);

select ok(
  coalesce((
    select jsonb_typeof(item -> 'current_month_confirmed_amount_delta_cents') = 'number'
    from jsonb_array_elements(
      public.list_recurring_series_summary_v1(
        (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
        (select (payload ->> 'household_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
        array['USD'], null, null, 20
      ) -> 'items'
    ) item
    limit 1
  ), true),
  'summary rows include the current-month confirmed amount delta'
);

select ok(
  coalesce((
    select bool_and(upper(item ->> 'currency') = 'USD')
    from jsonb_array_elements(
      public.list_recurring_series_summary_v1(
        (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
        (select (payload ->> 'household_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
        array['USD'], null, null, 20
      ) -> 'items'
    ) item
  ), true),
  'recurring summary applies the selected currency filter'
);

select ok(
  coalesce((
    select bool_and(
      (item ->> 'household_id')::uuid =
        (select (payload ->> 'household_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture')
    )
    from jsonb_array_elements(
      public.list_recurring_series_summary_v1(
        (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
        (select (payload ->> 'household_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
        array['USD'], null, null, 20
      ) -> 'items'
    ) item
  ), true),
  'household summary never leaks templates from another scope'
);

select is(
  jsonb_array_length(public.list_recurring_series_summary_v1(
    (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
    (select (payload ->> 'household_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
    array['USD'], null, null, 1
  ) -> 'items'),
  1,
  'series pagination respects the requested page size'
);

select ok(
  jsonb_typeof(public.list_recurring_series_summary_v1(
    (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
    (select (payload ->> 'household_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
    array['USD'], null, null, 1
  ) -> 'has_more') = 'boolean',
  'series pagination always returns an authoritative has_more flag'
);

select ok(
  (
    with result as (
      select public.list_recurring_series_summary_v1(
        (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
        (select (payload ->> 'household_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
        array['USD'], null, null, 1
      ) payload
    )
    select case
      when (payload ->> 'has_more')::boolean then
        (payload -> 'next_cursor') ? 'next_occurrence_date'
          and (payload -> 'next_cursor') ? 'id'
      else payload -> 'next_cursor' = 'null'::jsonb
    end
    from result
  ),
  'series pagination returns a complete keyset cursor only when more rows exist'
);

select ok(
  public.has_actionable_recurring_occurrences_v1(
    (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
    (select (payload ->> 'household_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
    array['USD']
  ) in (true, false),
  'the badge RPC resolves to an authoritative boolean'
);

select ok(
  (public.get_recurring_series_detail_v1(
    (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
    (select (jsonb_array_elements_text(payload -> 'template_ids'))::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture' limit 1)
  ) -> 'id') is not null,
  'series detail returns the requested authorized template'
);

select ok(
  jsonb_typeof(public.get_recurring_series_detail_v1(
    (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
    (select (jsonb_array_elements_text(payload -> 'template_ids'))::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture' limit 1)
  ) -> 'actionable_count') = 'number',
  'series detail includes the authoritative actionable occurrence count'
);

select ok(
  jsonb_typeof(public.list_recurring_occurrences_v2(
    (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
    (select (jsonb_array_elements_text(payload -> 'template_ids'))::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture' limit 1),
    null,
    20
  ) -> 'items') = 'array',
  'occurrence history returns a minimal items page'
);

select ok(
  jsonb_array_length(public.list_recurring_occurrences_v2(
    (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
    (select (jsonb_array_elements_text(payload -> 'template_ids'))::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture' limit 1),
    null,
    1
  ) -> 'items') <= 1,
  'occurrence history respects its requested keyset page size'
);

select ok(
  coalesce((
    select item ? 'id'
      and item ? 'scheduled_occurrence_date'
      and item ? 'status'
      and not item ? 'transaction'
      and not item ? 'split_group'
      and not item ? 'settlement_locked'
    from jsonb_array_elements(public.list_recurring_occurrences_v2(
      (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
      (select (jsonb_array_elements_text(payload -> 'template_ids'))::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture' limit 1),
      null,
      20
    ) -> 'items') item
    limit 1
  ), true),
  'occurrence history excludes transaction, split, and settlement detail'
);

select ok(
  (public.get_recurring_occurrence_detail_v1(
    (select (payload ->> 'member_id')::uuid from test_recurring_occurrence_migration.snapshots where snapshot_key = 'fixture'),
    (select occurrence.id
      from public.recurring_occurrences occurrence
      where occurrence.actual_transaction_id is not null
        and occurrence.recurring_id in (
          select jsonb_array_elements_text(payload -> 'template_ids')::uuid
          from test_recurring_occurrence_migration.snapshots
          where snapshot_key = 'fixture'
        )
      limit 1)
  ) -> 'occurrence' ->> 'id') is not null,
  'individual occurrence detail returns the occurrence payload on demand'
);

select * from finish();

rollback;
