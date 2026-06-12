-- Explicit contract lifecycle status (Vertragsstatus)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contract_status TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_contract_status_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_contract_status_check
  CHECK (contract_status IN ('draft', 'active', 'paused', 'terminated'));

UPDATE public.clients
SET contract_status = 'active'
WHERE contract_start_date IS NOT NULL
  AND (setup_fee_cents > 0 OR monthly_revenue_cents > 0 OR monthly_retainer_cents > 0);

COMMENT ON COLUMN public.clients.contract_status IS
  'Contract lifecycle: draft | active | paused | terminated';
