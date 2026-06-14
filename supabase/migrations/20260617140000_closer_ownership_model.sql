-- Phase 5.9: Closer ownership — open lead pool, claim workflow, owned customers only

-- =============================================================================
-- Helper: open pipeline leads available in the closer pool
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_open_lead_status(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status = 'scheduled';
$$;

CREATE OR REPLACE FUNCTION public.closer_can_read_lead(p_closer_id UUID, p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    p_closer_id IS NULL
    AND public.is_open_lead_status(p_status)
  )
  OR p_closer_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.is_open_lead_status(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.closer_can_read_lead(UUID, TEXT) TO authenticated;

-- =============================================================================
-- leads — closer pool + owned leads
-- =============================================================================

DROP POLICY IF EXISTS "Closers can read team leads" ON public.leads;

CREATE POLICY "Closers can read pool and owned leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_closer()
    AND public.closer_can_read_lead(closer_id, status)
  );

DROP POLICY IF EXISTS "Closers can update team leads" ON public.leads;

CREATE POLICY "Closers can update pool and owned leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_closer()
    AND public.closer_can_read_lead(closer_id, status)
  )
  WITH CHECK (
    public.is_active_user()
    AND public.is_closer()
    AND (
      closer_id IS NULL
      OR closer_id = auth.uid()
    )
  );

-- =============================================================================
-- appointments — visible for pool/owned leads
-- =============================================================================

DROP POLICY IF EXISTS "Closers can read team appointments" ON public.appointments;

CREATE POLICY "Closers can read relevant appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_closer()
    AND (
      assigned_user_id = auth.uid()
      OR (
        lead_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.leads l
          WHERE l.id = appointments.lead_id
            AND public.closer_can_read_lead(l.closer_id, l.status)
        )
      )
    )
  );

-- =============================================================================
-- clients — closers see only customers they closed
-- =============================================================================

DROP POLICY IF EXISTS "Closers can read team clients" ON public.clients;

CREATE POLICY "Closers can read owned clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_closer()
    AND closer_id = auth.uid()
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Closers can update team clients" ON public.clients;

CREATE POLICY "Closers can update owned clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_closer()
    AND closer_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.is_active_user()
    AND public.is_closer()
    AND closer_id = auth.uid()
    AND deleted_at IS NULL
  );

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
          public.is_closer()
          AND c.closer_id = auth.uid()
        )
        OR (
          public.is_setter()
          AND (
            c.responsible_member_id = auth.uid()
            OR c.setter_id = auth.uid()
          )
        )
        OR (
          public.is_field_staff()
          AND public.get_user_agency_role() NOT IN ('setter', 'closer', 'sales_manager')
          AND c.responsible_member_id = auth.uid()
        )
      )
  );
$$;

COMMENT ON POLICY "Closers can read pool and owned leads" ON public.leads IS
  'Closers see unassigned open leads (pool) and leads they claimed (closer_id = self).';
COMMENT ON POLICY "Closers can read owned clients" ON public.clients IS
  'Closers only see customers where they are recorded as closer_id.';
