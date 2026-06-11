-- Phase 7: Commission liability tracking per client

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS commission_total_cents BIGINT NOT NULL DEFAULT 0
    CHECK (commission_total_cents >= 0),
  ADD COLUMN IF NOT EXISTS commission_paid_cents BIGINT NOT NULL DEFAULT 0
    CHECK (commission_paid_cents >= 0),
  ADD COLUMN IF NOT EXISTS commission_outstanding_cents BIGINT NOT NULL DEFAULT 0
    CHECK (commission_outstanding_cents >= 0);

-- Backfill total from setup fee × responsible member commission rate
UPDATE public.clients c
SET commission_total_cents = GREATEST(
  0,
  ROUND(
    COALESCE(c.setup_fee_cents, 0)::NUMERIC
    * COALESCE(p.commission_rate, 0)::NUMERIC
    / 100.0
  )::BIGINT
)
FROM public.profiles p
WHERE p.id = c.responsible_member_id
  AND COALESCE(c.setup_fee_cents, 0) > 0
  AND COALESCE(p.commission_rate, 0) > 0;

-- New commissions start unpaid; payouts only via payCommission()
UPDATE public.clients
SET
  commission_paid_cents = 0,
  commission_outstanding_cents = commission_total_cents,
  commission_status = CASE
    WHEN commission_total_cents > 0 THEN 'pending'
    ELSE commission_status
  END
WHERE commission_total_cents > 0;

CREATE INDEX IF NOT EXISTS clients_commission_outstanding_idx
  ON public.clients (commission_outstanding_cents)
  WHERE commission_outstanding_cents > 0;
