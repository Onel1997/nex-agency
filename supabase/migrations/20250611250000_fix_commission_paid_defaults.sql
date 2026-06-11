-- Fix auto-backfilled commission payouts from legacy commission_status.
-- Real payouts are tracked via last_commission_payout_at (set by payCommission).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS last_commission_payout_at TIMESTAMPTZ;

UPDATE public.clients
SET
  commission_paid_cents = 0,
  commission_outstanding_cents = commission_total_cents,
  commission_status = CASE
    WHEN commission_total_cents > 0 THEN 'pending'
    ELSE 'none'
  END
WHERE commission_total_cents > 0
  AND commission_paid_cents > 0
  AND last_commission_payout_at IS NULL;
