create table if not exists public.download_attribution_sessions (
    id uuid primary key default gen_random_uuid(),
    session_id text not null unique,
    visitor_id text,
    source text,
    first_source text,
    last_source text,
    first_landing_url text,
    last_url text,
    first_path text,
    last_path text,
    referrer text,
    referrer_domain text,
    first_query_params jsonb not null default '{}'::jsonb,
    last_query_params jsonb not null default '{}'::jsonb,
    all_query_params jsonb not null default '{}'::jsonb,
    page_view_count integer not null default 0,
    download_click_count integer not null default 0,
    downloaded boolean not null default false,
    clicked_platforms text[] not null default '{}'::text[],
    ios_clicked_at timestamptz,
    android_clicked_at timestamptz,
    first_downloaded_at timestamptz,
    last_downloaded_at timestamptz,
    user_agent text,
    language text,
    timezone text,
    viewport text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_download_attribution_sessions_source
    on public.download_attribution_sessions(source);

create index if not exists idx_download_attribution_sessions_first_source
    on public.download_attribution_sessions(first_source);

create index if not exists idx_download_attribution_sessions_downloaded
    on public.download_attribution_sessions(downloaded)
    where downloaded = true;

create index if not exists idx_download_attribution_sessions_created_at
    on public.download_attribution_sessions(created_at desc);

alter table public.download_attribution_sessions enable row level security;

drop policy if exists "Service role can manage download attribution sessions" on public.download_attribution_sessions;
create policy "Service role can manage download attribution sessions"
    on public.download_attribution_sessions
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

create or replace function public.track_download_attribution_session(
    p_session_id text,
    p_visitor_id text default null,
    p_event_type text default 'page_view',
    p_platform text default null,
    p_source text default null,
    p_url text default null,
    p_path text default null,
    p_referrer text default null,
    p_referrer_domain text default null,
    p_query_params jsonb default '{}'::jsonb,
    p_user_agent text default null,
    p_language text default null,
    p_timezone text default null,
    p_viewport text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_now timestamptz := now();
    v_event_type text := lower(coalesce(p_event_type, 'page_view'));
    v_platform text := lower(nullif(p_platform, ''));
    v_session_id text := left(nullif(p_session_id, ''), 128);
    v_source text := left(coalesce(nullif(p_source, ''), 'direct'), 256);
    v_query_params jsonb := coalesce(p_query_params, '{}'::jsonb);
begin
    if v_session_id is null then
        return jsonb_build_object('success', false, 'error', 'missing_session_id');
    end if;

    if v_event_type not in ('page_view', 'download_click') then
        return jsonb_build_object('success', false, 'error', 'invalid_event_type');
    end if;

    if v_platform is not null and v_platform not in ('ios', 'android') then
        return jsonb_build_object('success', false, 'error', 'invalid_platform');
    end if;

    if v_event_type = 'download_click' and v_platform is null then
        return jsonb_build_object('success', false, 'error', 'missing_platform');
    end if;

    if jsonb_typeof(v_query_params) <> 'object' or octet_length(v_query_params::text) > 8192 then
        v_query_params := '{}'::jsonb;
    end if;

    insert into public.download_attribution_sessions (
        session_id,
        visitor_id,
        source,
        first_source,
        last_source,
        first_landing_url,
        last_url,
        first_path,
        last_path,
        referrer,
        referrer_domain,
        first_query_params,
        last_query_params,
        all_query_params,
        page_view_count,
        download_click_count,
        downloaded,
        clicked_platforms,
        ios_clicked_at,
        android_clicked_at,
        first_downloaded_at,
        last_downloaded_at,
        user_agent,
        language,
        timezone,
        viewport,
        created_at,
        updated_at
    ) values (
        v_session_id,
        left(nullif(p_visitor_id, ''), 128),
        nullif(v_source, 'direct'),
        v_source,
        v_source,
        left(nullif(p_url, ''), 2048),
        left(nullif(p_url, ''), 2048),
        left(nullif(p_path, ''), 512),
        left(nullif(p_path, ''), 512),
        left(nullif(p_referrer, ''), 2048),
        left(nullif(p_referrer_domain, ''), 255),
        v_query_params,
        v_query_params,
        v_query_params,
        case when v_event_type = 'page_view' then 1 else 0 end,
        case when v_event_type = 'download_click' then 1 else 0 end,
        v_event_type = 'download_click',
        case when v_platform is null then '{}'::text[] else array[v_platform] end,
        case when v_platform = 'ios' then v_now else null end,
        case when v_platform = 'android' then v_now else null end,
        case when v_event_type = 'download_click' then v_now else null end,
        case when v_event_type = 'download_click' then v_now else null end,
        left(nullif(p_user_agent, ''), 512),
        left(nullif(p_language, ''), 64),
        left(nullif(p_timezone, ''), 128),
        left(nullif(p_viewport, ''), 64),
        v_now,
        v_now
    )
    on conflict (session_id) do update set
        visitor_id = coalesce(excluded.visitor_id, public.download_attribution_sessions.visitor_id),
        source = coalesce(public.download_attribution_sessions.source, nullif(excluded.last_source, 'direct')),
        last_source = excluded.last_source,
        last_url = coalesce(excluded.last_url, public.download_attribution_sessions.last_url),
        last_path = coalesce(excluded.last_path, public.download_attribution_sessions.last_path),
        referrer = coalesce(public.download_attribution_sessions.referrer, excluded.referrer),
        referrer_domain = coalesce(public.download_attribution_sessions.referrer_domain, excluded.referrer_domain),
        last_query_params = excluded.last_query_params,
        all_query_params = public.download_attribution_sessions.all_query_params || excluded.last_query_params,
        page_view_count = public.download_attribution_sessions.page_view_count + case when v_event_type = 'page_view' then 1 else 0 end,
        download_click_count = public.download_attribution_sessions.download_click_count + case when v_event_type = 'download_click' then 1 else 0 end,
        downloaded = public.download_attribution_sessions.downloaded or v_event_type = 'download_click',
        clicked_platforms = case
            when v_platform is null then public.download_attribution_sessions.clicked_platforms
            else (
                select array_agg(distinct platform)
                from unnest(public.download_attribution_sessions.clicked_platforms || v_platform) as clicked_platform(platform)
            )
        end,
        ios_clicked_at = case
            when v_platform = 'ios' then coalesce(public.download_attribution_sessions.ios_clicked_at, v_now)
            else public.download_attribution_sessions.ios_clicked_at
        end,
        android_clicked_at = case
            when v_platform = 'android' then coalesce(public.download_attribution_sessions.android_clicked_at, v_now)
            else public.download_attribution_sessions.android_clicked_at
        end,
        first_downloaded_at = case
            when v_event_type = 'download_click' then coalesce(public.download_attribution_sessions.first_downloaded_at, v_now)
            else public.download_attribution_sessions.first_downloaded_at
        end,
        last_downloaded_at = case
            when v_event_type = 'download_click' then v_now
            else public.download_attribution_sessions.last_downloaded_at
        end,
        user_agent = coalesce(public.download_attribution_sessions.user_agent, excluded.user_agent),
        language = coalesce(public.download_attribution_sessions.language, excluded.language),
        timezone = coalesce(public.download_attribution_sessions.timezone, excluded.timezone),
        viewport = coalesce(excluded.viewport, public.download_attribution_sessions.viewport),
        updated_at = v_now;

    return jsonb_build_object('success', true, 'session_id', v_session_id);
end;
$$;

revoke all on public.download_attribution_sessions from anon, authenticated;
grant execute on function public.track_download_attribution_session(
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    jsonb,
    text,
    text,
    text,
    text
) to anon, authenticated;

comment on table public.download_attribution_sessions is 'Anonymous acquisition session attribution for public-page views and app download clicks.';
comment on function public.track_download_attribution_session(text, text, text, text, text, text, text, text, text, jsonb, text, text, text, text) is 'Public RPC that validates and upserts anonymous page-view/download-click attribution into one row per session.';
