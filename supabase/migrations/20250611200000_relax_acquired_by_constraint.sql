-- NexAgency CRM: acquired_by — Teammitglied-Namen statt fester Enum-Werte
--
-- Hintergrund:
-- leads.acquired_by hatte ursprünglich CHECK (IN ('Silane', 'Bruder', 'Frau')).
-- Das UI speichert jetzt Anzeigenamen aktiver Teammitglieder (z. B. Valentina, Onel).
-- clients.acquired_by wurde in Phase 5A mit demselben CHECK angelegt.

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_acquired_by_check;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_acquired_by_check;
