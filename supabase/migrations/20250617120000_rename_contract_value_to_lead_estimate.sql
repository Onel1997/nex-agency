-- Rename contract_value_cents → lead_estimated_value_cents (values unchanged)

ALTER TABLE public.clients
  RENAME COLUMN contract_value_cents TO lead_estimated_value_cents;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_contract_value_cents_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_lead_estimated_value_cents_check
  CHECK (lead_estimated_value_cents IS NULL OR lead_estimated_value_cents >= 0);

CREATE OR REPLACE FUNCTION public.sync_client_from_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'client'
    AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'client')
  THEN
    INSERT INTO public.clients (
      lead_id,
      company_name,
      contact_name,
      email,
      phone,
      website,
      responsible_member_id,
      lead_estimated_value_cents,
      currency
    )
    VALUES (
      NEW.id,
      NEW.company_name,
      NEW.contact_name,
      NEW.email,
      NEW.phone,
      NEW.website,
      NEW.owner_id,
      NEW.estimated_value_cents,
      COALESCE(NEW.currency, 'EUR')
    )
    ON CONFLICT (lead_id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      contact_name = EXCLUDED.contact_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      website = EXCLUDED.website,
      responsible_member_id = EXCLUDED.responsible_member_id,
      lead_estimated_value_cents = COALESCE(
        clients.lead_estimated_value_cents,
        EXCLUDED.lead_estimated_value_cents
      ),
      currency = EXCLUDED.currency;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.status = 'client'
    AND OLD.status = 'client'
  THEN
    UPDATE public.clients
    SET
      company_name = NEW.company_name,
      contact_name = NEW.contact_name,
      email = NEW.email,
      phone = NEW.phone,
      website = NEW.website,
      responsible_member_id = NEW.owner_id
    WHERE lead_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
