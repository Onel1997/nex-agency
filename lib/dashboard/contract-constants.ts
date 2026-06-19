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
  "sent",
  "signed",
  "active",
  "terminated",
  "expired",
  "archived",
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
  sent: "Versendet",
  signed: "Unterschrieben",
  active: "Aktiv",
  terminated: "Gekündigt",
  expired: "Ausgelaufen",
  archived: "Archiviert",
};

export const CONTRACT_STATUS_COLORS: Record<
  ContractStatus,
  { bg: string; text: string; ring: string }
> = {
  draft: {
    bg: "bg-zinc-500/15",
    text: "text-zinc-300",
    ring: "ring-zinc-500/25",
  },
  sent: {
    bg: "bg-blue-500/15",
    text: "text-blue-200",
    ring: "ring-blue-500/25",
  },
  signed: {
    bg: "bg-violet-500/15",
    text: "text-violet-200",
    ring: "ring-violet-500/25",
  },
  active: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-200",
    ring: "ring-emerald-500/25",
  },
  terminated: {
    bg: "bg-red-500/15",
    text: "text-red-200",
    ring: "ring-red-500/25",
  },
  expired: {
    bg: "bg-orange-500/15",
    text: "text-orange-200",
    ring: "ring-orange-500/25",
  },
  archived: {
    bg: "bg-slate-700/40",
    text: "text-slate-300",
    ring: "ring-slate-600/40",
  },
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
