import { describe, expect, it } from "vitest";
import {
  canAccessFinanceRoutes,
  canAccessTeamRoutes,
  canCreateContracts,
  canEditLeads,
  canManageFinance,
  canManageTeam,
  canMarkLeadWon,
  canViewLeads,
  getAssignableAgencyRoles,
  hasPermission,
  isManagement,
  isOwner,
} from "./permissions";
import type { AgencyRole, EmploymentType, Profile } from "./types";

function profile(
  agencyRole: AgencyRole,
  employmentType: EmploymentType = "employee",
): Pick<Profile, "id" | "role" | "agency_role" | "employment_type"> {
  return {
    id: "user-1",
    agency_role: agencyRole,
    employment_type: employmentType,
    role: "employee",
  };
}

describe("agency role permissions", () => {
  it("setter can view and edit leads but not win deals or access finance", () => {
    const setter = profile("setter");

    expect(canViewLeads(setter)).toBe(true);
    expect(canEditLeads(setter)).toBe(true);
    expect(canMarkLeadWon(setter)).toBe(false);
    expect(canCreateContracts(setter)).toBe(false);
    expect(canManageFinance(setter)).toBe(false);
    expect(canAccessFinanceRoutes(setter)).toBe(false);
    expect(hasPermission(setter, "manage_team")).toBe(false);
  });

  it("closer can mark leads won and create contracts", () => {
    const closer = profile("closer", "freelancer");

    expect(canMarkLeadWon(closer)).toBe(true);
    expect(canCreateContracts(closer)).toBe(true);
    expect(hasPermission(closer, "convert_lead_to_client")).toBe(true);
    expect(canManageFinance(closer)).toBe(false);
    expect(canManageTeam(closer)).toBe(false);
  });

  it("owner has full access including finance and role management", () => {
    const owner = profile("owner");

    expect(isOwner(owner)).toBe(true);
    expect(isManagement(owner)).toBe(true);
    expect(canManageFinance(owner)).toBe(true);
    expect(canManageTeam(owner)).toBe(true);
    expect(canAccessTeamRoutes(owner)).toBe(true);
    expect(canAccessFinanceRoutes(owner)).toBe(true);
    expect(hasPermission(owner, "manage_roles")).toBe(true);
    expect(hasPermission(owner, "system_settings")).toBe(true);
    expect(canMarkLeadWon(owner)).toBe(true);
  });

  it("admin has finance and team access but not owner-only role management", () => {
    const admin = profile("admin");

    expect(canManageFinance(admin)).toBe(true);
    expect(canManageTeam(admin)).toBe(true);
    expect(hasPermission(admin, "manage_roles")).toBe(false);
    expect(hasPermission(admin, "system_settings")).toBe(false);
    expect(canMarkLeadWon(admin)).toBe(true);
  });

  it("sales manager can mark leads won", () => {
    const salesManager = profile("sales_manager");
    expect(canMarkLeadWon(salesManager)).toBe(true);
    expect(canManageFinance(salesManager)).toBe(false);
  });

  it("project manager cannot win leads or manage finance", () => {
    const projectManager = profile("project_manager");
    expect(canMarkLeadWon(projectManager)).toBe(false);
    expect(hasPermission(projectManager, "manage_clients")).toBe(true);
    expect(hasPermission(projectManager, "manage_projects")).toBe(true);
    expect(canManageFinance(projectManager)).toBe(false);
  });
});

describe("assignable agency roles", () => {
  it("owner can assign every agency role", () => {
    expect(getAssignableAgencyRoles(profile("owner"))).toEqual([
      "owner",
      "admin",
      "sales_manager",
      "setter",
      "closer",
      "project_manager",
      "customer_success",
    ]);
  });

  it("admin cannot assign owner", () => {
    expect(getAssignableAgencyRoles(profile("admin"))).not.toContain("owner");
    expect(getAssignableAgencyRoles(profile("admin"))).toContain("closer");
  });

  it("setter cannot assign roles", () => {
    expect(getAssignableAgencyRoles(profile("setter"))).toEqual([]);
  });
});
