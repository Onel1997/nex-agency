-- Backfill setter attribution from lead creator / owner when missing.

UPDATE public.leads l
SET setter_id = l.created_by
FROM public.profiles p
WHERE l.setter_id IS NULL
  AND l.created_by IS NOT NULL
  AND l.created_by = p.id
  AND p.agency_role = 'setter';

UPDATE public.leads l
SET setter_id = l.owner_id
FROM public.profiles p
WHERE l.setter_id IS NULL
  AND l.owner_id IS NOT NULL
  AND l.owner_id = p.id
  AND p.agency_role = 'setter';

UPDATE public.clients c
SET setter_id = l.setter_id
FROM public.leads l
WHERE c.lead_id = l.id
  AND c.setter_id IS NULL
  AND l.setter_id IS NOT NULL;

UPDATE public.clients c
SET setter_id = l.created_by
FROM public.leads l
JOIN public.profiles p ON p.id = l.created_by
WHERE c.lead_id = l.id
  AND c.setter_id IS NULL
  AND l.created_by IS NOT NULL
  AND p.agency_role = 'setter';

COMMENT ON COLUMN public.leads.setter_id IS
  'Setter credited for this lead. Preserved through closer claim and client conversion.';
