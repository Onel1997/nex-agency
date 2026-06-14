-- Soft-delete clients: hide from UI while preserving finance history.
-- Hard delete fails on freelancer_profile_invoices (ON DELETE RESTRICT).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS clients_deleted_at_idx
  ON public.clients (deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.clients.deleted_at IS
  'When set, client is removed from active lists. Invoices, contracts, and finance records remain linked.';

-- Defense in depth: deleted clients are not accessible via client hub RLS.
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
      AND c.deleted_at IS NULL
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
