-- ============================================================================
-- Support Tickets Schema & Storage
-- ============================================================================

-- Ticket type + status enums --------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_type') THEN
    CREATE TYPE public.support_ticket_type AS ENUM (
      'bug',
      'feedback',
      'feature_request',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_status') THEN
    CREATE TYPE public.support_ticket_status AS ENUM (
      'open',
      'in_progress',
      'waiting_on_user',
      'resolved',
      'closed'
    );
  END IF;
END $$;

-- Support tickets table ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type support_ticket_type NOT NULL DEFAULT 'bug',
  status support_ticket_status NOT NULL DEFAULT 'open',
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  priority TEXT,
  source TEXT NOT NULL DEFAULT 'mobile',
  message TEXT NOT NULL,
  diagnostics JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  app_version TEXT,
  platform TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket attachments table ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_url TEXT,
  content_type TEXT,
  file_size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_attachments_ticket_id
  ON public.support_ticket_attachments(ticket_id);

-- Indexes for common lookups -------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
  ON public.support_tickets(user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON public.support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at
  ON public.support_tickets(created_at DESC);

-- updated_at trigger ---------------------------------------------------------
DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies ---------------------------------------------------------------
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Allow users to insert tickets for themselves
CREATE POLICY "Users can create support tickets"
  ON public.support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own tickets
CREATE POLICY "Users can view their support tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow creators/admins to view any ticket
CREATE POLICY "Creators can view support tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND is_creator = true
    )
  );

-- Allow creators/admins to update tickets (status, metadata)
CREATE POLICY "Creators can update support tickets"
  ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND is_creator = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND is_creator = true
    )
  );

-- Storage bucket for attachments ---------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Service role can manage support attachments"
  ON storage.objects;

CREATE POLICY "Service role can manage support attachments"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'support-attachments')
  WITH CHECK (bucket_id = 'support-attachments');

CREATE POLICY "Creators can view support attachment objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND is_creator = true
    )
  );

-- Allow ticket submitters to read objects within their own user folder.
-- File path convention: tickets/<user_id>/<ticket_id>/<filename>
CREATE POLICY "Ticket submitters can view their support attachment objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = 'tickets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Attachments table RLS & policies -------------------------------------------
ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Allow users to view attachments for their own tickets
CREATE POLICY "Users can view their support attachments"
  ON public.support_ticket_attachments
  FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can view support attachments"
  ON public.support_ticket_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND is_creator = true
    )
  );
