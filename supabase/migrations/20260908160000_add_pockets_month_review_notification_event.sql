do $$
begin
  alter type public.notification_event_type add value if not exists 'pockets_month_review';
exception when undefined_object then
  raise exception 'notification_event_type must exist before Pockets review notifications are enabled';
end;
$$;
