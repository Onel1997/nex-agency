-- Phase 7b: Commission payout history per client

CREATE TABLE IF NOT EXISTS public.client_commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  payout_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_commission_payouts_client_id_idx
  ON public.client_commission_payouts (client_id);

CREATE INDEX IF NOT EXISTS client_commission_payouts_payout_date_idx
  ON public.client_commission_payouts (client_id, payout_date DESC);

ALTER TABLE public.client_commission_payouts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_commission_payouts'
      AND policyname = 'Management can read all commission payouts'
  ) THEN
    CREATE POLICY "Management can read all commission payouts"
      ON public.client_commission_payouts FOR SELECT
      TO authenticated
      USING (public.is_active_user() AND public.is_management());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_commission_payouts'
      AND policyname = 'Staff can read own client commission payouts'
  ) THEN
    CREATE POLICY "Staff can read own client commission payouts"
      ON public.client_commission_payouts FOR SELECT
      TO authenticated
      USING (
        public.is_active_user()
        AND public.get_user_role() IN ('sales', 'employee', 'freelancer')
        AND EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = client_commission_payouts.client_id
            AND clients.responsible_member_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_commission_payouts'
      AND policyname = 'Management can insert commission payouts'
  ) THEN
    CREATE POLICY "Management can insert commission payouts"
      ON public.client_commission_payouts FOR INSERT
      TO authenticated
      WITH CHECK (public.is_active_user() AND public.is_management());
  END IF;
END $$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS last_commission_payout_at TIMESTAMPTZ;
