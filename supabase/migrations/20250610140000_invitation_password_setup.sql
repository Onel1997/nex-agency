-- Invited users remain pending until they set a password in the app.

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
    SET status = 'active', is_active = true, updated_at = now()
    WHERE id = NEW.id AND status = 'pending';
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
  SET status = 'active', is_active = true, updated_at = now()
  WHERE id = auth.uid() AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_pending_profile() TO authenticated;
