-- NexAgency Phase 4: Contract Center (employee & freelancer contracts)

-- =============================================================================
-- Contract number sequence per year
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contract_number_counters (
  year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0 CHECK (last_number >= 0)
);

CREATE OR REPLACE FUNCTION public.next_contract_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  next_num INTEGER;
BEGIN
  INSERT INTO public.contract_number_counters (year, last_number)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;

  UPDATE public.contract_number_counters
  SET last_number = last_number + 1
  WHERE year = current_year
  RETURNING last_number INTO next_num;

  RETURN 'CTR-' || current_year::TEXT || '-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_contract_number() TO authenticated;

-- =============================================================================
-- contracts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL CHECK (
    contract_type IN (
      'employee',
      'freelancer',
      'setter',
      'closer',
      'project_manager',
      'customer_success',
      'external_partner'
    )
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'terminated', 'expired')
  ),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  contract_number TEXT NOT NULL UNIQUE,
  start_date DATE,
  end_date DATE,
  monthly_salary_cents BIGINT CHECK (monthly_salary_cents IS NULL OR monthly_salary_cents >= 0),
  commission_rate NUMERIC(5, 2) CHECK (
    commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100)
  ),
  notes TEXT,
  pdf_url TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS contracts_profile_id_idx
  ON public.contracts (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contracts_status_idx
  ON public.contracts (status);
CREATE INDEX IF NOT EXISTS contracts_contract_number_idx
  ON public.contracts (contract_number);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management can read contracts"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can insert contracts"
  ON public.contracts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_management());

CREATE POLICY "Management can update contracts"
  ON public.contracts FOR UPDATE
  TO authenticated
  USING (public.is_management())
  WITH CHECK (public.is_management());

CREATE POLICY "Management can delete contracts"
  ON public.contracts FOR DELETE
  TO authenticated
  USING (public.is_management());

-- =============================================================================
-- Storage bucket: contract-pdfs
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-pdfs',
  'contract-pdfs',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Management can read contract PDFs in storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contract-pdfs'
    AND public.is_management()
  );

CREATE POLICY "Management can upload contract PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contract-pdfs'
    AND public.is_management()
  );

CREATE POLICY "Management can update contract PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'contract-pdfs'
    AND public.is_management()
  )
  WITH CHECK (
    bucket_id = 'contract-pdfs'
    AND public.is_management()
  );

CREATE POLICY "Management can delete contract PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contract-pdfs'
    AND public.is_management()
  );

COMMENT ON TABLE public.contracts IS
  'Team member contracts (employees, freelancers, external partners). Commission rate prepared for Phase 5.';
COMMENT ON COLUMN public.contracts.commission_rate IS
  'Provision in percent — prepared for automatic commission settlement (Phase 5).';
COMMENT ON COLUMN public.contracts.pdf_url IS
  'Storage path within contract-pdfs bucket or API fallback path.';
