import type { Profile, UserRole } from "@/lib/auth/types";
import { normalizeUserRole } from "@/lib/auth/roles";

type RoleActor = Pick<Profile, "role">;

export const USER_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "sales_manager",
  "employee",
  "freelancer",
];

export const FIELD_STAFF_ROLES: UserRole[] = [
  "sales_manager",
  "employee",
  "freelancer",
];

export function isSuperAdmin(profile: RoleActor): boolean {
  return profile.role === "super_admin";
}

export function isAdmin(profile: RoleActor): boolean {
  return profile.role === "admin";
}

export function isManagement(profile: RoleActor): boolean {
  return profile.role === "super_admin" || profile.role === "admin";
}

export function isSalesManager(profile: RoleActor): boolean {
  return profile.role === "sales_manager";
}

export function isFieldStaff(profile: RoleActor): boolean {
  return FIELD_STAFF_ROLES.includes(profile.role);
}

export function canAssignLeadOwner(profile: RoleActor): boolean {
  return isManagement(profile);
}

export function canAssignClientOwner(profile: RoleActor): boolean {
  return isManagement(profile);
}

export function canAssignAppointments(profile: RoleActor): boolean {
  return isManagement(profile);
}

export function canAccessTeamRoutes(profile: RoleActor): boolean {
  return isManagement(profile);
}

export function canManageTeam(profile: RoleActor): boolean {
  return isManagement(profile);
}

export function canAccessFinanceRoutes(profile: RoleActor): boolean {
  return isManagement(profile);
}

export function canAccessPerformanceRoutes(profile: RoleActor): boolean {
  return isManagement(profile) || isFieldStaff(profile);
}

export function canManageCommissions(profile: RoleActor): boolean {
  return isManagement(profile);
}

export function canAssignSuperAdminRole(profile: RoleActor): boolean {
  return isSuperAdmin(profile);
}

export function canManageMember(
  actor: RoleActor,
  target: { role: UserRole | string },
): boolean {
  if (!isManagement(actor)) return false;

  const targetRole = normalizeUserRole(target.role);
  if (targetRole === "super_admin" && !isSuperAdmin(actor)) {
    return false;
  }
  return true;
}

export function canAssignRoleToMember(
  actor: RoleActor,
  target: { role: UserRole | string },
  nextRole: UserRole | string,
): boolean {
  if (!canManageMember(actor, target)) return false;
  const normalized = normalizeUserRole(nextRole);
  if (!normalized) return false;
  if (!getAssignableRoles(actor.role).includes(normalized)) return false;
  if (normalized === "super_admin" && !canAssignSuperAdminRole(actor)) return false;
  return true;
}

export function getAssignableRoles(currentUserRole: UserRole): UserRole[] {
  if (currentUserRole === "super_admin") {
    return USER_ROLES;
  }
  if (currentUserRole === "admin") {
    return ["admin", "sales_manager", "employee", "freelancer"];
  }
  return [];
}

export function canEditClientRevenue(
  profile: RoleActor & Pick<Profile, "id">,
  responsibleMemberId: string | null,
): boolean {
  if (isManagement(profile)) return true;
  if (
    isSalesManager(profile) &&
    responsibleMemberId === profile.id
  ) {
    return true;
  }
  return false;
}

export function isValidUserRole(role: string): role is UserRole {
  return normalizeUserRole(role) !== null;
}

export function assertRoleAssignable(role: UserRole | string, actor: RoleActor) {
  const normalized = normalizeUserRole(role);
  if (!normalized) {
    throw new Error("Ungültige Rolle");
  }
  if (!getAssignableRoles(actor.role).includes(normalized)) {
    throw new Error("Keine Berechtigung, diese Rolle zu vergeben");
  }
  if (normalized === "super_admin" && !canAssignSuperAdminRole(actor)) {
    throw new Error("Nur Super Admins können die Super-Admin-Rolle vergeben");
  }
}
