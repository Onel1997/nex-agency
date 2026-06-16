import { describe, expect, it } from "vitest";
import {
  defaultContractCategoryForProfile,
  validateContractInput,
} from "./contract-form";

describe("validateContractInput", () => {
  it("accepts valid freelancer contract input", () => {
    const error = validateContractInput({
      profileId: "profile-1",
      contractType: "setter",
      contractCategory: "freelancer",
      status: "draft",
      title: "Vertrag Max Setter",
      setupCommissionRate: 10,
      retainerCommissionRate: 8,
      retainerCommissionMonths: 3,
    });
    expect(error).toBeNull();
  });

  it("accepts valid employee contract input", () => {
    const error = validateContractInput({
      profileId: "profile-1",
      contractType: "employee",
      contractCategory: "employee",
      status: "active",
      title: "Vertrag Anna Mitarbeiterin",
      monthlySalaryCents: 350000,
      workingHoursPerWeek: 40,
      vacationDaysPerYear: 28,
    });
    expect(error).toBeNull();
  });

  it("rejects invalid date range", () => {
    const error = validateContractInput({
      profileId: "profile-1",
      contractType: "freelancer",
      contractCategory: "freelancer",
      status: "draft",
      title: "Test",
      startDate: "2026-12-01",
      endDate: "2026-01-01",
    });
    expect(error).toContain("Enddatum");
  });
});

describe("defaultContractCategoryForProfile", () => {
  it("returns employee for employees", () => {
    expect(
      defaultContractCategoryForProfile({
        agency_role: "project_manager",
        employment_type: "employee",
      }),
    ).toBe("employee");
  });

  it("returns freelancer for setters", () => {
    expect(
      defaultContractCategoryForProfile({
        agency_role: "setter",
        employment_type: "freelancer",
      }),
    ).toBe("freelancer");
  });
});
