-- Phase 1: Contract management v2 — freelancer/employee fields + documents

-- =============================================================================
-- contracts — extended fields
-- =============================================================================

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contract_category TEXT,
  ADD COLUMN IF NOT EXISTS agency_role TEXT,
  ADD COLUMN IF NOT EXISTS working_hours_per_week NUMERIC(4, 1)
    CHECK (working_hours_per_week IS NULL OR working_hours_per_week > 0),
  ADD COLUMN IF NOT EXISTS vacation_days_per_year INTEGER
    CHECK (vacation_days_per_year IS NULL OR vacation_days_per_year >= 0),
  ADD COLUMN IF NOT EXISTS setup_commission_rate NUMERIC(5, 2)
    CHECK (setup_commission_rate IS NULL OR (setup_commission_rate >= 0 AND setup_commission_rate <= 100)),
  ADD COLUMN IF NOT EXISTS retainer_commission_rate NUMERIC(5, 2)
    CHECK (retainer_commission_rate IS NULL OR (retainer_commission_rate >= 0 AND retainer_commission_rate <= 100)),
  ADD COLUMN IF NOT EXISTS retainer_commission_months INTEGER
    CHECK (retainer_commission_months IS NULL OR retainer_commission_months >= 0),
  ADD COLUMN IF NOT EXISTS freelancer_profile_id UUID
    REFERENCES public.freelancer_profiles(id) ON DELETE SET NULL;

UPDATE public.contracts
SET contract_category = CASE
  WHEN contract_type = 'employee' THEN 'employee'
  ELSE 'freelancer'
END
WHERE contract_category IS NULL;

ALTER TABLE public.contracts
  ALTER COLUMN contract_category SET DEFAULT 'freelancer';

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_contract_category_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_contract_category_check
  CHECK (contract_category IN ('employee', 'freelancer'));

-- Backfill still-null rows before NOT NULL (safety)
UPDATE public.contracts
SET contract_category = 'freelancer'
WHERE contract_category IS NULL;

ALTER TABLE public.contracts
  ALTER COLUMN contract_category SET NOT NULL;

CREATE INDEX IF NOT EXISTS contracts_category_idx
  ON public.contracts (contract_category, created_at DESC);

-- =============================================================================
-- contract_documents
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL CHECK (char_length(trim(file_name)) > 0),
  storage_path TEXT NOT NULL CHECK (char_length(trim(storage_path)) > 0),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_documents_contract_id_idx
  ON public.contract_documents (contract_id, created_at DESC);

ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management can read contract documents"
  ON public.contract_documents FOR SELECT
  TO authenticated
  USING (public.is_management());

CREATE POLICY "Management can insert contract documents"
  ON public.contract_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.is_management());

CREATE POLICY "Management can delete contract documents"
  ON public.contract_documents FOR DELETE
  TO authenticated
  USING (public.is_management());

-- =============================================================================
-- Storage bucket: contract-documents
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-documents',
  'contract-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Management can read contract documents in storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contract-documents'
    AND public.is_management()
  );

CREATE POLICY "Management can upload contract documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contract-documents'
    AND public.is_management()
  );

CREATE POLICY "Management can delete contract documents in storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contract-documents'
    AND public.is_management()
  );

COMMENT ON COLUMN public.contracts.contract_category IS
  'employee = Mitarbeiter-Vertrag, freelancer = Freelancer-Vertrag';
COMMENT ON TABLE public.contract_documents IS
  'Uploaded documents attached to team contracts (NDA, signed PDFs, etc.)';
