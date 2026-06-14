-- Phase 5.6: Closer lead visibility — team-wide read/update for closers, setter assignment rules

-- =============================================================================
-- Role helpers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_setter()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_agency_role() = 'setter';
$$;

CREATE OR REPLACE FUNCTION public.is_closer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_agency_role() = 'closer';
$$;

GRANT EXECUTE ON FUNCTION public.is_setter() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_closer() TO authenticated;

-- =============================================================================
-- leads — read
-- =============================================================================

DROP POLICY IF EXISTS "Staff can read own leads" ON public.leads;

CREATE POLICY "Closers can read team leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND public.is_closer());

CREATE POLICY "Setters can read assigned leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_setter()
    AND (
      owner_id = auth.uid()
      OR created_by = auth.uid()
      OR setter_id = auth.uid()
    )
  );

CREATE POLICY "Field staff can read own leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_field_staff()
    AND public.get_user_agency_role() NOT IN ('setter', 'closer', 'sales_manager')
    AND owner_id = auth.uid()
  );

-- =============================================================================
-- leads — update
-- =============================================================================

DROP POLICY IF EXISTS "Staff can update own leads" ON public.leads;

CREATE POLICY "Closers can update team leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND public.is_closer())
  WITH CHECK (public.is_active_user() AND public.is_closer());

CREATE POLICY "Setters can update assigned leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_setter()
    AND (
      owner_id = auth.uid()
      OR created_by = auth.uid()
      OR setter_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_active_user()
    AND (
      owner_id = auth.uid()
      OR created_by = auth.uid()
      OR setter_id = auth.uid()
    )
  );

CREATE POLICY "Field staff can update own leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_field_staff()
    AND public.get_user_agency_role() NOT IN ('setter', 'closer', 'sales_manager')
    AND owner_id = auth.uid()
  )
  WITH CHECK (
    public.is_active_user()
    AND owner_id = auth.uid()
  );

-- =============================================================================
-- appointments — closers need team calendar visibility for handoff
-- =============================================================================

CREATE POLICY "Closers can read team appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND public.is_closer());

-- =============================================================================
-- clients — conversion workflow for closers
-- =============================================================================

CREATE POLICY "Closers can insert clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_user() AND public.is_closer());

CREATE POLICY "Closers can read closed clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
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
          public.is_field_staff()
          AND c.responsible_member_id = auth.uid()
        )
      )
  );
$$;

COMMENT ON FUNCTION public.is_closer() IS
  'True when the current user has agency_role closer (team-wide lead access).';
COMMENT ON FUNCTION public.is_setter() IS
  'True when the current user has agency_role setter (assigned-lead access).';
