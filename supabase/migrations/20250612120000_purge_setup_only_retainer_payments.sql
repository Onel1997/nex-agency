-- Remove spurious retainer payment rows for setup-only clients (no monthly retainer)

DELETE FROM public.client_retainer_payments p
USING public.clients c
WHERE p.client_id = c.id
  AND COALESCE(c.monthly_revenue_cents, 0) <= 0;
