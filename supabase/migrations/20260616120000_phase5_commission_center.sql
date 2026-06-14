-- NexAgency Phase 5: Commission Center (Setter & Closer provisions)

-- =============================================================================
-- commission_entries — ledger triggered by paid setup/project invoices
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.commission_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  setter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  closer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_value_cents BIGINT NOT NULL CHECK (project_value_cents >= 0),
  setter_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (setter_rate >= 0 AND setter_rate <= 100),
  closer_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (closer_rate >= 0 AND closer_rate <= 100),
  setter_commission_cents BIGINT NOT NULL DEFAULT 0 CHECK (setter_commission_cents >= 0),
  closer_commission_cents BIGINT NOT NULL DEFAULT 0 CHECK (closer_commission_cents >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'paid', 'cancelled')
  ),
  triggered_by_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  CONSTRAINT commission_entries_triggered_invoice_unique UNIQUE (triggered_by_invoice_id),
  CONSTRAINT commission_entries_has_attribution CHECK (
    setter_id IS NOT NULL OR closer_id IS NOT NULL
  ),
  CONSTRAINT commission_entries_has_commission CHECK (
    setter_commission_cents > 0 OR closer_commission_cents > 0
  )
);

CREATE INDEX IF NOT EXISTS commission_entries_client_id_idx
  ON public.commission_entries (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commission_entries_setter_id_idx
  ON public.commission_entries (setter_id, status);
CREATE INDEX IF NOT EXISTS commission_entries_closer_id_idx
  ON public.commission_entries (closer_id, status);
CREATE INDEX IF NOT EXISTS commission_entries_status_idx
  ON public.commission_entries (status);

ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management can read all commission entries"
  ON public.commission_entries FOR SELECT
  TO authenticated
  USING (public.is_management());

CREATE POLICY "Field staff can read own commission entries"
  ON public.commission_entries FOR SELECT
  TO authenticated
  USING (
    public.is_field_staff()
    AND (
      setter_id = auth.uid()
      OR closer_id = auth.uid()
    )
  );

CREATE POLICY "Management can insert commission entries"
  ON public.commission_entries FOR INSERT
  TO authenticated
  WITH CHECK (public.is_management());

CREATE POLICY "Management can update commission entries"
  ON public.commission_entries FOR UPDATE
  TO authenticated
  USING (public.is_management())
  WITH CHECK (public.is_management());

CREATE POLICY "Management can delete commission entries"
  ON public.commission_entries FOR DELETE
  TO authenticated
  USING (public.is_management());

-- =============================================================================
-- commission_payouts — per-member payout records (Setter/Closer)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_entry_id UUID NOT NULL REFERENCES public.commission_entries(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commission_payouts_entry_id_idx
  ON public.commission_payouts (commission_entry_id);
CREATE INDEX IF NOT EXISTS commission_payouts_profile_id_idx
  ON public.commission_payouts (profile_id, paid_at DESC);

ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management can read all commission payouts"
  ON public.commission_payouts FOR SELECT
  TO authenticated
  USING (public.is_management());

CREATE POLICY "Members can read own commission payouts"
  ON public.commission_payouts FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Management can insert commission payouts"
  ON public.commission_payouts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_management()
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

COMMENT ON TABLE public.commission_entries IS
  'Setter/Closer commission ledger — created when setup or project invoices are paid.';
COMMENT ON TABLE public.commission_payouts IS
  'Individual commission payouts to setters/closers (Phase 5 Commission Center).';
COMMENT ON COLUMN public.commission_entries.triggered_by_invoice_id IS
  'Paid invoice that triggered this entry. UNIQUE prevents duplicate accruals.';
