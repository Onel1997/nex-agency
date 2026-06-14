-- Fix closer pool handoff: only unassigned "scheduled" (Terminiert) leads belong in the pool

CREATE OR REPLACE FUNCTION public.is_open_lead_status(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status = 'scheduled';
$$;

COMMENT ON FUNCTION public.is_open_lead_status(TEXT) IS
  'Closer pool: unassigned leads with status scheduled (Terminiert).';
