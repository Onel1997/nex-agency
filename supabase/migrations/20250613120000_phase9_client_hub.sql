-- NexAgency CRM Phase 9: Client Hub (Kundenakte)

-- =============================================================================
-- Helper: client access check (management or responsible field staff)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_can_access_client(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = p_client_id
      AND public.is_active_user()
      AND (
        public.is_management()
        OR (
          public.is_field_staff()
          AND c.responsible_member_id = auth.uid()
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_client(UUID) TO authenticated;

-- =============================================================================
-- client_notes — timeline notes per client
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_notes_client_id_idx
  ON public.client_notes (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS client_notes_author_id_idx
  ON public.client_notes (author_id);

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read notes for accessible clients"
  ON public.client_notes FOR SELECT
  TO authenticated
  USING (public.user_can_access_client(client_id));

CREATE POLICY "Users can insert notes for accessible clients"
  ON public.client_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_access_client(client_id)
    AND author_id = auth.uid()
  );

CREATE POLICY "Authors and management can update notes"
  ON public.client_notes FOR UPDATE
  TO authenticated
  USING (
    public.user_can_access_client(client_id)
    AND (author_id = auth.uid() OR public.is_management())
  )
  WITH CHECK (
    public.user_can_access_client(client_id)
    AND (author_id = auth.uid() OR public.is_management())
  );

CREATE POLICY "Authors and management can delete notes"
  ON public.client_notes FOR DELETE
  TO authenticated
  USING (
    public.user_can_access_client(client_id)
    AND (author_id = auth.uid() OR public.is_management())
  );

-- =============================================================================
-- client_activities — auto-generated client history
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (
    activity_type IN (
      'lead_created',
      'lead_won',
      'client_created',
      'contract_changed',
      'commission_paid',
      'file_uploaded',
      'invoice_created',
      'invoice_paid'
    )
  ),
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_activities_client_id_idx
  ON public.client_activities (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS client_activities_type_idx
  ON public.client_activities (activity_type);

ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read activities for accessible clients"
  ON public.client_activities FOR SELECT
  TO authenticated
  USING (public.user_can_access_client(client_id));

CREATE POLICY "Users can insert activities for accessible clients"
  ON public.client_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_access_client(client_id)
    AND (actor_id = auth.uid() OR actor_id IS NULL)
  );

-- =============================================================================
-- client_communications — manual communication log
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  communication_type TEXT NOT NULL CHECK (
    communication_type IN ('phone', 'meeting', 'email', 'other')
  ),
  summary TEXT NOT NULL CHECK (char_length(trim(summary)) > 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_communications_client_id_idx
  ON public.client_communications (client_id, occurred_at DESC);

ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read communications for accessible clients"
  ON public.client_communications FOR SELECT
  TO authenticated
  USING (public.user_can_access_client(client_id));

CREATE POLICY "Users can insert communications for accessible clients"
  ON public.client_communications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_access_client(client_id)
    AND author_id = auth.uid()
  );

CREATE POLICY "Authors and management can update communications"
  ON public.client_communications FOR UPDATE
  TO authenticated
  USING (
    public.user_can_access_client(client_id)
    AND (author_id = auth.uid() OR public.is_management())
  )
  WITH CHECK (
    public.user_can_access_client(client_id)
    AND (author_id = auth.uid() OR public.is_management())
  );

CREATE POLICY "Authors and management can delete communications"
  ON public.client_communications FOR DELETE
  TO authenticated
  USING (
    public.user_can_access_client(client_id)
    AND (author_id = auth.uid() OR public.is_management())
  );

-- =============================================================================
-- client_files — file metadata (Supabase Storage)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_files_client_id_idx
  ON public.client_files (client_id, created_at DESC);

ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read files for accessible clients"
  ON public.client_files FOR SELECT
  TO authenticated
  USING (public.user_can_access_client(client_id));

CREATE POLICY "Users can insert files for accessible clients"
  ON public.client_files FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_access_client(client_id)
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Uploaders and management can delete files"
  ON public.client_files FOR DELETE
  TO authenticated
  USING (
    public.user_can_access_client(client_id)
    AND (uploaded_by = auth.uid() OR public.is_management())
  );

-- =============================================================================
-- invoices — Phase 10 preparation
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')
  ),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invoice_number)
);

CREATE INDEX IF NOT EXISTS invoices_client_id_idx
  ON public.invoices (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_status_idx
  ON public.invoices (status);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read invoices for accessible clients"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (public.user_can_access_client(client_id));

CREATE POLICY "Users can insert invoices for accessible clients"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_access_client(client_id)
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

CREATE POLICY "Users can update invoices for accessible clients"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (public.user_can_access_client(client_id))
  WITH CHECK (public.user_can_access_client(client_id));

CREATE POLICY "Management can delete invoices"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (
    public.user_can_access_client(client_id)
    AND public.is_management()
  );

-- =============================================================================
-- Storage bucket: client-files
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-files',
  'client-files',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read client files in storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-files'
    AND public.user_can_access_client(
      (storage.foldername(name))[1]::uuid
    )
  );

CREATE POLICY "Users can upload client files in storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-files'
    AND public.user_can_access_client(
      (storage.foldername(name))[1]::uuid
    )
  );

CREATE POLICY "Users can delete client files in storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client-files'
    AND public.user_can_access_client(
      (storage.foldername(name))[1]::uuid
    )
  );

-- Backfill moved to 20250613130000_phase9_client_activities_backfill_fix.sql
-- (avoids FK failures from orphaned activity_logs.entity_id values)
