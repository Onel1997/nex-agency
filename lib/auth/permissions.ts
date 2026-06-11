import type { Profile, UserRole } from "@/lib/auth/types";

export const USER_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "sales",
  "employee",
  "freelancer",
];

export function isSuperAdmin(profile: Profile): boolean {
  return profile.role === "super_admin";
}

export function isManagement(profile: Profile): boolean {
  return profile.role === "super_admin" || profile.role === "admin";
}

export function canAssignLeadOwner(profile: Profile): boolean {
  return isManagement(profile);
}

export function canAssignAppointments(profile: Profile): boolean {
  return isManagement(profile);
}

export function canAccessTeamRoutes(profile: Profile): boolean {
  return isManagement(profile);
}

export function canAccessFinanceRoutes(profile: Profile): boolean {
  return isManagement(profile);
}

export function canAssignSuperAdminRole(profile: Profile): boolean {
  return isSuperAdmin(profile);
}

export function getAssignableRoles(currentUserRole: UserRole): UserRole[] {
  if (currentUserRole === "super_admin") {
    return USER_ROLES;
  }
  if (currentUserRole === "admin") {
    return ["admin", "sales", "employee", "freelancer"];
  }
  return [];
}

export function canEditClientRevenue(
  profile: Profile,
  responsibleMemberId: string | null,
): boolean {
  if (isManagement(profile)) return true;
  if (profile.role === "sales" && responsibleMemberId === profile.id) return true;
  return false;
}

export function isValidUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}
