-- Role pipeline: add "scheduled" (Terminiert) and limit closer pool to handoff leads

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'scheduled', 'qualified', 'proposal', 'won', 'lost'));

CREATE OR REPLACE FUNCTION public.is_open_lead_status(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status = 'scheduled';
$$;

CREATE OR REPLACE FUNCTION public.closer_can_read_lead(p_closer_id UUID, p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    p_closer_id IS NULL
    AND public.is_open_lead_status(p_status)
  )
  OR p_closer_id = auth.uid();
$$;

COMMENT ON FUNCTION public.is_open_lead_status(TEXT) IS
  'Closer pool: unassigned leads with status scheduled (Terminiert).';
