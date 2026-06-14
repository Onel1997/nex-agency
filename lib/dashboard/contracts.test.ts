import { describe, expect, it } from "vitest";
import {
  defaultContractTitle,
  defaultContractTypeForProfile,
  validateContractInput,
} from "./contract-form";

describe("contract creation helpers", () => {
  it("supports freelancer setter and employee setter combinations", () => {
    expect(
      defaultContractTypeForProfile({
        agency_role: "setter",
        employment_type: "freelancer",
      }),
    ).toBe("setter");

    expect(
      defaultContractTypeForProfile({
        agency_role: "setter",
        employment_type: "employee",
      }),
    ).toBe("setter");

    expect(
      defaultContractTypeForProfile({
        agency_role: "closer",
        employment_type: "freelancer",
      }),
    ).toBe("closer");
  });

  it("defaults external partners to external_partner contract type", () => {
    expect(
      defaultContractTypeForProfile({
        agency_role: "setter",
        employment_type: "external_partner",
      }),
    ).toBe("external_partner");
  });

  it("builds a readable default contract title", () => {
    expect(
      defaultContractTitle({
        full_name: "Max Mustermann",
        email: "max@example.com",
        agency_role: "setter",
        employment_type: "freelancer",
      }),
    ).toContain("Max Mustermann");
  });

  it("validates contract input", () => {
    expect(
      validateContractInput({
        profileId: "user-1",
        contractType: "setter",
        status: "draft",
        title: "Setter Vertrag",
        startDate: "2026-01-01",
        endDate: "2025-12-31",
      }),
    ).toBe("Enddatum darf nicht vor dem Beginn liegen");

    expect(
      validateContractInput({
        profileId: "",
        contractType: "employee",
        status: "draft",
        title: "Test",
      }),
    ).toBe("Bitte eine Person auswählen");

    expect(
      validateContractInput({
        profileId: "user-1",
        contractType: "employee",
        status: "active",
        title: "Mitarbeitervertrag",
        commissionRate: 120,
      }),
    ).toBe("Provision muss zwischen 0 und 100 % liegen");
  });
});
