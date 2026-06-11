-- Phase 12: Link invoices to client contracts for scoped Vertragsrechnungen

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoices_contract_id_idx
  ON public.invoices (contract_id)
  WHERE contract_id IS NOT NULL;

COMMENT ON COLUMN public.invoices.contract_id IS
  'Client contract this invoice was created from (same as client_id for single-contract clients).';
