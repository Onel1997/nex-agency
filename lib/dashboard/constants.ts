export const LEAD_STATUSES = [
  "new",
  "contacted",
  "appointment",
  "proposal",
  "client",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Neu",
  contacted: "Kontaktiert",
  appointment: "Termin",
  proposal: "Angebot",
  client: "Kunde",
  lost: "Verloren",
};

export const ACQUIRED_BY_OPTIONS = ["Silane", "Bruder", "Frau"] as const;

export type AcquiredBy = (typeof ACQUIRED_BY_OPTIONS)[number];

export const PIPELINE_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "appointment",
  "proposal",
];

export const APPOINTMENT_STATUSES = [
  "planned",
  "confirmed",
  "completed",
  "cancelled",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  planned: "Geplant",
  confirmed: "Bestätigt",
  completed: "Abgeschlossen",
  cancelled: "Abgesagt",
};
