-- Safe, idempotent backfill: freelancer_profile_invoices from paid client_freelancer_payouts
-- Skips payouts that already have an invoice (payout_id UNIQUE on freelancer_profile_invoices).

-- Ensure billing profiles exist for freelancers with payout history
INSERT INTO public.freelancer_profiles (profile_id)
SELECT DISTINCT p.freelancer_id
FROM public.client_freelancer_payouts p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.freelancer_profiles fp
  WHERE fp.profile_id = p.freelancer_id
);

DO $$
DECLARE
  payout_row RECORD;
  billing_profile_id UUID;
  invoice_prefix TEXT;
  invoice_number TEXT;
BEGIN
  FOR payout_row IN
    SELECT
      p.id AS payout_id,
      p.client_id,
      p.freelancer_id,
      p.amount_cents,
      p.paid_at
    FROM public.client_freelancer_payouts p
    LEFT JOIN public.freelancer_profile_invoices i ON i.payout_id = p.id
    WHERE i.id IS NULL
      AND COALESCE(p.status, 'paid') = 'paid'
    ORDER BY p.paid_at ASC
  LOOP
    SELECT fp.id, fp.invoice_prefix
    INTO billing_profile_id, invoice_prefix
    FROM public.freelancer_profiles fp
    WHERE fp.profile_id = payout_row.freelancer_id;

    IF billing_profile_id IS NULL THEN
      RAISE NOTICE 'Skipping payout % — no freelancer_profiles row for profile %',
        payout_row.payout_id, payout_row.freelancer_id;
      CONTINUE;
    END IF;

    invoice_number := public.next_freelancer_profile_invoice_number(invoice_prefix);

    INSERT INTO public.freelancer_profile_invoices (
      freelancer_profile_id,
      client_id,
      payout_id,
      invoice_number,
      amount_cents,
      invoice_date,
      status
    )
    VALUES (
      billing_profile_id,
      payout_row.client_id,
      payout_row.payout_id,
      invoice_number,
      payout_row.amount_cents,
      (payout_row.paid_at AT TIME ZONE 'UTC')::date,
      'paid'
    )
    ON CONFLICT (payout_id) DO NOTHING;
  END LOOP;
END;
$$;
