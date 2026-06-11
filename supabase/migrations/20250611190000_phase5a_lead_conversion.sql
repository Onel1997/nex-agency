-- NexAgency CRM Phase 5A: Pipeline statuses + manual lead → client conversion

-- Remove automatic client sync on status change (conversion is now explicit)
DROP TRIGGER IF EXISTS sync_client_on_lead_status ON public.leads;
DROP FUNCTION IF EXISTS public.sync_client_from_lead();

-- Migrate legacy lead statuses before updating the check constraint
UPDATE public.leads SET status = 'qualified' WHERE status = 'appointment';
UPDATE public.leads SET status = 'won' WHERE status = 'client';

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS converted_to_client BOOLEAN NOT NULL DEFAULT false;

UPDATE public.leads l
SET converted_to_client = true
WHERE EXISTS (SELECT 1 FROM public.clients c WHERE c.lead_id = l.id);

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost'));

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS acquired_by TEXT
    CHECK (acquired_by IS NULL OR acquired_by IN ('Silane', 'Bruder', 'Frau')),
  ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE public.clients c
SET
  acquired_by = COALESCE(c.acquired_by, l.acquired_by),
  notes = COALESCE(c.notes, l.notes)
FROM public.leads l
WHERE c.lead_id = l.id;
