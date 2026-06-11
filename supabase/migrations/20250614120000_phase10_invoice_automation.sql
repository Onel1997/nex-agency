-- NexAgency CRM Phase 10: Invoice automation (customer numbers, VAT, line items)

-- =============================================================================
-- Number sequences (atomic counters)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.number_sequences (
  key TEXT PRIMARY KEY,
  last_value BIGINT NOT NULL DEFAULT 0 CHECK (last_value >= 0)
);

INSERT INTO public.number_sequences (key, last_value)
VALUES ('customer_number', 0)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- Customer numbers on clients
-- =============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS customer_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS clients_customer_number_unique_idx
  ON public.clients (customer_number)
  WHERE customer_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.next_customer_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val BIGINT;
BEGIN
  UPDATE public.number_sequences
  SET last_value = last_value + 1
  WHERE key = 'customer_number'
  RETURNING last_value INTO next_val;

  IF next_val IS NULL THEN
    INSERT INTO public.number_sequences (key, last_value)
    VALUES ('customer_number', 1)
    ON CONFLICT (key) DO UPDATE
      SET last_value = public.number_sequences.last_value + 1
    RETURNING last_value INTO next_val;
  END IF;

  RETURN 'NEX-' || lpad(next_val::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_customer_number() TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_customer_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_number IS NULL OR btrim(NEW.customer_number) = '' THEN
    NEW.customer_number := public.next_customer_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_customer_number_on_insert ON public.clients;
CREATE TRIGGER assign_customer_number_on_insert
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_customer_number();

CREATE OR REPLACE FUNCTION public.prevent_customer_number_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.customer_number IS NOT NULL
    AND NEW.customer_number IS DISTINCT FROM OLD.customer_number
  THEN
    RAISE EXCEPTION 'customer_number cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_customer_number_update_on_clients ON public.clients;
CREATE TRIGGER prevent_customer_number_update_on_clients
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_customer_number_update();

-- Backfill existing clients in creation order
DO $$
DECLARE
  client_row RECORD;
  assigned_number TEXT;
BEGIN
  FOR client_row IN
    SELECT id
    FROM public.clients
    WHERE customer_number IS NULL
    ORDER BY created_at ASC, id ASC
  LOOP
    assigned_number := public.next_customer_number();
    UPDATE public.clients
    SET customer_number = assigned_number
    WHERE id = client_row.id;
  END LOOP;
END;
$$;

ALTER TABLE public.clients
  ALTER COLUMN customer_number SET NOT NULL;

-- =============================================================================
-- Invoice totals & VAT
-- =============================================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS subtotal_cents BIGINT
    CHECK (subtotal_cents IS NULL OR subtotal_cents >= 0),
  ADD COLUMN IF NOT EXISTS tax_amount_cents BIGINT
    CHECK (tax_amount_cents IS NULL OR tax_amount_cents >= 0),
  ADD COLUMN IF NOT EXISTS total_amount_cents BIGINT
    CHECK (total_amount_cents IS NULL OR total_amount_cents >= 0),
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 19.00
    CHECK (vat_rate >= 0 AND vat_rate <= 100);

-- Migrate legacy amount_cents → net + tax + gross
UPDATE public.invoices
SET
  subtotal_cents = amount_cents,
  tax_amount_cents = ROUND(amount_cents * 0.19),
  total_amount_cents = amount_cents + ROUND(amount_cents * 0.19),
  vat_rate = 19.00
WHERE subtotal_cents IS NULL
  AND amount_cents IS NOT NULL;

-- Normalize invoice numbers to RE-YYYY-000001 format
DO $$
DECLARE
  inv RECORD;
  yr TEXT;
  seq INT := 0;
  prev_year TEXT := NULL;
BEGIN
  FOR inv IN
    SELECT id, invoice_number, created_at
    FROM public.invoices
    ORDER BY created_at ASC, id ASC
  LOOP
    yr := to_char(inv.created_at AT TIME ZONE 'UTC', 'YYYY');
    IF prev_year IS DISTINCT FROM yr THEN
      seq := 0;
      prev_year := yr;
    END IF;
    seq := seq + 1;

    IF inv.invoice_number !~ '^RE-[0-9]{4}-[0-9]{6}$' THEN
      UPDATE public.invoices
      SET invoice_number = 'RE-' || yr || '-' || lpad(seq::text, 6, '0')
      WHERE id = inv.id;
    END IF;
  END LOOP;
END;
$$;

-- Seed per-year invoice counters from existing numbers
INSERT INTO public.number_sequences (key, last_value)
SELECT
  'invoice_' || yr,
  MAX(seq)::bigint
FROM (
  SELECT
    substring(invoice_number FROM '^RE-([0-9]{4})-') AS yr,
    substring(invoice_number FROM '-([0-9]{6})$')::bigint AS seq
  FROM public.invoices
  WHERE invoice_number ~ '^RE-[0-9]{4}-[0-9]{6}$'
) numbered
WHERE yr IS NOT NULL
GROUP BY yr
ON CONFLICT (key) DO UPDATE
  SET last_value = GREATEST(public.number_sequences.last_value, EXCLUDED.last_value);

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYY');
  seq_key TEXT := 'invoice_' || yr;
  next_val BIGINT;
BEGIN
  INSERT INTO public.number_sequences (key, last_value)
  VALUES (seq_key, 0)
  ON CONFLICT (key) DO NOTHING;

  UPDATE public.number_sequences
  SET last_value = last_value + 1
  WHERE key = seq_key
  RETURNING last_value INTO next_val;

  RETURN 'RE-' || yr || '-' || lpad(next_val::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_invoice_number_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.invoice_number IS NOT NULL
    AND NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
  THEN
    RAISE EXCEPTION 'invoice_number cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_invoice_number_update_on_invoices ON public.invoices;
CREATE TRIGGER prevent_invoice_number_update_on_invoices
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_invoice_number_update();

-- Keep amount_cents in sync with gross total for legacy consumers
CREATE OR REPLACE FUNCTION public.sync_invoice_amount_cents()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.total_amount_cents IS NOT NULL THEN
    NEW.amount_cents := NEW.total_amount_cents;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_invoice_amount_cents_on_invoices ON public.invoices;
CREATE TRIGGER sync_invoice_amount_cents_on_invoices
  BEFORE INSERT OR UPDATE OF total_amount_cents ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_amount_cents();

-- =============================================================================
-- Invoice line items
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL CHECK (char_length(trim(description)) > 0),
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents BIGINT NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents BIGINT NOT NULL CHECK (line_total_cents >= 0),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx
  ON public.invoice_items (invoice_id, sort_order);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read invoice items for accessible clients"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND public.user_can_access_client(i.client_id)
    )
  );

CREATE POLICY "Users can insert invoice items for accessible clients"
  ON public.invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND public.user_can_access_client(i.client_id)
    )
  );

CREATE POLICY "Users can update invoice items for accessible clients"
  ON public.invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND public.user_can_access_client(i.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND public.user_can_access_client(i.client_id)
    )
  );

CREATE POLICY "Users can delete invoice items for accessible clients"
  ON public.invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND public.user_can_access_client(i.client_id)
    )
  );

-- Backfill one line item per legacy invoice
INSERT INTO public.invoice_items (
  invoice_id,
  description,
  quantity,
  unit_price_cents,
  line_total_cents,
  sort_order
)
SELECT
  i.id,
  'Leistung gemäß Vertrag',
  1,
  COALESCE(i.subtotal_cents, i.amount_cents, 0),
  COALESCE(i.subtotal_cents, i.amount_cents, 0),
  0
FROM public.invoices i
WHERE NOT EXISTS (
  SELECT 1 FROM public.invoice_items ii WHERE ii.invoice_id = i.id
);
