-- Explicit invitation completion timestamp. Users are Active only after password setup.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_activated_at_idx ON public.profiles (activated_at);

-- Non-invited accounts are activated immediately.
UPDATE public.profiles p
SET activated_at = COALESCE(p.updated_at, p.created_at, now())
FROM auth.users u
WHERE p.id = u.id
  AND u.invited_at IS NULL
  AND p.activated_at IS NULL;

-- Invited accounts without a password remain pending.
UPDATE public.profiles p
SET
  status = 'pending',
  is_active = false,
  activated_at = NULL
FROM auth.users u
WHERE p.id = u.id
  AND u.invited_at IS NOT NULL
  AND (
    u.encrypted_password IS NULL
    OR u.encrypted_password = ''
  );

-- Invited accounts that already set a password keep active state.
UPDATE public.profiles p
SET
  status = 'active',
  is_active = true,
  activated_at = COALESCE(p.activated_at, p.updated_at, now())
FROM auth.users u
WHERE p.id = u.id
  AND u.invited_at IS NOT NULL
  AND u.encrypted_password IS NOT NULL
  AND u.encrypted_password <> ''
  AND p.activated_at IS NULL;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT status = 'active' AND activated_at IS NOT NULL
      FROM public.profiles
      WHERE id = auth.uid()
    ),
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
  member_activated_at TIMESTAMPTZ;
BEGIN
  IF NEW.invited_at IS NOT NULL THEN
    member_status := 'pending';
    member_active := false;
    member_activated_at := NULL;
  ELSE
    member_status := 'active';
    member_active := true;
    member_activated_at := now();
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    status,
    is_active,
    activated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    'employee',
    member_status,
    member_active,
    member_activated_at
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
  IF NEW.invited_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.confirmed_at IS NOT NULL
    AND (OLD.confirmed_at IS NULL OR OLD.confirmed_at IS DISTINCT FROM NEW.confirmed_at)
  THEN
    UPDATE public.profiles
    SET
      status = 'active',
      is_active = true,
      activated_at = COALESCE(activated_at, now()),
      updated_at = now()
    WHERE id = NEW.id
      AND activated_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_pending_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET
    status = 'active',
    is_active = true,
    activated_at = now(),
    updated_at = now()
  WHERE id = auth.uid()
    AND activated_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_invited_profile_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invited_at IS NOT NULL
    AND (OLD.invited_at IS NULL OR OLD.invited_at IS DISTINCT FROM NEW.invited_at)
  THEN
    UPDATE public.profiles
    SET
      status = 'pending',
      is_active = false,
      activated_at = NULL,
      updated_at = now()
    WHERE id = NEW.id
      AND activated_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_invited ON auth.users;
CREATE TRIGGER on_auth_user_invited
  AFTER UPDATE OF invited_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_invited_profile_pending();
