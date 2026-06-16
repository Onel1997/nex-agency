-- Phase 2: Automatic freelancer invoices for commission payouts
-- One invoice per commission_payout (1:1 via commission_payout_id UNIQUE)

-- =============================================================================
-- commission_freelancer_invoices
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.commission_freelancer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_payout_id UUID NOT NULL UNIQUE
    REFERENCES public.commission_payouts(id) ON DELETE RESTRICT,
  freelancer_profile_id UUID
    REFERENCES public.freelancer_profiles(id) ON DELETE SET NULL,
  profile_id UUID NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  commission_entry_id UUID NOT NULL
    REFERENCES public.commission_entries(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL
    REFERENCES public.clients(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('setter', 'closer')),
  invoice_number TEXT NOT NULL UNIQUE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  service_description TEXT NOT NULL CHECK (char_length(trim(service_description)) > 0),
  billing_period_year INTEGER CHECK (
    billing_period_year IS NULL OR billing_period_year BETWEEN 2000 AND 2100
  ),
  billing_period_month INTEGER CHECK (
    billing_period_month IS NULL OR billing_period_month BETWEEN 1 AND 12
  ),
  invoice_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (
    status IN ('draft', 'issued', 'completed')
  ),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commission_freelancer_invoices_payout_idx
  ON public.commission_freelancer_invoices (commission_payout_id);

CREATE INDEX IF NOT EXISTS commission_freelancer_invoices_profile_idx
  ON public.commission_freelancer_invoices (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS commission_freelancer_invoices_entry_idx
  ON public.commission_freelancer_invoices (commission_entry_id);

CREATE INDEX IF NOT EXISTS commission_freelancer_invoices_client_idx
  ON public.commission_freelancer_invoices (client_id);

ALTER TABLE public.commission_freelancer_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management can read commission freelancer invoices"
  ON public.commission_freelancer_invoices FOR SELECT
  TO authenticated
  USING (public.is_management());

CREATE POLICY "Members can read own commission freelancer invoices"
  ON public.commission_freelancer_invoices FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Management can insert commission freelancer invoices"
  ON public.commission_freelancer_invoices FOR INSERT
  TO authenticated
  WITH CHECK (public.is_management());

CREATE POLICY "Management can update commission freelancer invoices"
  ON public.commission_freelancer_invoices FOR UPDATE
  TO authenticated
  USING (public.is_management())
  WITH CHECK (public.is_management());

COMMENT ON TABLE public.commission_freelancer_invoices IS
  'Auto-generated freelancer invoices for commission payouts (1:1 per commission_payout).';
COMMENT ON COLUMN public.commission_freelancer_invoices.commission_payout_id IS
  'UNIQUE — exactly one invoice per payout; idempotency anchor.';
COMMENT ON COLUMN public.commission_freelancer_invoices.status IS
  'completed = payout settled and invoice finalized (PDF may follow best-effort).';
