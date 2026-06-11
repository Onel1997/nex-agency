export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Neu",
  contacted: "Kontaktiert",
  qualified: "Qualifiziert",
  proposal: "Angebot",
  won: "Gewonnen",
  lost: "Verloren",
};

export const ACQUIRED_BY_OPTIONS = ["Silane", "Bruder", "Frau"] as const;

export type AcquiredBy = (typeof ACQUIRED_BY_OPTIONS)[number];

export const PIPELINE_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
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

export const COMMISSION_STATUSES = [
  "none",
  "pending",
  "outstanding",
  "paid",
] as const;

export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  none: "Keine",
  pending: "Ausstehend",
  outstanding: "Offen",
  paid: "Bezahlt",
};

export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Entwurf",
  sent: "Versendet",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
};

export const COMMUNICATION_TYPES = [
  "phone",
  "meeting",
  "email",
  "other",
] as const;

export type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

export const COMMUNICATION_TYPE_LABELS: Record<CommunicationType, string> = {
  phone: "Telefonat",
  meeting: "Meeting",
  email: "E-Mail",
  other: "Sonstiges",
};

export const CLIENT_ACTIVITY_TYPES = [
  "lead_created",
  "lead_won",
  "client_created",
  "contract_changed",
  "commission_paid",
  "file_uploaded",
  "invoice_created",
  "invoice_paid",
] as const;

export type ClientActivityType = (typeof CLIENT_ACTIVITY_TYPES)[number];

export const CLIENT_ACTIVITY_TYPE_LABELS: Record<ClientActivityType, string> = {
  lead_created: "Lead erstellt",
  lead_won: "Lead gewonnen",
  client_created: "Kunde erstellt",
  contract_changed: "Vertragsdaten geändert",
  commission_paid: "Provision ausgezahlt",
  file_uploaded: "Datei hochgeladen",
  invoice_created: "Rechnung erstellt",
  invoice_paid: "Rechnung bezahlt",
};
