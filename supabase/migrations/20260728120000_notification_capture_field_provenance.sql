alter table public.notification_capture_classifications
  add column if not exists verification_model text,
  add column if not exists field_provenance jsonb;

comment on column public.notification_capture_classifications.verification_model is
  'Independent model that verified the notification classification decision.';

comment on column public.notification_capture_classifications.field_provenance is
  'Privacy-bounded extracted transaction fields and evidence-presence flags; excludes raw notification and evidence text.';
