import type { AgencyRole, EmploymentType, Profile, UserRole } from "@/lib/auth/types";
import {
  agencyRoleFromLegacyRole,
  normalizeAgencyRole,
  normalizeEmploymentType,
  normalizeUserRole,
} from "@/lib/auth/roles";

export type Permission =
  | "view_leads"
  | "edit_leads"
  | "create_offers"
  | "create_contracts"
  | "mark_lead_won"
  | "convert_lead_to_client"
  | "manage_clients"
  | "manage_projects"
  | "manage_finance"
  | "manage_commissions"
  | "manage_team"
  | "manage_roles"
  | "system_settings"
  | "access_knowledge_center"
  | "manage_knowledge_center";

type PermissionActor = Pick<
  Profile,
  "role" | "agency_role" | "employment_type" | "id"
> & {
  agency_role?: AgencyRole | string | null;
  employment_type?: EmploymentType | string | null;
};

const ROLE_PERMISSIONS: Record<AgencyRole, Permission[]> = {
  owner: [
    "view_leads",
    "edit_leads",
    "create_offers",
    "create_contracts",
    "mark_lead_won",
    "convert_lead_to_client",
    "manage_clients",
    "manage_projects",
    "manage_finance",
    "manage_commissions",
    "manage_team",
    "manage_roles",
    "system_settings",
    "access_knowledge_center",
    "manage_knowledge_center",
  ],
  admin: [
    "view_leads",
    "edit_leads",
    "create_offers",
    "create_contracts",
    "mark_lead_won",
    "convert_lead_to_client",
    "manage_clients",
    "manage_projects",
    "manage_finance",
    "manage_commissions",
    "manage_team",
    "access_knowledge_center",
    "manage_knowledge_center",
  ],
  sales_manager: [
    "view_leads",
    "edit_leads",
    "create_offers",
    "create_contracts",
    "mark_lead_won",
    "convert_lead_to_client",
    "manage_clients",
    "manage_projects",
    "access_knowledge_center",
  ],
  setter: [
    "view_leads",
    "edit_leads",
    "access_knowledge_center",
  ],
  closer: [
    "view_leads",
    "edit_leads",
    "create_offers",
    "create_contracts",
    "mark_lead_won",
    "convert_lead_to_client",
    "access_knowledge_center",
  ],
  project_manager: [
    "manage_clients",
    "manage_projects",
    "access_knowledge_center",
  ],
  customer_success: [
    "manage_clients",
    "access_knowledge_center",
  ],
};

export const AGENCY_ROLES: AgencyRole[] = [
  "owner",
  "admin",
  "sales_manager",
  "setter",
  "closer",
  "project_manager",
  "customer_success",
];

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  "employee",
  "freelancer",
  "external_partner",
];

/** @deprecated Use AGENCY_ROLES */
export const USER_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "sales_manager",
  "employee",
  "freelancer",
];

/** @deprecated */
export const FIELD_STAFF_ROLES: UserRole[] = [
  "sales_manager",
  "employee",
  "freelancer",
];

export function resolveAgencyRole(profile: PermissionActor): AgencyRole {
  return (
    normalizeAgencyRole(profile.agency_role) ??
    agencyRoleFromLegacyRole(profile.role)
  );
}

export function resolveEmploymentType(profile: PermissionActor): EmploymentType {
  return (
    normalizeEmploymentType(profile.employment_type) ??
    (normalizeUserRole(profile.role) === "freelancer" ? "freelancer" : "employee")
  );
}

