import type { AgencyRole, EmploymentType, UserRole } from "./types";
import { AGENCY_ROLE_LABELS, EMPLOYMENT_TYPE_LABELS, ROLE_LABELS } from "./types";

/** Legacy DB values mapped to current role slugs. */
const LEGACY_ROLE_ALIASES: Record<string, UserRole> = {
  sales: "sales_manager",
};

const LEGACY_AGENCY_ROLE_ALIASES: Record<string, AgencyRole> = {
  super_admin: "owner",
};

const AGENCY_ROLES_ORDER: AgencyRole[] = [
  "owner",
  "admin",
  "sales_manager",
  "setter",
  "closer",
  "project_manager",
  "customer_success",
];

const EMPLOYMENT_TYPES_ORDER: EmploymentType[] = [
  "employee",
  "freelancer",
  "external_partner",
];

export function normalizeUserRole(role: string | null | undefined): UserRole | null {
  if (!role) return null;
  if (role in ROLE_LABELS) return role as UserRole;
  return LEGACY_ROLE_ALIASES[role] ?? null;
}

export function normalizeAgencyRole(role: string | null | undefined): AgencyRole | null {
  if (!role) return null;
  if (role in AGENCY_ROLE_LABELS) return role as AgencyRole;
  return LEGACY_AGENCY_ROLE_ALIASES[role] ?? null;
}

export function normalizeEmploymentType(
  value: string | null | undefined,
): EmploymentType | null {
  if (!value) return null;
  if (value in EMPLOYMENT_TYPE_LABELS) return value as EmploymentType;
  return null;
}

/** Maps legacy synced role column to agency_role when agency_role is missing. */
export function agencyRoleFromLegacyRole(role: string | null | undefined): AgencyRole {
  const normalized = normalizeUserRole(role);
  switch (normalized) {
    case "super_admin":
      return "owner";
    case "admin":
      return "admin";
    case "sales_manager":
      return "sales_manager";
    case "freelancer":
      return "closer";
    default:
      return "setter";
  }
}

export function employmentTypeFromLegacyRole(
  role: string | null | undefined,
): EmploymentType {
  return normalizeUserRole(role) === "freelancer" ? "freelancer" : "employee";
}

export function getRoleLabel(role: string | null | undefined): string {
  const agencyRole = normalizeAgencyRole(role);
  if (agencyRole) return AGENCY_ROLE_LABELS[agencyRole];
  const normalized = normalizeUserRole(role);
  if (normalized) return ROLE_LABELS[normalized];
  return role?.trim() || "Unbekannt";
}

export function getAgencyRoleLabel(role: AgencyRole | string | null | undefined): string {
  const normalized = normalizeAgencyRole(role);
  if (normalized) return AGENCY_ROLE_LABELS[normalized];
  return role?.trim() || "Unbekannt";
}

export function getEmploymentTypeLabel(
  value: EmploymentType | string | null | undefined,
): string {
  const normalized = normalizeEmploymentType(value);
  if (normalized) return EMPLOYMENT_TYPE_LABELS[normalized];
  return value?.trim() || "Unbekannt";
}

export function agencyRoleSelectOptions(
  assignableRoles: AgencyRole[],
  currentRole: string | null | undefined,
): AgencyRole[] {
  const normalized = normalizeAgencyRole(currentRole);
  const options = new Set<AgencyRole>(assignableRoles);
  if (normalized) options.add(normalized);
  return AGENCY_ROLES_ORDER.filter((role) => options.has(role));
}

export function employmentTypeSelectOptions(): EmploymentType[] {
  return EMPLOYMENT_TYPES_ORDER;
}

/** @deprecated Use agencyRoleSelectOptions */
export function roleSelectOptions(
  assignableRoles: UserRole[],
  currentRole: string | null | undefined,
): UserRole[] {
  const normalized = normalizeUserRole(currentRole);
  const options = new Set<UserRole>(assignableRoles);
  if (normalized) options.add(normalized);
  const order: UserRole[] = [
    "super_admin",
    "admin",
    "sales_manager",
    "employee",
    "freelancer",
  ];
  return order.filter((role) => options.has(role));
}
