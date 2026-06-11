-- NexAgency CRM Phase 4B: Revenue tracking & commission system
--
-- Extends clients and profiles for finance dashboards.
-- Does not modify lead, appointment, or client sync workflows.

-- =============================================================================
-- SECTION 1: Profile commission rates
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00
  CHECK (commission_rate >= 0 AND commission_rate <= 100);

-- =============================================================================
-- SECTION 2: Client revenue & commission status
-- =============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS monthly_revenue_cents BIGINT
    CHECK (monthly_revenue_cents IS NULL OR monthly_revenue_cents >= 0),
  ADD COLUMN IF NOT EXISTS setup_fee_cents BIGINT
    CHECK (setup_fee_cents IS NULL OR setup_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS total_revenue_cents BIGINT
    CHECK (total_revenue_cents IS NULL OR total_revenue_cents >= 0),
  ADD COLUMN IF NOT EXISTS commission_status TEXT NOT NULL DEFAULT 'none'
    CHECK (commission_status IN ('none', 'pending', 'outstanding', 'paid'));

-- Backfill from Phase 4A revenue fields
UPDATE public.clients
SET
  monthly_revenue_cents = COALESCE(monthly_revenue_cents, monthly_retainer_cents),
  setup_fee_cents = COALESCE(setup_fee_cents, one_time_project_value_cents),
  total_revenue_cents = COALESCE(
    total_revenue_cents,
    COALESCE(setup_fee_cents, one_time_project_value_cents, 0)
      + COALESCE(
        NULLIF(contract_value_cents, 0),
        COALESCE(monthly_retainer_cents, monthly_revenue_cents, 0) * 12,
        0
      )
  )
WHERE monthly_revenue_cents IS NULL
   OR setup_fee_cents IS NULL
   OR total_revenue_cents IS NULL;

UPDATE public.clients
SET commission_status = 'pending'
WHERE commission_status = 'none'
  AND COALESCE(total_revenue_cents, 0) > 0;

CREATE INDEX IF NOT EXISTS clients_commission_status_idx
  ON public.clients (commission_status);

CREATE INDEX IF NOT EXISTS clients_total_revenue_cents_idx
  ON public.clients (total_revenue_cents);

CREATE INDEX IF NOT EXISTS clients_monthly_revenue_cents_idx
  ON public.clients (monthly_revenue_cents);

-- =============================================================================
-- SECTION 3: Finance aggregation helpers (management RLS via existing policies)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_commission_cents(
  revenue_cents BIGINT,
  rate NUMERIC
)
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN revenue_cents IS NULL OR revenue_cents <= 0 OR rate IS NULL OR rate <= 0 THEN 0
    ELSE ROUND(revenue_cents * rate / 100.0)::BIGINT
  END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_commission_cents(BIGINT, NUMERIC) TO authenticated;
