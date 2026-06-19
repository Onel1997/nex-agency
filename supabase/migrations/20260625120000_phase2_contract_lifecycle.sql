-- Phase 2: Contract lifecycle — extended status workflow, timestamps, digital signature prep

-- =============================================================================
-- contracts — lifecycle timestamps
-- =============================================================================

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by_agency BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signed_by_partner BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agency_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS partner_signed_at TIMESTAMPTZ;

-- =============================================================================
-- contracts — extended status check
-- =============================================================================

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (
    status IN (
      'draft',
      'sent',
      'signed',
      'active',
      'terminated',
      'expired',
      'archived'
    )
  );

-- Backfill lifecycle timestamps for existing rows (idempotent, preserves data)
UPDATE public.contracts
SET activated_at = COALESCE(activated_at, signed_at, updated_at)
WHERE status = 'active'
  AND activated_at IS NULL;

UPDATE public.contracts
SET signed_at = COALESCE(signed_at, activated_at, updated_at)
WHERE status = 'active'
  AND signed_at IS NULL;

UPDATE public.contracts
SET signed_by_agency = true,
    signed_by_partner = true,
    agency_signed_at = COALESCE(agency_signed_at, signed_at),
    partner_signed_at = COALESCE(partner_signed_at, signed_at)
WHERE status = 'active'
  AND signed_at IS NOT NULL
  AND (signed_by_agency = false OR signed_by_partner = false);
