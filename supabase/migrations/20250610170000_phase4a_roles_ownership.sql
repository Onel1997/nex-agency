-- NexAgency CRM Phase 4A (Batch 1): Five-role system, ownership fields, RLS rewrite
--
-- PREREQUISITE: Confirm founder email below before applying.
-- Default founder promotion: admin@nexagency.de (see § FOUNDER PROMOTION)

-- =============================================================================
-- SECTION 1: SQL helper functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_management()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_sales()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'sales'
  );
$$;

-- Backward-compatible alias: legacy is_admin() now means management (super_admin + admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_management();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_management() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sales() TO authenticated;

-- =============================================================================
-- SECTION 2: Expand profiles.role to five values
-- =============================================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- FOUNDER PROMOTION: adjust email if your founder account differs
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'admin@nexagency.de'
  AND role = 'admin';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'sales', 'employee', 'freelancer'));

-- =============================================================================
-- SECTION 3: Leads — ownership + estimated value fields
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimated_value_cents BIGINT
    CHECK (estimated_value_cents IS NULL OR estimated_value_cents >= 0),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR';

-- Backfill creator from current assignee
UPDATE public.leads
SET created_by = assigned_to
WHERE created_by IS NULL
  AND assigned_to IS NOT NULL;

-- Backfill orphan leads from earliest management profile
UPDATE public.leads
SET created_by = (
  SELECT p.id
  FROM public.profiles p
  WHERE p.role IN ('super_admin', 'admin')
    AND p.status = 'active'
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE created_by IS NULL;

-- Final fallback: any profile (ensures NOT NULL if at least one user exists)
UPDATE public.leads
SET created_by = (
  SELECT p.id
  FROM public.profiles p
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE created_by IS NULL;

ALTER TABLE public.leads
  ALTER COLUMN created_by SET DEFAULT auth.uid(),
  ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE public.leads
  RENAME COLUMN assigned_to TO owner_id;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_assigned_to_fkey;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

DROP INDEX IF EXISTS leads_assigned_to_idx;
CREATE INDEX IF NOT EXISTS leads_owner_id_idx ON public.leads (owner_id);
CREATE INDEX IF NOT EXISTS leads_created_by_idx ON public.leads (created_by);
CREATE INDEX IF NOT EXISTS leads_estimated_value_cents_idx ON public.leads (estimated_value_cents);

-- =============================================================================
-- SECTION 4: Clients — responsible member + revenue fields
-- =============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contract_value_cents BIGINT
    CHECK (contract_value_cents IS NULL OR contract_value_cents >= 0),
  ADD COLUMN IF NOT EXISTS monthly_retainer_cents BIGINT
    CHECK (monthly_retainer_cents IS NULL OR monthly_retainer_cents >= 0),
  ADD COLUMN IF NOT EXISTS one_time_project_value_cents BIGINT
    CHECK (one_time_project_value_cents IS NULL OR one_time_project_value_cents >= 0),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR';

ALTER TABLE public.clients
  RENAME COLUMN assigned_to TO responsible_member_id;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_assigned_to_fkey;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_responsible_member_id_fkey
  FOREIGN KEY (responsible_member_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS clients_assigned_to_idx;
CREATE INDEX IF NOT EXISTS clients_responsible_member_id_idx
  ON public.clients (responsible_member_id);

-- =============================================================================
-- SECTION 5: Lead → client sync trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_client_from_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'client'
    AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'client')
  THEN
    INSERT INTO public.clients (
      lead_id,
      company_name,
      contact_name,
      email,
      phone,
      website,
      responsible_member_id,
      contract_value_cents,
      currency
    )
    VALUES (
      NEW.id,
      NEW.company_name,
      NEW.contact_name,
      NEW.email,
      NEW.phone,
      NEW.website,
      NEW.owner_id,
      NEW.estimated_value_cents,
      COALESCE(NEW.currency, 'EUR')
    )
    ON CONFLICT (lead_id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      contact_name = EXCLUDED.contact_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      website = EXCLUDED.website,
      responsible_member_id = EXCLUDED.responsible_member_id,
      contract_value_cents = COALESCE(
        clients.contract_value_cents,
        EXCLUDED.contract_value_cents
      ),
      currency = EXCLUDED.currency;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.status = 'client'
    AND OLD.status = 'client'
  THEN
    UPDATE public.clients
    SET
      company_name = NEW.company_name,
      contact_name = NEW.contact_name,
      email = NEW.email,
      phone = NEW.phone,
      website = NEW.website,
      responsible_member_id = NEW.owner_id
    WHERE lead_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_client_on_lead_status ON public.leads;
CREATE TRIGGER sync_client_on_lead_status
  AFTER INSERT OR UPDATE OF
    status,
    company_name,
    contact_name,
    email,
    phone,
    website,
    owner_id,
    estimated_value_cents,
    currency
  ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.sync_client_from_lead();

-- Sync existing client rows with renamed ownership + optional contract value from lead
UPDATE public.clients c
SET
  responsible_member_id = l.owner_id,
  contract_value_cents = COALESCE(c.contract_value_cents, l.estimated_value_cents),
  currency = COALESCE(c.currency, l.currency, 'EUR')
FROM public.leads l
WHERE c.lead_id = l.id
  AND l.status = 'client';

-- =============================================================================
-- SECTION 6: Drop legacy RLS policies
-- =============================================================================

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Active users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Active users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- leads
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can read all leads" ON public.leads;
DROP POLICY IF EXISTS "Employees can read own leads" ON public.leads;
DROP POLICY IF EXISTS "Active users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update all leads" ON public.leads;
DROP POLICY IF EXISTS "Employees can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete all leads" ON public.leads;
DROP POLICY IF EXISTS "Employees can delete own leads" ON public.leads;

-- clients
DROP POLICY IF EXISTS "Admins can read all clients" ON public.clients;
DROP POLICY IF EXISTS "Employees can read own clients" ON public.clients;
DROP POLICY IF EXISTS "Active users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update all clients" ON public.clients;
DROP POLICY IF EXISTS "Employees can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete all clients" ON public.clients;
DROP POLICY IF EXISTS "Employees can delete own clients" ON public.clients;

-- activity_logs
DROP POLICY IF EXISTS "Admins can read all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Employees can read own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Active users can insert activity logs" ON public.activity_logs;

-- appointments
DROP POLICY IF EXISTS "Admins can read all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Employees can read own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Active users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can update all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Employees can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can delete all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Employees can delete own appointments" ON public.appointments;

-- =============================================================================
-- SECTION 7: New RLS policies — profiles
-- =============================================================================

CREATE POLICY "Management can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND (id = auth.uid() OR public.is_management())
  );

CREATE POLICY "Active users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND id = auth.uid())
  WITH CHECK (
    public.is_active_user()
    AND id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND status = (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid())
    AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Management can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND public.is_management())
  WITH CHECK (
    public.is_active_user()
    AND public.is_management()
    AND (public.is_super_admin() OR role <> 'super_admin')
  );

-- =============================================================================
-- SECTION 8: New RLS policies — leads
-- =============================================================================

CREATE POLICY "Management can read all leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND public.is_management());

CREATE POLICY "Sales can read relevant leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_sales()
    AND (owner_id = auth.uid() OR created_by = auth.uid())
  );

CREATE POLICY "Staff can read own leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.get_user_role() IN ('employee', 'freelancer')
    AND owner_id = auth.uid()
  );

