-- Team master data: extend freelancer_profiles + employee fields on profiles

-- =============================================================================
-- freelancer_profiles — contact & address details
-- =============================================================================

ALTER TABLE public.freelancer_profiles
  ADD COLUMN IF NOT EXISTS house_number TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.freelancer_profiles.house_number IS
  'Hausnummer (Adresse)';
COMMENT ON COLUMN public.freelancer_profiles.phone IS
  'Telefonnummer';

-- =============================================================================
-- profiles — employee master data (bank, tax, HR, address)
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS house_number TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Deutschland',
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS bic TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS social_security_number TEXT,
  ADD COLUMN IF NOT EXISTS health_insurance TEXT,
  ADD COLUMN IF NOT EXISTS employee_number TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN public.profiles.tax_id IS
  'Steuer-ID (Mitarbeiter)';
COMMENT ON COLUMN public.profiles.social_security_number IS
  'Sozialversicherungsnummer';
COMMENT ON COLUMN public.profiles.health_insurance IS
  'Krankenkasse';
COMMENT ON COLUMN public.profiles.employee_number IS
  'Personalnummer';
COMMENT ON COLUMN public.profiles.birth_date IS
  'Geburtsdatum';
