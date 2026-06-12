-- Phase 13: Automatic recurring retainer contract invoices

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  ADD COLUMN IF NOT EXISTS next_invoice_date DATE,
  ADD COLUMN IF NOT EXISTS last_invoice_date DATE,
  ADD COLUMN IF NOT EXISTS auto_invoice_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT
    CHECK (invoice_type IS NULL OR invoice_type IN ('setup', 'retainer', 'manual')),
  ADD COLUMN IF NOT EXISTS billing_period_year INT
    CHECK (billing_period_year IS NULL OR billing_period_year >= 2000),
  ADD COLUMN IF NOT EXISTS billing_period_month INT
    CHECK (billing_period_month IS NULL OR (billing_period_month >= 1 AND billing_period_month <= 12));

CREATE INDEX IF NOT EXISTS clients_recurring_billing_idx
  ON public.clients (auto_invoice_enabled, next_invoice_date)
  WHERE auto_invoice_enabled = true;

CREATE INDEX IF NOT EXISTS invoices_retainer_period_idx
  ON public.invoices (contract_id, billing_period_year, billing_period_month)
  WHERE invoice_type = 'retainer' AND contract_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_retainer_period_unique_idx
  ON public.invoices (contract_id, billing_period_year, billing_period_month)
  WHERE invoice_type = 'retainer'
    AND contract_id IS NOT NULL
    AND status <> 'cancelled';

-- Backfill active retainer contracts (values preserved; only new defaults applied)
UPDATE public.clients
SET
  billing_cycle = 'monthly',
  auto_invoice_enabled = true,
  next_invoice_date = COALESCE(next_invoice_date, CURRENT_DATE)
WHERE contract_start_date IS NOT NULL
  AND COALESCE(monthly_retainer_cents, monthly_revenue_cents, 0) > 0;
