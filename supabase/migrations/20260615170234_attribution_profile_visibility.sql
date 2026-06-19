-- Allow reading profile names/rates for setter/closer attribution on accessible records.

CREATE OR REPLACE FUNCTION public.can_read_attribution_profile(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_profile_id IS NOT NULL
    AND (
      p_profile_id = auth.uid()
      OR public.is_management()
      OR EXISTS (
        SELECT 1
        FROM public.clients c
        WHERE c.deleted_at IS NULL
          AND (c.setter_id = p_profile_id OR c.closer_id = p_profile_id)
          AND (
            public.is_management()
            OR (public.is_closer() AND public.is_active_user())
            OR (
              public.is_setter()
              AND public.is_active_user()
              AND (c.setter_id = auth.uid() OR c.responsible_member_id = auth.uid())
            )
            OR (
              public.is_field_staff()
              AND public.get_user_agency_role() NOT IN ('setter', 'closer', 'sales_manager')
              AND c.responsible_member_id = auth.uid()
            )
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.leads l
        WHERE (l.setter_id = p_profile_id OR l.closer_id = p_profile_id)
          AND (
            public.is_management()
            OR l.owner_id = auth.uid()
            OR l.created_by = auth.uid()
            OR l.setter_id = auth.uid()
            OR l.closer_id = auth.uid()
            OR (
              public.is_closer()
              AND public.is_active_user()
              AND public.closer_can_read_lead(l.closer_id, l.status)
            )
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.commission_entries ce
        JOIN public.clients c ON c.id = ce.client_id
        WHERE c.deleted_at IS NULL
          AND (ce.setter_id = p_profile_id OR ce.closer_id = p_profile_id)
          AND (
            public.is_management()
            OR (public.is_closer() AND public.is_active_user())
            OR (
              public.is_setter()
              AND public.is_active_user()
              AND (c.setter_id = auth.uid() OR c.responsible_member_id = auth.uid())
            )
          )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_read_attribution_profile(UUID) TO authenticated;

CREATE POLICY "Users can read sales attribution profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.can_read_attribution_profile(id)
  );
