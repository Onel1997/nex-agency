export const CONTRACT_TYPES = [
  "employee",
  "freelancer",
  "setter",
  "closer",
  "project_manager",
  "customer_success",
  "external_partner",
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_STATUSES = [
  "draft",
  "active",
  "terminated",
  "expired",
] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  employee: "Mitarbeiter",
  freelancer: "Freelancer",
  setter: "Setter",
  closer: "Closer",
  project_manager: "Projektmanager",
  customer_success: "Customer Success",
  external_partner: "Externer Partner",
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  terminated: "Gekündigt",
  expired: "Ausgelaufen",
};

export const CONTRACT_PDFS_BUCKET = "contract-pdfs";

export const CONTRACT_NUMBER_PREFIX = "CTR";

export const CONTRACT_EXPIRING_DAYS = 30;
