-- NexAgency Phase 11: Invoice due dates, overdue automation, invoice_sent activity

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS due_date DATE;

UPDATE public.invoices
SET due_date = (created_at AT TIME ZONE 'UTC')::date + 14
WHERE due_date IS NULL;

ALTER TABLE public.invoices
  ALTER COLUMN due_date SET DEFAULT ((CURRENT_DATE + 14));

CREATE OR REPLACE FUNCTION public.set_invoice_due_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.due_date IS NULL THEN
    NEW.due_date := (COALESCE(NEW.created_at, now()) AT TIME ZONE 'UTC')::date + 14;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invoice_due_date_on_insert ON public.invoices;
CREATE TRIGGER set_invoice_due_date_on_insert
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_invoice_due_date();

CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.invoices
  SET
    status = 'overdue',
    updated_at = now()
  WHERE status NOT IN ('paid', 'cancelled')
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_overdue_invoices() TO authenticated;

ALTER TABLE public.client_activities
  DROP CONSTRAINT IF EXISTS client_activities_activity_type_check;

ALTER TABLE public.client_activities
  ADD CONSTRAINT client_activities_activity_type_check
  CHECK (
    activity_type IN (
      'lead_created',
      'lead_won',
      'client_created',
      'contract_changed',
      'commission_paid',
      'file_uploaded',
      'invoice_created',
      'invoice_sent',
      'invoice_paid'
    )
  );
