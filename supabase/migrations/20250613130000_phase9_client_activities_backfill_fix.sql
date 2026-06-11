-- Phase 9 follow-up: safe, idempotent client_activities backfill
--
-- Fixes FK violation on client_activities_client_id_fkey caused by
-- activity_logs rows whose entity_id no longer exists in public.clients.

-- =============================================================================
-- 1) lead_created — one row per existing client (via lead)
-- =============================================================================

INSERT INTO public.client_activities (client_id, actor_id, activity_type, description, created_at)
SELECT
  c.id,
  l.created_by,
  'lead_created',
  'Lead „' || l.company_name || '" erstellt',
  l.created_at
FROM public.clients c
INNER JOIN public.leads l ON l.id = c.lead_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.client_activities ca
  WHERE ca.client_id = c.id
    AND ca.activity_type = 'lead_created'
);

-- =============================================================================
-- 2) lead_won — for clients whose lead was won or converted
-- =============================================================================

INSERT INTO public.client_activities (client_id, actor_id, activity_type, description, created_at)
SELECT
  c.id,
  l.owner_id,
  'lead_won',
  'Lead „' || l.company_name || '" gewonnen',
  COALESCE(
    (
      SELECT al.created_at
      FROM public.activity_logs al
      WHERE al.entity_type = 'lead'
        AND al.entity_id = l.id
        AND al.action = 'lead_status_changed'
        AND al.metadata->>'to' = 'won'
      ORDER BY al.created_at ASC
      LIMIT 1
    ),
    c.created_at
  )
FROM public.clients c
INNER JOIN public.leads l ON l.id = c.lead_id
WHERE (l.status = 'won' OR l.converted_to_client = true)
  AND NOT EXISTS (
    SELECT 1
    FROM public.client_activities ca
    WHERE ca.client_id = c.id
      AND ca.activity_type = 'lead_won'
  );

-- =============================================================================
-- 3) client_created — one row per existing client
-- =============================================================================

INSERT INTO public.client_activities (client_id, actor_id, activity_type, description, created_at)
SELECT
  c.id,
  c.responsible_member_id,
  'client_created',
  'Kunde „' || c.company_name || '" erstellt',
  c.created_at
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.client_activities ca
  WHERE ca.client_id = c.id
    AND ca.activity_type = 'client_created'
);

-- =============================================================================
-- 4) client_created from lead_converted activity_logs (orphan-safe)
-- =============================================================================

INSERT INTO public.client_activities (client_id, actor_id, activity_type, description, created_at)
SELECT
  c.id,
  al.actor_id,
  'client_created',
  al.message,
  al.created_at
FROM public.activity_logs al
INNER JOIN public.clients c ON c.id = al.entity_id
WHERE al.entity_type = 'client'
  AND al.action = 'lead_converted'
  AND NOT EXISTS (
    SELECT 1
    FROM public.client_activities ca
    WHERE ca.client_id = c.id
      AND ca.activity_type = 'client_created'
  );
