-- Backfill retainer commission entries for paid retainer invoices
-- that were marked paid before createRetainerCommissionEntryFromPaidInvoice was deployed.

WITH missing AS (
  SELECT
    i.id AS invoice_id,
    i.client_id,
    COALESCE(i.subtotal_cents, i.amount_cents, 0) AS project_value_cents,
    c.setter_id,
    c.closer_id
  FROM public.invoices i
  JOIN public.clients c ON c.id = i.client_id
  LEFT JOIN public.commission_entries ce ON ce.triggered_by_invoice_id = i.id
  WHERE i.invoice_type = 'retainer'
    AND i.status = 'paid'
    AND ce.id IS NULL
    AND (c.setter_id IS NOT NULL OR c.closer_id IS NOT NULL)
),
existing_counts AS (
  SELECT client_id, COUNT(*)::int AS cnt
  FROM public.commission_entries
  WHERE entry_type = 'retainer'
    AND status <> 'cancelled'
  GROUP BY client_id
),
eligible AS (
  SELECT
    m.*,
    sp.retainer_commission_rate AS setter_rate,
    cp.retainer_commission_rate AS closer_rate,
    GREATEST(
      COALESCE(sp.retainer_commission_months, 3),
      COALESCE(cp.retainer_commission_months, 3)
    ) AS allowed_months,
    COALESCE(ec.cnt, 0) AS existing_retainer_count
  FROM missing m
  LEFT JOIN public.profiles sp ON sp.id = m.setter_id
  LEFT JOIN public.profiles cp ON cp.id = m.closer_id
  LEFT JOIN existing_counts ec ON ec.client_id = m.client_id
  WHERE COALESCE(ec.cnt, 0) < GREATEST(
    COALESCE(sp.retainer_commission_months, 3),
    COALESCE(cp.retainer_commission_months, 3)
  )
)
INSERT INTO public.commission_entries (
  client_id,
  setter_id,
  closer_id,
  project_value_cents,
  setter_rate,
  closer_rate,
  setter_commission_cents,
  closer_commission_cents,
  status,
  entry_type,
  triggered_by_invoice_id
)
SELECT
  e.client_id,
  e.setter_id,
  e.closer_id,
  e.project_value_cents,
  COALESCE(e.setter_rate, 10),
  COALESCE(e.closer_rate, 10),
  CASE
    WHEN e.setter_id IS NOT NULL AND COALESCE(e.setter_rate, 10) > 0
      THEN ROUND(e.project_value_cents * COALESCE(e.setter_rate, 10) / 100.0)::bigint
    ELSE 0
  END,
  CASE
    WHEN e.closer_id IS NOT NULL AND COALESCE(e.closer_rate, 10) > 0
      THEN ROUND(e.project_value_cents * COALESCE(e.closer_rate, 10) / 100.0)::bigint
    ELSE 0
  END,
  'pending',
  'retainer',
  e.invoice_id
FROM eligible e
WHERE (
  CASE
    WHEN e.setter_id IS NOT NULL AND COALESCE(e.setter_rate, 10) > 0
      THEN ROUND(e.project_value_cents * COALESCE(e.setter_rate, 10) / 100.0)::bigint
    ELSE 0
  END
  +
  CASE
    WHEN e.closer_id IS NOT NULL AND COALESCE(e.closer_rate, 10) > 0
      THEN ROUND(e.project_value_cents * COALESCE(e.closer_rate, 10) / 100.0)::bigint
    ELSE 0
  END
) > 0
ON CONFLICT (triggered_by_invoice_id) DO NOTHING;
