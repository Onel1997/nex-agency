-- NexAgency CRM Phase 2: Team management, clients, activity logs

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS profiles_is_active_idx ON public.profiles (is_active);

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_assigned_to_fkey;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_assigned_to_idx ON public.clients (assigned_to);
CREATE INDEX IF NOT EXISTS clients_created_at_idx ON public.clients (created_at DESC);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_actor_id_idx ON public.activity_logs (actor_id);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_current_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_current_profile() TO authenticated;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Active users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_active_user()
    AND (id = auth.uid() OR public.is_admin())
  );

CREATE POLICY "Active users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND id = auth.uid())
  WITH CHECK (
    public.is_active_user()
    AND id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND public.is_admin())
  WITH CHECK (public.is_active_user() AND public.is_admin());

DROP POLICY IF EXISTS "Admins can read all leads" ON public.leads;
DROP POLICY IF EXISTS "Employees can read own leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update all leads" ON public.leads;
DROP POLICY IF EXISTS "Employees can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete all leads" ON public.leads;
DROP POLICY IF EXISTS "Employees can delete own leads" ON public.leads;

CREATE POLICY "Admins can read all leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND public.is_admin());

CREATE POLICY "Employees can read own leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND assigned_to = auth.uid());

CREATE POLICY "Active users can insert leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND (assigned_to = auth.uid() OR public.is_admin())
  );

CREATE POLICY "Admins can update all leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND public.is_admin())
  WITH CHECK (public.is_active_user() AND public.is_admin());

CREATE POLICY "Employees can update own leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND assigned_to = auth.uid())
  WITH CHECK (public.is_active_user() AND assigned_to = auth.uid());

CREATE POLICY "Admins can delete all leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (public.is_active_user() AND public.is_admin());

CREATE POLICY "Employees can delete own leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (public.is_active_user() AND assigned_to = auth.uid());

CREATE POLICY "Admins can read all clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND public.is_admin());

CREATE POLICY "Employees can read own clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND assigned_to = auth.uid());

CREATE POLICY "Active users can insert clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND (assigned_to = auth.uid() OR public.is_admin())
  );

CREATE POLICY "Admins can update all clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND public.is_admin())
  WITH CHECK (public.is_active_user() AND public.is_admin());

CREATE POLICY "Employees can update own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND assigned_to = auth.uid())
  WITH CHECK (public.is_active_user() AND assigned_to = auth.uid());

CREATE POLICY "Admins can delete all clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (public.is_active_user() AND public.is_admin());

CREATE POLICY "Employees can delete own clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (public.is_active_user() AND assigned_to = auth.uid());

CREATE POLICY "Admins can read all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND public.is_admin());

CREATE POLICY "Employees can read own activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND actor_id = auth.uid());

CREATE POLICY "Active users can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_user() AND actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_client_from_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'client' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'client') THEN
    INSERT INTO public.clients (
      lead_id,
      company_name,
      contact_name,
      email,
      phone,
      website,
      assigned_to
    )
    VALUES (
      NEW.id,
      NEW.company_name,
      NEW.contact_name,
      NEW.email,
      NEW.phone,
      NEW.website,
      NEW.assigned_to
    )
    ON CONFLICT (lead_id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      contact_name = EXCLUDED.contact_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      website = EXCLUDED.website,
      assigned_to = EXCLUDED.assigned_to;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_client_on_lead_status ON public.leads;
CREATE TRIGGER sync_client_on_lead_status
  AFTER INSERT OR UPDATE OF status, company_name, contact_name, email, phone, website, assigned_to
  ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.sync_client_from_lead();

-- Backfill clients for existing leads with status = client
INSERT INTO public.clients (
  lead_id,
  company_name,
  contact_name,
  email,
  phone,
  website,
  assigned_to
)
SELECT
  id,
  company_name,
  contact_name,
  email,
  phone,
  website,
  assigned_to
FROM public.leads
WHERE status = 'client'
ON CONFLICT (lead_id) DO NOTHING;
