grant select on public.download_attribution_sessions to authenticated;

drop policy if exists "Creators can read download attribution sessions" on public.download_attribution_sessions;
create policy "Creators can read download attribution sessions"
    on public.download_attribution_sessions
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.users
            where users.id = auth.uid()
              and users.is_creator = true
        )
    );
