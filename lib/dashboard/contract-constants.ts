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

export const CONTRACT_DOCUMENTS_BUCKET = "contract-documents";

export const CONTRACT_NUMBER_PREFIX = "CTR";

export const CONTRACT_CATEGORIES = ["employee", "freelancer"] as const;

export type ContractCategory = (typeof CONTRACT_CATEGORIES)[number];

export const CONTRACT_CATEGORY_LABELS: Record<ContractCategory, string> = {
  employee: "Mitarbeiter-Vertrag",
  freelancer: "Freelancer-Vertrag",
};

export const CONTRACT_OVERVIEW_TABS = [
  "kunden",
  "freelancer",
  "mitarbeiter",
] as const;

export type ContractOverviewTab = (typeof CONTRACT_OVERVIEW_TABS)[number];

export const CONTRACT_OVERVIEW_TAB_LABELS: Record<ContractOverviewTab, string> = {
  kunden: "Kundenverträge",
  freelancer: "Freelancer-Verträge",
  mitarbeiter: "Mitarbeiter-Verträge",
};

export const FREELANCER_CONTRACT_TYPES = [
  "freelancer",
  "setter",
  "closer",
  "project_manager",
  "customer_success",
  "external_partner",
] as const;

export function resolveContractCategory(contractType: ContractType): ContractCategory {
  if (contractType === "employee") return "employee";
  return "freelancer";
}

export function isFreelancerContractType(contractType: ContractType): boolean {
  return contractType !== "employee";
}

export const CONTRACT_EXPIRING_DAYS = 30;