export function hasPermission(
  profile: PermissionActor,
  permission: Permission,
): boolean {
  const role = resolveAgencyRole(profile);
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canViewLeads(profile: PermissionActor): boolean {
  return hasPermission(profile, "view_leads");
}

export function canEditLeads(profile: PermissionActor): boolean {
  return hasPermission(profile, "edit_leads");
}

export function canCreateContracts(profile: PermissionActor): boolean {
  return hasPermission(profile, "create_contracts");
}

export function canMarkLeadWon(profile: PermissionActor): boolean {
  return hasPermission(profile, "mark_lead_won");
}

export function canManageFinance(profile: PermissionActor): boolean {
  return hasPermission(profile, "manage_finance");
}

export function canManageTeam(profile: PermissionActor): boolean {
  return hasPermission(profile, "manage_team");
}

export function canAccessKnowledgeCenter(profile: PermissionActor): boolean {
  return hasPermission(profile, "access_knowledge_center");
}

export function canConvertLeadToClient(profile: PermissionActor): boolean {
  return hasPermission(profile, "convert_lead_to_client");
}

export function canManageClients(profile: PermissionActor): boolean {
  return hasPermission(profile, "manage_clients");
}

export function canManageProjects(profile: PermissionActor): boolean {
  return hasPermission(profile, "manage_projects");
}

export function isOwner(profile: PermissionActor): boolean {
  return resolveAgencyRole(profile) === "owner";
}

export function isSuperAdmin(profile: PermissionActor): boolean {
  return isOwner(profile);
}

export function isAdmin(profile: PermissionActor): boolean {
  return resolveAgencyRole(profile) === "admin";
}

export function isManagement(profile: PermissionActor): boolean {
  const role = resolveAgencyRole(profile);
  return role === "owner" || role === "admin";
}

export function isSalesManager(profile: PermissionActor): boolean {
  return resolveAgencyRole(profile) === "sales_manager";
}

export function isSetter(profile: PermissionActor): boolean {
  return resolveAgencyRole(profile) === "setter";
}

export function isCloser(profile: PermissionActor): boolean {
  return resolveAgencyRole(profile) === "closer";
}

export function isFieldStaff(profile: PermissionActor): boolean {
  const role = resolveAgencyRole(profile);
  return [
    "sales_manager",
    "setter",
    "closer",
    "project_manager",
    "customer_success",
  ].includes(role);
}

export function canAssignLeadOwner(profile: PermissionActor): boolean {
  return isManagement(profile) || isSalesManager(profile);
}

export function canAssignClientOwner(profile: PermissionActor): boolean {
  return isManagement(profile) || isSalesManager(profile);
}

export function canAssignAppointments(profile: PermissionActor): boolean {
  return canEditLeads(profile);
}

export function canAccessTeamRoutes(profile: PermissionActor): boolean {
  return canManageTeam(profile);
}

export function canAccessFinanceRoutes(profile: PermissionActor): boolean {
  return canManageFinance(profile);
}

export function canAccessPerformanceRoutes(profile: PermissionActor): boolean {
  return isManagement(profile) || isFieldStaff(profile);
}

export function canManageCommissions(profile: PermissionActor): boolean {
  return hasPermission(profile, "manage_commissions");
}

export function canAssignOwnerRole(profile: PermissionActor): boolean {
  return isOwner(profile);
}

/** @deprecated Use canAssignOwnerRole */
export function canAssignSuperAdminRole(profile: PermissionActor): boolean {
  return canAssignOwnerRole(profile);
}

export function canManageMember(
  actor: PermissionActor,
  target: { agency_role?: AgencyRole | string | null; role?: UserRole | string },
): boolean {
  if (!canManageTeam(actor)) return false;

  const targetRole =
    normalizeAgencyRole(target.agency_role) ??
    agencyRoleFromLegacyRole(target.role ?? null);
  if (targetRole === "owner" && !isOwner(actor)) {
    return false;
  }
  return true;
}

export function getAssignableAgencyRoles(actor: PermissionActor): AgencyRole[] {
  const actorRole = resolveAgencyRole(actor);
  if (actorRole === "owner") {
    return AGENCY_ROLES;
  }
  if (actorRole === "admin") {
    return AGENCY_ROLES.filter((role) => role !== "owner");
  }
  return [];
}

/** @deprecated Use getAssignableAgencyRoles */
export function getAssignableRoles(currentUserRole: UserRole | string): UserRole[] {
  const agencyRole = normalizeAgencyRole(currentUserRole) ?? agencyRoleFromLegacyRole(currentUserRole);
  return getAssignableAgencyRoles({ role: "employee", agency_role: agencyRole }).map(
    (role) => {
      switch (role) {
        case "owner":
          return "super_admin";
        case "admin":
          return "admin";
        case "sales_manager":
          return "sales_manager";
        case "closer":
          return "freelancer";
        default:
          return "employee";
      }
    },
  ) as UserRole[];
}

export function canAssignAgencyRoleToMember(
  actor: PermissionActor,
  target: { agency_role?: AgencyRole | string | null; role?: UserRole | string },
  nextRole: AgencyRole | string,
): boolean {
  if (!canManageMember(actor, target)) return false;
  const normalized = normalizeAgencyRole(nextRole);
  if (!normalized) return false;
  if (!getAssignableAgencyRoles(actor).includes(normalized)) return false;
  if (normalized === "owner" && !canAssignOwnerRole(actor)) return false;
  return true;
}

/** @deprecated Use canAssignAgencyRoleToMember */
export function canAssignRoleToMember(
  actor: PermissionActor,
  target: { role: UserRole | string },
  nextRole: UserRole | string,
): boolean {
  const nextAgencyRole =
    normalizeAgencyRole(nextRole) ?? agencyRoleFromLegacyRole(nextRole);
  return canAssignAgencyRoleToMember(actor, target, nextAgencyRole);
}

export function canAccessClient(
  profile: PermissionActor & Pick<Profile, "id">,
  responsibleMemberId: string | null,
): boolean {
  if (isManagement(profile) || isSalesManager(profile)) return true;
  if (canManageClients(profile) && responsibleMemberId === profile.id) {
    return true;
  }
  if (isFieldStaff(profile) && responsibleMemberId === profile.id) {
    return true;
  }
  return false;
}

export function canEditClientRevenue(
  profile: PermissionActor & Pick<Profile, "id">,
  responsibleMemberId: string | null,
): boolean {
  if (isManagement(profile)) return true;
  if (isSalesManager(profile) && responsibleMemberId === profile.id) {
    return true;
  }
  return false;
}

export function isValidAgencyRole(role: string): role is AgencyRole {
  return normalizeAgencyRole(role) !== null;
}

export function isValidEmploymentType(value: string): value is EmploymentType {
  return normalizeEmploymentType(value) !== null;
}

/** @deprecated Use isValidAgencyRole */
export function isValidUserRole(role: string): role is UserRole {
  return normalizeUserRole(role) !== null;
}

export function assertAgencyRoleAssignable(
  role: AgencyRole | string,
  actor: PermissionActor,
) {
  const normalized = normalizeAgencyRole(role);
  if (!normalized) {
    throw new Error("Ungültige Agenturrolle");
  }
  if (!getAssignableAgencyRoles(actor).includes(normalized)) {
    throw new Error("Keine Berechtigung, diese Rolle zu vergeben");
  }
  if (normalized === "owner" && !canAssignOwnerRole(actor)) {
    throw new Error("Nur Owner können die Owner-Rolle vergeben");
  }
}

/** @deprecated Use assertAgencyRoleAssignable */
export function assertRoleAssignable(role: UserRole | string, actor: PermissionActor) {
  const agencyRole =
    normalizeAgencyRole(role) ?? agencyRoleFromLegacyRole(role);
  assertAgencyRoleAssignable(agencyRole, actor);
}
