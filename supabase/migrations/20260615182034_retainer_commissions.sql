-- Retainer commission system: entry_type on commission_entries + profile retainer settings

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS retainer_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10
    CHECK (retainer_commission_rate >= 0 AND retainer_commission_rate <= 100),
  ADD COLUMN IF NOT EXISTS retainer_commission_months INTEGER NOT NULL DEFAULT 3
    CHECK (retainer_commission_months >= 0 AND retainer_commission_months <= 120);

ALTER TABLE public.commission_entries
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'setup'
    CHECK (entry_type IN ('setup', 'retainer'));

UPDATE public.commission_entries
SET entry_type = 'setup'
WHERE entry_type IS NULL;

CREATE INDEX IF NOT EXISTS commission_entries_client_entry_type_idx
  ON public.commission_entries (client_id, entry_type, created_at DESC);

COMMENT ON COLUMN public.profiles.retainer_commission_rate IS
  'Retainer commission rate (%) for this team member when acting as setter or closer.';
COMMENT ON COLUMN public.profiles.retainer_commission_months IS
  'Max paid retainer months that generate commission per client (team default: 3).';
COMMENT ON COLUMN public.commission_entries.entry_type IS
  'setup = one-time project commission; retainer = recurring retainer invoice commission.';
