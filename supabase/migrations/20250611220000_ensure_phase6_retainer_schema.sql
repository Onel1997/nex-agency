-- Ensure Phase 6 retainer schema (idempotent — safe if 20250611210000 was not applied)

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contract_start_date DATE;

UPDATE public.clients
SET contract_start_date = created_at::date
WHERE contract_start_date IS NULL;

CREATE TABLE IF NOT EXISTS public.client_retainer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('paid', 'open')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS client_retainer_payments_client_id_idx
  ON public.client_retainer_payments (client_id);

CREATE INDEX IF NOT EXISTS client_retainer_payments_period_idx
  ON public.client_retainer_payments (client_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS clients_contract_start_date_idx
  ON public.clients (contract_start_date);

ALTER TABLE public.client_retainer_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_retainer_payments'
      AND policyname = 'Management can read all retainer payments'
  ) THEN
    CREATE POLICY "Management can read all retainer payments"
      ON public.client_retainer_payments FOR SELECT
      TO authenticated
      USING (public.is_active_user() AND public.is_management());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_retainer_payments'
      AND policyname = 'Staff can read own client retainer payments'
  ) THEN
    CREATE POLICY "Staff can read own client retainer payments"
      ON public.client_retainer_payments FOR SELECT
      TO authenticated
      USING (
        public.is_active_user()
        AND public.get_user_role() IN ('sales', 'employee', 'freelancer')
        AND EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = client_retainer_payments.client_id
            AND clients.responsible_member_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_retainer_payments'
      AND policyname = 'Management can insert retainer payments'
  ) THEN
    CREATE POLICY "Management can insert retainer payments"
      ON public.client_retainer_payments FOR INSERT
      TO authenticated
      WITH CHECK (public.is_active_user() AND public.is_management());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_retainer_payments'
      AND policyname = 'Management can update retainer payments'
  ) THEN
    CREATE POLICY "Management can update retainer payments"
      ON public.client_retainer_payments FOR UPDATE
      TO authenticated
      USING (public.is_active_user() AND public.is_management())
      WITH CHECK (public.is_active_user() AND public.is_management());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_retainer_payments'
      AND policyname = 'Management can delete retainer payments'
  ) THEN
    CREATE POLICY "Management can delete retainer payments"
      ON public.client_retainer_payments FOR DELETE
      TO authenticated
      USING (public.is_active_user() AND public.is_management());
  END IF;
END $$;

INSERT INTO public.client_retainer_payments (client_id, period_year, period_month, status, paid_at)
SELECT
  c.id,
  EXTRACT(YEAR FROM c.contract_start_date)::INT,
  EXTRACT(MONTH FROM c.contract_start_date)::INT,
  'paid',
  c.created_at
FROM public.clients c
WHERE c.contract_start_date IS NOT NULL
  AND COALESCE(c.monthly_revenue_cents, 0) > 0
  AND COALESCE(c.total_revenue_cents, 0) > COALESCE(c.setup_fee_cents, 0)
  AND NOT EXISTS (
    SELECT 1 FROM public.client_retainer_payments p WHERE p.client_id = c.id
  )
ON CONFLICT (client_id, period_year, period_month) DO NOTHING;
