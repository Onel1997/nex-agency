import type { AgencyRole } from "@/lib/auth/types";
import { resolveAgencyRole, type PermissionActor } from "@/lib/auth/permissions";

export const KNOWLEDGE_CATEGORY_SLUGS = [
  "sales",
  "onboarding",
  "sops",
  "vertraege",
  "projekte",
  "marketing",
  "operations",
] as const;

export type KnowledgeCategorySlug = (typeof KNOWLEDGE_CATEGORY_SLUGS)[number];

export type KnowledgeDocumentVisibility =
  | "all"
  | "owner_admin"
  | "sales"
  | "setter"
  | "closer"
  | "project_manager"
  | "customer_success";

export type KnowledgeContentType =
  | "document"
  | "video"
  | "training"
  | "quiz"
  | "wiki";

const CATEGORY_ACCESS_BY_ROLE: Record<AgencyRole, KnowledgeCategorySlug[] | "all"> = {
  owner: "all",
  admin: "all",
  setter: ["sales", "onboarding", "sops"],
  closer: ["sales", "onboarding", "sops", "vertraege"],
  project_manager: ["projekte", "sops", "operations"],
  sales_manager: ["sales", "onboarding", "sops", "vertraege", "marketing"],
  customer_success: ["onboarding", "sops", "projekte", "operations"],
};

const VISIBILITY_ACCESS_BY_ROLE: Record<
  AgencyRole,
  KnowledgeDocumentVisibility[]
> = {
  owner: [
    "all",
    "owner_admin",
    "sales",
    "setter",
    "closer",
    "project_manager",
    "customer_success",
  ],
  admin: [
    "all",
    "owner_admin",
    "sales",
    "setter",
    "closer",
    "project_manager",
    "customer_success",
  ],
  sales_manager: ["all", "sales"],
  setter: ["all", "sales", "setter"],
  closer: ["all", "sales", "closer"],
  project_manager: ["all", "project_manager"],
  customer_success: ["all", "customer_success"],
};

export function getAccessibleCategorySlugs(role: AgencyRole): KnowledgeCategorySlug[] {
  const access = CATEGORY_ACCESS_BY_ROLE[role];
  if (access === "all") return [...KNOWLEDGE_CATEGORY_SLUGS];
  return access;
}

export function canAccessKnowledgeCategory(
  role: AgencyRole,
  slug: string,
): boolean {
  return getAccessibleCategorySlugs(role).includes(slug as KnowledgeCategorySlug);
}

export function canViewKnowledgeDocument(
  role: AgencyRole,
  visibility: KnowledgeDocumentVisibility,
): boolean {
  return VISIBILITY_ACCESS_BY_ROLE[role].includes(visibility);
}

export function resolveKnowledgeRole(profile: PermissionActor): AgencyRole {
  return resolveAgencyRole(profile);
}

export const KNOWLEDGE_VISIBILITY_OPTIONS: {
  value: KnowledgeDocumentVisibility;
  label: string;
}[] = [
  { value: "all", label: "Alle mit Zugang" },
  { value: "owner_admin", label: "Owner / Admin" },
  { value: "sales", label: "Sales-Team" },
  { value: "setter", label: "Setter" },
  { value: "closer", label: "Closer" },
  { value: "project_manager", label: "Projektmanager" },
  { value: "customer_success", label: "Customer Success" },
];

export function getFileTypeLabel(mimeType: string, fileName: string): string {
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) return "PDF";
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    return "DOCX";
  }
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    fileName.endsWith(".xlsx")
  ) {
    return "XLSX";
  }
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    fileName.endsWith(".pptx")
  ) {
    return "PPTX";
  }
  const ext = fileName.split(".").pop()?.toUpperCase();
  return ext || "Datei";
}

export function isPdfDocument(mimeType: string, fileName: string): boolean {
  return mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
}
