-- Team member status: pending (invited), active, deactivated

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'deactivated'));

CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles (status);

UPDATE public.profiles
SET status = CASE
  WHEN is_active THEN 'active'
  ELSE 'deactivated'
END;

-- Sync pending state for invited but unconfirmed auth users
UPDATE public.profiles p
SET
  status = 'pending',
  is_active = false
FROM auth.users u
WHERE p.id = u.id
  AND u.invited_at IS NOT NULL
  AND u.confirmed_at IS NULL;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status = 'active' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_status TEXT;
  member_active BOOLEAN;
BEGIN
  IF NEW.invited_at IS NOT NULL AND NEW.confirmed_at IS NULL THEN
    member_status := 'pending';
    member_active := false;
  ELSE
    member_status := 'active';
    member_active := true;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, status, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    'employee',
    member_status,
    member_active
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_profile_on_auth_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.confirmed_at IS NOT NULL
    AND (OLD.confirmed_at IS NULL OR OLD.confirmed_at IS DISTINCT FROM NEW.confirmed_at)
  THEN
    UPDATE public.profiles
    SET status = 'active', is_active = true, updated_at = now()
    WHERE id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.activate_profile_on_auth_confirm();

DROP POLICY IF EXISTS "Active users can update own profile" ON public.profiles;

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
