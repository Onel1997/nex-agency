-- NexAgency CRM Phase 14: Super Admin Finance Center + Freelancer Billing

-- =============================================================================
-- Freelancers (vendor records)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.freelancers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  company_name TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  street TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'Deutschland',
  tax_number TEXT,
  vat_id TEXT,
  iban TEXT,
  bic TEXT,
  default_commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (default_commission_rate >= 0 AND default_commission_rate <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_payout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS freelancers_name_idx ON public.freelancers (name);
CREATE INDEX IF NOT EXISTS freelancers_is_active_idx ON public.freelancers (is_active);

-- =============================================================================
-- Freelancer invoices (freelancer → NexAgency)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.freelancer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES public.freelancers(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL CHECK (char_length(trim(description)) > 0),
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  tax_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_amount_cents >= 0),
  total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents >= 0),
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 19 CHECK (vat_rate >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'paid')),
  due_date DATE,
  submitted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS freelancer_invoices_freelancer_id_idx
  ON public.freelancer_invoices (freelancer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS freelancer_invoices_status_idx
  ON public.freelancer_invoices (status);

-- =============================================================================
-- Freelancer payouts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.freelancer_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES public.freelancers(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  payout_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'ausgezahlt')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS freelancer_payouts_freelancer_id_idx
  ON public.freelancer_payouts (freelancer_id, payout_date DESC);
CREATE INDEX IF NOT EXISTS freelancer_payouts_status_idx
  ON public.freelancer_payouts (status);

-- Related projects (clients) per payout
CREATE TABLE IF NOT EXISTS public.freelancer_payout_clients (
  payout_id UUID NOT NULL REFERENCES public.freelancer_payouts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  PRIMARY KEY (payout_id, client_id)
);

CREATE INDEX IF NOT EXISTS freelancer_payout_clients_client_id_idx
  ON public.freelancer_payout_clients (client_id);

-- Link payouts to freelancer invoices they settle
CREATE TABLE IF NOT EXISTS public.freelancer_payout_invoices (
  payout_id UUID NOT NULL REFERENCES public.freelancer_payouts(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.freelancer_invoices(id) ON DELETE RESTRICT,
  PRIMARY KEY (payout_id, invoice_id)
);

-- =============================================================================
-- Agency expenses
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  expense_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  category TEXT NOT NULL CHECK (category IN ('software', 'advertising', 'freelancer', 'hosting', 'office', 'other')),
  note TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_expense_date_idx
  ON public.expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_category_idx
  ON public.expenses (category);

-- =============================================================================
-- Freelancer invoice number sequence
-- =============================================================================

CREATE OR REPLACE FUNCTION public.next_freelancer_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYY');
  seq_key TEXT := 'freelancer_invoice_' || yr;
  next_val BIGINT;
BEGIN
  INSERT INTO public.number_sequences (key, last_value)
  VALUES (seq_key, 0)
  ON CONFLICT (key) DO NOTHING;

  UPDATE public.number_sequences
  SET last_value = last_value + 1
  WHERE key = seq_key
  RETURNING last_value INTO next_val;

  RETURN 'FR-' || yr || '-' || lpad(next_val::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_freelancer_invoice_number() TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_freelancer_invoice_number_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.invoice_number IS NOT NULL
     AND NEW.invoice_number IS DISTINCT FROM OLD.invoice_number THEN
    RAISE EXCEPTION 'Freelancer invoice number cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_freelancer_invoice_number_update_trigger
  ON public.freelancer_invoices;
CREATE TRIGGER prevent_freelancer_invoice_number_update_trigger
  BEFORE UPDATE ON public.freelancer_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_freelancer_invoice_number_update();

-- =============================================================================
-- updated_at triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS freelancers_set_updated_at ON public.freelancers;
CREATE TRIGGER freelancers_set_updated_at
  BEFORE UPDATE ON public.freelancers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS freelancer_invoices_set_updated_at ON public.freelancer_invoices;
CREATE TRIGGER freelancer_invoices_set_updated_at
  BEFORE UPDATE ON public.freelancer_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS freelancer_payouts_set_updated_at ON public.freelancer_payouts;
CREATE TRIGGER freelancer_payouts_set_updated_at
  BEFORE UPDATE ON public.freelancer_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS expenses_set_updated_at ON public.expenses;
CREATE TRIGGER expenses_set_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- RLS — management only (finance routes)
-- =============================================================================

ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payout_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payout_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management can read freelancers"
  ON public.freelancers FOR SELECT TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can insert freelancers"
  ON public.freelancers FOR INSERT TO authenticated
  WITH CHECK (public.is_management());

CREATE POLICY "Management can update freelancers"
  ON public.freelancers FOR UPDATE TO authenticated
  USING (public.is_management())
  WITH CHECK (public.is_management());

CREATE POLICY "Management can delete freelancers"
  ON public.freelancers FOR DELETE TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can read freelancer invoices"
  ON public.freelancer_invoices FOR SELECT TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can insert freelancer invoices"
  ON public.freelancer_invoices FOR INSERT TO authenticated
  WITH CHECK (public.is_management());

CREATE POLICY "Management can update freelancer invoices"
  ON public.freelancer_invoices FOR UPDATE TO authenticated
  USING (public.is_management())
  WITH CHECK (public.is_management());

CREATE POLICY "Management can delete freelancer invoices"
  ON public.freelancer_invoices FOR DELETE TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can read freelancer payouts"
  ON public.freelancer_payouts FOR SELECT TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can insert freelancer payouts"
  ON public.freelancer_payouts FOR INSERT TO authenticated
  WITH CHECK (public.is_management());

CREATE POLICY "Management can update freelancer payouts"
  ON public.freelancer_payouts FOR UPDATE TO authenticated
  USING (public.is_management())
  WITH CHECK (public.is_management());

CREATE POLICY "Management can delete freelancer payouts"
  ON public.freelancer_payouts FOR DELETE TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can read payout clients"
  ON public.freelancer_payout_clients FOR SELECT TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can insert payout clients"
  ON public.freelancer_payout_clients FOR INSERT TO authenticated
  WITH CHECK (public.is_management());

CREATE POLICY "Management can delete payout clients"
  ON public.freelancer_payout_clients FOR DELETE TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can read payout invoices"
  ON public.freelancer_payout_invoices FOR SELECT TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can insert payout invoices"
  ON public.freelancer_payout_invoices FOR INSERT TO authenticated
  WITH CHECK (public.is_management());

CREATE POLICY "Management can delete payout invoices"
  ON public.freelancer_payout_invoices FOR DELETE TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can read expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can insert expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.is_management());

CREATE POLICY "Management can update expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING (public.is_management())
  WITH CHECK (public.is_management());

CREATE POLICY "Management can delete expenses"
  ON public.expenses FOR DELETE TO authenticated
  USING (public.is_management());
