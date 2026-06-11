import type { UserRole } from "./types";
import { ROLE_LABELS } from "./types";

/** Legacy DB values mapped to current role slugs. */
const LEGACY_ROLE_ALIASES: Record<string, UserRole> = {
  sales: "sales_manager",
};

const USER_ROLES_ORDER: UserRole[] = [
  "super_admin",
  "admin",
  "sales_manager",
  "employee",
  "freelancer",
];

export function normalizeUserRole(role: string | null | undefined): UserRole | null {
  if (!role) return null;
  if (role in ROLE_LABELS) return role as UserRole;
  return LEGACY_ROLE_ALIASES[role] ?? null;
}

export function getRoleLabel(role: string | null | undefined): string {
  const normalized = normalizeUserRole(role);
  if (normalized) return ROLE_LABELS[normalized];
  return role?.trim() || "Unbekannt";
}

export function roleSelectOptions(
  assignableRoles: UserRole[],
  currentRole: string | null | undefined,
): UserRole[] {
  const normalized = normalizeUserRole(currentRole);
  const options = new Set<UserRole>(assignableRoles);
  if (normalized) options.add(normalized);
  return USER_ROLES_ORDER.filter((role) => options.has(role));
}
