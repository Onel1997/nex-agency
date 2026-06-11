-- Team sprint: rename sales → sales_manager, staff-role helpers, RLS alignment

UPDATE public.profiles
SET role = 'sales_manager'
WHERE role = 'sales';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'sales_manager', 'employee', 'freelancer'));

CREATE OR REPLACE FUNCTION public.is_sales_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'sales_manager'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_sales()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_sales_manager();
$$;

CREATE OR REPLACE FUNCTION public.is_field_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() IN ('sales_manager', 'employee', 'freelancer');
$$;

GRANT EXECUTE ON FUNCTION public.is_sales_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_field_staff() TO authenticated;

COMMENT ON COLUMN public.leads.owner_id IS
  'Assigned responsible team member (assigned_user_id semantic alias).';

COMMENT ON COLUMN public.clients.responsible_member_id IS
  'Assigned responsible team member (assigned_user_id semantic alias).';

-- Leads: staff policies
DROP POLICY IF EXISTS "Staff can update own leads" ON public.leads;
CREATE POLICY "Staff can update own leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_field_staff()
    AND owner_id = auth.uid()
  )
  WITH CHECK (
    public.is_active_user()
    AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Staff can delete own leads" ON public.leads;
CREATE POLICY "Staff can delete own leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_field_staff()
    AND owner_id = auth.uid()
  );

-- Clients: staff policies
DROP POLICY IF EXISTS "Staff can read own clients" ON public.clients;
CREATE POLICY "Staff can read own clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_field_staff()
    AND responsible_member_id = auth.uid()
  );

DROP POLICY IF EXISTS "Staff can update own clients" ON public.clients;
CREATE POLICY "Staff can update own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_field_staff()
    AND responsible_member_id = auth.uid()
  )
  WITH CHECK (
    public.is_active_user()
    AND responsible_member_id = auth.uid()
  );

-- Retainer payments: staff read policy (Phase 6)
DROP POLICY IF EXISTS "Staff can read own client retainer payments" ON public.client_retainer_payments;
CREATE POLICY "Staff can read own client retainer payments"
  ON public.client_retainer_payments FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_field_staff()
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_retainer_payments.client_id
        AND clients.responsible_member_id = auth.uid()
    )
  );

-- Commission payouts: staff read policy (Phase 7)
DROP POLICY IF EXISTS "Staff can read own client commission payouts" ON public.client_commission_payouts;
CREATE POLICY "Staff can read own client commission payouts"
  ON public.client_commission_payouts FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_field_staff()
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_commission_payouts.client_id
        AND clients.responsible_member_id = auth.uid()
    )
  );
