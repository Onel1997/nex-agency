-- Team roles audit fix: sales_manager constraint, RLS super_admin protection, legacy data

-- 1) Normalize legacy role values
UPDATE public.profiles
SET role = 'sales_manager'
WHERE role = 'sales';

-- 2) Ensure CHECK constraint accepts sales_manager (not legacy sales)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'sales_manager', 'employee', 'freelancer'));

-- 3) Never default or backfill everyone to super_admin — only explicit founder row if needed
-- (No broad UPDATE to super_admin here.)

-- 4) New users stay employee (re-assert trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    'employee'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5) RLS: non–super-admins must not update super_admin profiles (USING checks existing row)
DROP POLICY IF EXISTS "Management can update profiles" ON public.profiles;

CREATE POLICY "Management can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user()
    AND public.is_management()
    AND (
      public.is_super_admin()
      OR role <> 'super_admin'
    )
  )
  WITH CHECK (
    public.is_active_user()
    AND public.is_management()
    AND (
      public.is_super_admin()
      OR role <> 'super_admin'
    )
  );

-- 6) Staff role helper accepts sales_manager only
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
