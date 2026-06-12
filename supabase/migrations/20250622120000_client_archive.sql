-- Soft-archive clients without affecting finance history or related records.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS clients_is_archived_idx
  ON public.clients (is_archived);

COMMENT ON COLUMN public.clients.is_archived IS
  'When true, client is hidden from the active client list but retained for invoices, contracts, and finance reporting.';
