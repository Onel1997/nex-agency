-- Finance integrity: retainer periods are paid only when a matching paid retainer invoice exists.

WITH orphan_payments AS (
  SELECT p.id, p.client_id
  FROM public.client_retainer_payments p
  WHERE p.status = 'paid'
    AND NOT EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.client_id = p.client_id
        AND i.status = 'paid'
        AND i.billing_period_year = p.period_year
        AND i.billing_period_month = p.period_month
        AND (
          i.invoice_type = 'retainer'
          OR (
            i.invoice_type IS NULL
            AND i.billing_period_year IS NOT NULL
            AND i.billing_period_month IS NOT NULL
          )
        )
    )
),
reset_payments AS (
  UPDATE public.client_retainer_payments p
  SET
    status = 'open',
    paid_at = NULL
  FROM orphan_payments o
  WHERE p.id = o.id
  RETURNING p.client_id
),
affected_clients AS (
  SELECT DISTINCT client_id FROM reset_payments
)
UPDATE public.clients c
SET total_revenue_cents = CASE
  WHEN calc.setup_revenue_cents + calc.retainer_revenue_cents <= 0 THEN NULL
  ELSE calc.setup_revenue_cents + calc.retainer_revenue_cents
END
FROM (
  SELECT
    c2.id,
    CASE
      WHEN COALESCE(
        c2.contract_status,
        CASE WHEN c2.contract_start_date IS NOT NULL THEN 'active' ELSE 'draft' END
      ) = 'active'
        AND c2.contract_start_date IS NOT NULL
      THEN COALESCE(c2.setup_fee_cents, 0)
      ELSE 0
    END AS setup_revenue_cents,
    COALESCE(
      (
        SELECT SUM(COALESCE(i.subtotal_cents, i.amount_cents, 0))
        FROM public.invoices i
        WHERE i.client_id = c2.id
          AND i.status = 'paid'
          AND (
            i.invoice_type = 'retainer'
            OR (
              i.invoice_type IS NULL
              AND i.billing_period_year IS NOT NULL
              AND i.billing_period_month IS NOT NULL
            )
          )
      ),
      0
    ) AS retainer_revenue_cents
  FROM public.clients c2
  WHERE c2.id IN (SELECT client_id FROM affected_clients)
) calc
WHERE c.id = calc.id;
