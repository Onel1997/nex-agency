-- Phase 1: Client-scoped freelancer payouts (separate from sales commissions
-- and Phase 14 vendor freelancer_payouts batch records).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS assigned_freelancer_id UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS freelancer_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (freelancer_commission_rate >= 0 AND freelancer_commission_rate <= 100),
  ADD COLUMN IF NOT EXISTS freelancer_payout_cents BIGINT NOT NULL DEFAULT 0
    CHECK (freelancer_payout_cents >= 0),
  ADD COLUMN IF NOT EXISTS freelancer_paid_cents BIGINT NOT NULL DEFAULT 0
    CHECK (freelancer_paid_cents >= 0),
  ADD COLUMN IF NOT EXISTS freelancer_outstanding_cents BIGINT NOT NULL DEFAULT 0
    CHECK (freelancer_outstanding_cents >= 0),
  ADD COLUMN IF NOT EXISTS freelancer_payout_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (freelancer_payout_status IN ('pending', 'partially_paid', 'paid'));

CREATE INDEX IF NOT EXISTS clients_assigned_freelancer_id_idx
  ON public.clients (assigned_freelancer_id);

CREATE INDEX IF NOT EXISTS clients_freelancer_payout_status_idx
  ON public.clients (freelancer_payout_status);

-- Per-client payout history (distinct from Phase 14 freelancer_payouts vendor batches).
CREATE TABLE IF NOT EXISTS public.client_freelancer_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_freelancer_payouts_client_id_idx
  ON public.client_freelancer_payouts (client_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS client_freelancer_payouts_freelancer_id_idx
  ON public.client_freelancer_payouts (freelancer_id, paid_at DESC);

ALTER TABLE public.client_freelancer_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_freelancer_payouts_select ON public.client_freelancer_payouts
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY client_freelancer_payouts_insert ON public.client_freelancer_payouts
  FOR INSERT TO authenticated
  WITH CHECK (true);
