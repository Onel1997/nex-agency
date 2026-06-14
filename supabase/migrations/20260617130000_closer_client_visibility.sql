-- Phase 5.8: Closer client visibility — team-wide read (mirrors lead access)

-- =============================================================================
-- clients — read (replace narrow closer_id-only policy from phase 5.6)
-- =============================================================================

DROP POLICY IF EXISTS "Closers can read closed clients" ON public.clients;

CREATE POLICY "Closers can read team clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_closer()
    AND deleted_at IS NULL
  );

CREATE POLICY "Setters can read assigned clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_setter()
    AND deleted_at IS NULL
    AND (
      responsible_member_id = auth.uid()
      OR setter_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can read own clients" ON public.clients;

CREATE POLICY "Field staff can read own clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_field_staff()
    AND public.get_user_agency_role() NOT IN ('setter', 'closer', 'sales_manager')
    AND responsible_member_id = auth.uid()
    AND deleted_at IS NULL
  );

-- =============================================================================
-- clients — update (closers manage converted customers)
-- =============================================================================

CREATE POLICY "Closers can update team clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_closer()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.is_active_user()
    AND public.is_closer()
    AND deleted_at IS NULL
  );

CREATE POLICY "Setters can update assigned clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_setter()
    AND deleted_at IS NULL
    AND (
      responsible_member_id = auth.uid()
      OR setter_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_active_user()
    AND (
      responsible_member_id = auth.uid()
      OR setter_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Staff can update own clients" ON public.clients;

CREATE POLICY "Field staff can update own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_field_staff()
    AND public.get_user_agency_role() NOT IN ('setter', 'closer', 'sales_manager')
    AND responsible_member_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.is_active_user()
    AND responsible_member_id = auth.uid()
    AND deleted_at IS NULL
  );

-- =============================================================================
-- Client hub access helper
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
      AND c.deleted_at IS NULL
      AND public.is_active_user()
      AND (
        public.is_management()
        OR public.is_closer()
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

COMMENT ON POLICY "Closers can read team clients" ON public.clients IS
  'Closers see all active clients (won-lead pipeline), matching team lead visibility.';
