-- Freelancer Center: billing profiles linked to team profiles (single source of truth)

-- =============================================================================
-- freelancer_profiles — additional billing data for profiles.role = 'freelancer'
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.freelancer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  iban TEXT,
  bic TEXT,
  bank_name TEXT,
  street TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'Deutschland',
  tax_number TEXT,
  vat_id TEXT,
  business_name TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'FR' CHECK (char_length(trim(invoice_prefix)) > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS freelancer_profiles_profile_id_idx
  ON public.freelancer_profiles (profile_id);

-- =============================================================================
-- client_freelancer_payouts — payout status for auto-invoicing
-- =============================================================================

ALTER TABLE public.client_freelancer_payouts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'paid'
    CHECK (status IN ('pending', 'paid'));

CREATE INDEX IF NOT EXISTS client_freelancer_payouts_status_idx
  ON public.client_freelancer_payouts (status);

-- =============================================================================
-- freelancer_profile_invoices — auto-generated on client freelancer payouts
-- (Phase 14 freelancer_invoices for legacy vendor records remains unchanged)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.freelancer_profile_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_profile_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  payout_id UUID UNIQUE REFERENCES public.client_freelancer_payouts(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  invoice_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('draft', 'issued', 'paid')),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS freelancer_profile_invoices_profile_idx
  ON public.freelancer_profile_invoices (freelancer_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS freelancer_profile_invoices_client_idx
  ON public.freelancer_profile_invoices (client_id);

-- =============================================================================
-- Invoice number sequence (prefix from freelancer_profiles.invoice_prefix)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.next_freelancer_profile_invoice_number(p_prefix TEXT DEFAULT 'FR')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYY');
  normalized_prefix TEXT := upper(trim(coalesce(nullif(trim(p_prefix), ''), 'FR')));
  seq_key TEXT := 'freelancer_profile_invoice_' || normalized_prefix || '_' || yr;
  next_val BIGINT;
BEGIN
  INSERT INTO public.number_sequences (key, last_value)
  VALUES (seq_key, 0)
  ON CONFLICT (key) DO NOTHING;

  UPDATE public.number_sequences
  SET last_value = last_value + 1
  WHERE key = seq_key
  RETURNING last_value INTO next_val;

  RETURN normalized_prefix || '-' || yr || '-' || lpad(next_val::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_freelancer_profile_invoice_number(TEXT) TO authenticated;

-- =============================================================================
-- updated_at trigger
-- =============================================================================

DROP TRIGGER IF EXISTS freelancer_profiles_set_updated_at ON public.freelancer_profiles;
CREATE TRIGGER freelancer_profiles_set_updated_at
  BEFORE UPDATE ON public.freelancer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_profile_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY freelancer_profiles_select ON public.freelancer_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY freelancer_profiles_insert ON public.freelancer_profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY freelancer_profiles_update ON public.freelancer_profiles
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY freelancer_profile_invoices_select ON public.freelancer_profile_invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY freelancer_profile_invoices_insert ON public.freelancer_profile_invoices
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY freelancer_profile_invoices_update ON public.freelancer_profile_invoices
  FOR UPDATE TO authenticated USING (true);

-- =============================================================================
-- Storage bucket: freelancer-invoice-pdfs
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'freelancer-invoice-pdfs',
  'freelancer-invoice-pdfs',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Management can read freelancer invoice PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'freelancer-invoice-pdfs'
    AND public.is_management()
  );

CREATE POLICY "Management can upload freelancer invoice PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'freelancer-invoice-pdfs'
    AND public.is_management()
  );

CREATE POLICY "Management can update freelancer invoice PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'freelancer-invoice-pdfs'
    AND public.is_management()
  );
