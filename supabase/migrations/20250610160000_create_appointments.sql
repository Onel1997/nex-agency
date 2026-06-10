-- NexAgency CRM Phase 3: Appointments & calendar

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  assigned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT appointments_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS appointments_assigned_user_id_idx
  ON public.appointments (assigned_user_id);
CREATE INDEX IF NOT EXISTS appointments_lead_id_idx
  ON public.appointments (lead_id);
CREATE INDEX IF NOT EXISTS appointments_start_time_idx
  ON public.appointments (start_time);
CREATE INDEX IF NOT EXISTS appointments_status_idx
  ON public.appointments (status);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_appointments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_updated_at ON public.appointments;
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_appointments_updated_at();

CREATE POLICY "Admins can read all appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND public.is_admin());

CREATE POLICY "Employees can read own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (public.is_active_user() AND assigned_user_id = auth.uid());

CREATE POLICY "Active users can insert appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND (assigned_user_id = auth.uid() OR public.is_admin())
  );

CREATE POLICY "Admins can update all appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND public.is_admin())
  WITH CHECK (public.is_active_user() AND public.is_admin());

CREATE POLICY "Employees can update own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (public.is_active_user() AND assigned_user_id = auth.uid())
  WITH CHECK (public.is_active_user() AND assigned_user_id = auth.uid());

CREATE POLICY "Admins can delete all appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (public.is_active_user() AND public.is_admin());

CREATE POLICY "Employees can delete own appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (public.is_active_user() AND assigned_user_id = auth.uid());
