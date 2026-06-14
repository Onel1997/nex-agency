import { describe, expect, it } from "vitest";
import {
  canAccessClient,
  canAccessContractsRoutes,
  canAccessFinanceRoutes,
  canAccessKnowledgeCenter,
  canAccessSystemRoutes,
  canAccessTeamRoutes,
  canCreateContracts,
  canEditClientProfile,
  canEditClientRevenue,
  canEditLeads,
  canManageFinance,
  canManageKnowledgeCenter,
  canManageTeam,
  canMarkLeadWon,
  canViewAllTeamClients,
  canViewAllTeamLeads,
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

    expect(canViewAllTeamLeads(setter)).toBe(false);
    expect(canViewAllTeamClients(setter)).toBe(false);
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

    expect(canViewAllTeamLeads(closer)).toBe(false);
    expect(canViewAllTeamClients(closer)).toBe(false);
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
    expect(canAccessSystemRoutes(owner)).toBe(true);
    expect(canViewAllTeamLeads(owner)).toBe(true);
    expect(canMarkLeadWon(owner)).toBe(true);
  });

  it("admin has finance and team access but not owner-only role management", () => {
    const admin = profile("admin");

    expect(canManageFinance(admin)).toBe(true);
    expect(canManageTeam(admin)).toBe(true);
    expect(hasPermission(admin, "manage_roles")).toBe(false);
    expect(hasPermission(admin, "system_settings")).toBe(false);
    expect(canAccessSystemRoutes(admin)).toBe(false);
    expect(canViewAllTeamLeads(admin)).toBe(true);
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

describe("knowledge center permissions", () => {
  it("setter can access knowledge center but not manage it", () => {
    const setter = profile("setter");

    expect(canAccessKnowledgeCenter(setter)).toBe(true);
    expect(canManageKnowledgeCenter(setter)).toBe(false);
    expect(hasPermission(setter, "manage_knowledge_center")).toBe(false);
  });

  it("closer can access knowledge center", () => {
    expect(canAccessKnowledgeCenter(profile("closer"))).toBe(true);
    expect(canManageKnowledgeCenter(profile("closer"))).toBe(false);
  });

  it("owner can access and manage knowledge center", () => {
    const owner = profile("owner");

    expect(canAccessKnowledgeCenter(owner)).toBe(true);
    expect(canManageKnowledgeCenter(owner)).toBe(true);
  });

  it("admin can access and manage knowledge center", () => {
    const admin = profile("admin");

    expect(canAccessKnowledgeCenter(admin)).toBe(true);
    expect(canManageKnowledgeCenter(admin)).toBe(true);
  });

  it("sales manager can access but not manage knowledge center", () => {
    const salesManager = profile("sales_manager");

    expect(canAccessKnowledgeCenter(salesManager)).toBe(true);
    expect(canManageKnowledgeCenter(salesManager)).toBe(false);
  });
});

describe("contract center permissions", () => {
  it("owner and admin can access contracts routes", () => {
    expect(canAccessContractsRoutes(profile("owner"))).toBe(true);
    expect(canAccessContractsRoutes(profile("admin"))).toBe(true);
  });

  it("setter and closer cannot access contracts routes", () => {
    expect(canAccessContractsRoutes(profile("setter"))).toBe(false);
    expect(canAccessContractsRoutes(profile("closer"))).toBe(false);
    expect(canAccessContractsRoutes(profile("sales_manager"))).toBe(false);
  });
});

describe("client visibility", () => {
  it("closer can access only owned client records", () => {
    const closer = profile("closer", "freelancer");
    expect(
      canAccessClient(closer, "other-user-id", {
        setterId: "another-user",
        closerId: closer.id,
      }),
    ).toBe(true);
    expect(
      canAccessClient(closer, "other-user-id", {
        setterId: "another-user",
        closerId: "other-closer",
      }),
    ).toBe(false);
  });

  it("setter can access assigned clients only", () => {
    const setter = profile("setter");
    expect(canAccessClient(setter, setter.id, { setterId: setter.id })).toBe(
      true,
    );
    expect(
      canAccessClient(setter, "other-user-id", { setterId: "other-user-id" }),
    ).toBe(false);
  });

  it("owner can access any client", () => {
    const owner = profile("owner");
    expect(canAccessClient(owner, "other-user-id")).toBe(true);
  });
});

describe("client contract and invoice permissions", () => {
  it("closer can edit contracts for owned customers only", () => {
    const closer = profile("closer", "freelancer");

    expect(
      canEditClientRevenue(closer, "other-user-id", { closerId: closer.id }),
    ).toBe(true);
    expect(
      canEditClientRevenue(closer, "other-user-id", {
        closerId: "other-closer",
      }),
    ).toBe(false);
    expect(canEditClientProfile(closer, closer.id)).toBe(false);
  });

  it("owner and admin can edit any client contract and profile", () => {
    const owner = profile("owner");
    const admin = profile("admin");

    expect(canEditClientRevenue(owner, "other-user-id")).toBe(true);
    expect(canEditClientRevenue(admin, "other-user-id")).toBe(true);
    expect(canEditClientProfile(owner, "other-user-id")).toBe(true);
    expect(canEditClientProfile(admin, "other-user-id")).toBe(true);
  });

  it("sales manager can edit owned client contracts and profile", () => {
    const salesManager = profile("sales_manager");

    expect(
      canEditClientRevenue(salesManager, salesManager.id, {
        closerId: "other-closer",
      }),
    ).toBe(true);
    expect(canEditClientProfile(salesManager, salesManager.id)).toBe(true);
    expect(canEditClientProfile(salesManager, "other-user-id")).toBe(false);
  });
});

describe("commission center permissions", () => {
  it("owner and admin can manage commissions", () => {
    expect(hasPermission(profile("owner"), "manage_commissions")).toBe(true);
    expect(hasPermission(profile("admin"), "manage_commissions")).toBe(true);
  });

  it("setter and closer cannot manage commissions", () => {
    expect(hasPermission(profile("setter"), "manage_commissions")).toBe(false);
    expect(hasPermission(profile("closer"), "manage_commissions")).toBe(false);
  });
});
