-- Add missing "scheduled" (Terminiert) to leads.status check constraint.
-- Remote DB still had phase5a constraint without scheduled.

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (
    status IN (
      'new',        -- Neu
      'contacted',  -- Kontaktiert
      'scheduled',  -- Terminiert
      'qualified',  -- Qualifiziert
      'proposal',   -- Angebot
      'won',        -- Gewonnen
      'lost'        -- Verloren
    )
  );

CREATE OR REPLACE FUNCTION public.is_open_lead_status(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status = 'scheduled';
$$;

COMMENT ON CONSTRAINT leads_status_check ON public.leads IS
  'Setter: new, contacted, scheduled, lost. Closer: scheduled, qualified, proposal, won, lost.';
