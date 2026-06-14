-- Phase 2: Agency roles, employment types, commission prep (setter/closer on leads/clients)

-- =============================================================================
-- profiles — employment_type + agency_role (separate from legacy role column)
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employment_type TEXT,
  ADD COLUMN IF NOT EXISTS agency_role TEXT,
  ADD COLUMN IF NOT EXISTS setter_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closer_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0;

UPDATE public.profiles
SET
  agency_role = CASE role
    WHEN 'super_admin' THEN 'owner'
    WHEN 'admin' THEN 'admin'
    WHEN 'sales_manager' THEN 'sales_manager'
    WHEN 'freelancer' THEN 'closer'
    ELSE 'setter'
  END,
  employment_type = CASE role
    WHEN 'freelancer' THEN 'freelancer'
    ELSE 'employee'
  END
WHERE agency_role IS NULL OR employment_type IS NULL;

UPDATE public.profiles
SET closer_commission_rate = commission_rate
WHERE closer_commission_rate = 0
  AND agency_role IN ('closer', 'sales_manager', 'owner', 'admin')
  AND commission_rate > 0;

UPDATE public.profiles
SET setter_commission_rate = commission_rate
WHERE setter_commission_rate = 0
  AND agency_role = 'setter'
  AND commission_rate > 0;

ALTER TABLE public.profiles
  ALTER COLUMN employment_type SET NOT NULL,
  ALTER COLUMN agency_role SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_employment_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_employment_type_check
  CHECK (employment_type IN ('employee', 'freelancer', 'external_partner'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_agency_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_agency_role_check
  CHECK (
    agency_role IN (
      'owner',
      'admin',
      'sales_manager',
      'setter',
      'closer',
      'project_manager',
      'customer_success'
    )
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_setter_commission_rate_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_setter_commission_rate_check
  CHECK (setter_commission_rate >= 0 AND setter_commission_rate <= 100);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_closer_commission_rate_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_closer_commission_rate_check
  CHECK (closer_commission_rate >= 0 AND closer_commission_rate <= 100);

-- =============================================================================
-- leads / clients — commission attribution prep
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS setter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS setter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_setter_id_idx ON public.leads (setter_id);
CREATE INDEX IF NOT EXISTS leads_closer_id_idx ON public.leads (closer_id);
CREATE INDEX IF NOT EXISTS clients_setter_id_idx ON public.clients (setter_id);
CREATE INDEX IF NOT EXISTS clients_closer_id_idx ON public.clients (closer_id);

-- =============================================================================
-- Keep legacy role column in sync for existing RLS helpers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_profile_legacy_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.employment_type = 'freelancer' THEN
    NEW.role := 'freelancer';
  ELSIF NEW.agency_role = 'owner' THEN
    NEW.role := 'super_admin';
  ELSIF NEW.agency_role = 'admin' THEN
    NEW.role := 'admin';
  ELSIF NEW.agency_role = 'sales_manager' THEN
    NEW.role := 'sales_manager';
  ELSE
    NEW.role := 'employee';
  END IF;

  NEW.commission_rate := GREATEST(NEW.setter_commission_rate, NEW.closer_commission_rate);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_legacy_role ON public.profiles;
CREATE TRIGGER profiles_sync_legacy_role
  BEFORE INSERT OR UPDATE OF employment_type, agency_role, setter_commission_rate, closer_commission_rate
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_legacy_role();

UPDATE public.profiles
SET employment_type = employment_type;

-- =============================================================================
-- Role helper functions (agency_role is source of truth)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_agency_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_role FROM public.profiles WHERE id = auth.uid();
$$;

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
  SELECT public.get_user_agency_role() = 'owner';
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_agency_role() IN ('owner', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_management()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_sales_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_agency_role() = 'sales_manager';
$$;

CREATE OR REPLACE FUNCTION public.is_field_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_agency_role() IN (
    'sales_manager',
    'setter',
    'closer',
    'project_manager',
    'customer_success'
  )
  OR (
    public.get_user_agency_role() IS NULL
    AND public.get_user_role() IN ('sales_manager', 'employee', 'freelancer')
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_user_agency_role() TO authenticated;

-- =============================================================================
-- Profile self-update: lock agency_role / employment_type / commission fields
-- =============================================================================

DROP POLICY IF EXISTS "Active users can update own profile" ON public.profiles;
CREATE POLICY "Active users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND id = auth.uid())
  WITH CHECK (
    public.is_active_user()
    AND id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND agency_role = (SELECT p.agency_role FROM public.profiles p WHERE p.id = auth.uid())
    AND employment_type = (SELECT p.employment_type FROM public.profiles p WHERE p.id = auth.uid())
    AND setter_commission_rate = (SELECT p.setter_commission_rate FROM public.profiles p WHERE p.id = auth.uid())
    AND closer_commission_rate = (SELECT p.closer_commission_rate FROM public.profiles p WHERE p.id = auth.uid())
    AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
  );

COMMENT ON COLUMN public.profiles.employment_type IS
  'How the person works with the agency: employee, freelancer, or external_partner.';
COMMENT ON COLUMN public.profiles.agency_role IS
  'Agency permission role. Drives app-level authorization (separate from employment_type).';
COMMENT ON COLUMN public.leads.setter_id IS
  'Setter credited for this lead (commission prep — payout in a later phase).';
COMMENT ON COLUMN public.leads.closer_id IS
  'Closer credited when the lead is won (commission prep — payout in a later phase).';

-- =============================================================================
-- New auth users — default agency role + employment type
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    agency_role,
    employment_type
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    'employee',
    'setter',
    'employee'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Management can update profiles" ON public.profiles;
CREATE POLICY "Management can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_management()
    AND (
      public.is_super_admin()
      OR agency_role <> 'owner'
    )
  )
  WITH CHECK (
    public.is_active_user()
    AND public.is_management()
    AND (
      public.is_super_admin()
      OR agency_role <> 'owner'
    )
  );