CREATE POLICY "Active users can insert leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND created_by = auth.uid()
    AND (owner_id = auth.uid() OR public.is_management())
  );

CREATE POLICY "Management can update all leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND public.is_management())
  WITH CHECK (public.is_active_user() AND public.is_management());

CREATE POLICY "Staff can update own leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.get_user_role() IN ('sales', 'employee', 'freelancer')
    AND owner_id = auth.uid()
  )
  WITH CHECK (
    public.is_active_user()
    AND owner_id = auth.uid()
  );

CREATE POLICY "Management can delete all leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (public.is_active_user() AND public.is_management());

CREATE POLICY "Staff can delete own leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.get_user_role() IN ('sales', 'employee', 'freelancer')
    AND owner_id = auth.uid()
  );

-- =============================================================================
-- SECTION 9: New RLS policies — clients
-- =============================================================================

CREATE POLICY "Management can read all clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND public.is_management());

CREATE POLICY "Staff can read own clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND public.get_user_role() IN ('sales', 'employee', 'freelancer')
    AND responsible_member_id = auth.uid()
  );

CREATE POLICY "Management and sync can insert clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND (
      public.is_management()
      OR responsible_member_id = auth.uid()
    )
  );

CREATE POLICY "Management can update all clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND public.is_management())
  WITH CHECK (public.is_active_user() AND public.is_management());

CREATE POLICY "Staff can update own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.get_user_role() IN ('sales', 'employee', 'freelancer')
    AND responsible_member_id = auth.uid()
  )
  WITH CHECK (
    public.is_active_user()
    AND responsible_member_id = auth.uid()
  );

CREATE POLICY "Management can delete clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (public.is_active_user() AND public.is_management());

-- =============================================================================
-- SECTION 10: New RLS policies — activity_logs
-- =============================================================================

CREATE POLICY "Management can read all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND public.is_management());

CREATE POLICY "Staff can read own activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND actor_id = auth.uid());

CREATE POLICY "Active users can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_user() AND actor_id = auth.uid());

-- =============================================================================
-- SECTION 11: New RLS policies — appointments
-- =============================================================================

CREATE POLICY "Management can read all appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND public.is_management());

CREATE POLICY "Staff can read own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND assigned_user_id = auth.uid());

CREATE POLICY "Active users can insert appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND (assigned_user_id = auth.uid() OR public.is_management())
  );

CREATE POLICY "Management can update all appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND public.is_management())
  WITH CHECK (public.is_active_user() AND public.is_management());

CREATE POLICY "Staff can update own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND assigned_user_id = auth.uid())
  WITH CHECK (public.is_active_user() AND assigned_user_id = auth.uid());

CREATE POLICY "Management can delete all appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (public.is_active_user() AND public.is_management());

CREATE POLICY "Staff can delete own appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (public.is_active_user() AND assigned_user_id = auth.uid());
