import { describe, expect, it } from "vitest";
import {
  getSelectableLeadStatuses,
  isAllowedLeadStatusTransition,
  isLeadInCloserPool,
} from "./lead-pipeline";

const setter = {
  id: "setter-1",
  agency_role: "setter" as const,
  role: "employee" as const,
  employment_type: "employee" as const,
};

const closer = {
  id: "closer-a",
  agency_role: "closer" as const,
  role: "freelancer" as const,
  employment_type: "freelancer" as const,
};

const owner = {
  id: "owner-1",
  agency_role: "owner" as const,
  role: "super_admin" as const,
  employment_type: "employee" as const,
};

describe("lead pipeline", () => {
  it("puts unassigned scheduled leads in the closer pool", () => {
    expect(isLeadInCloserPool({ closer_id: null, status: "scheduled" })).toBe(true);
    expect(isLeadInCloserPool({ closer_id: null, status: "qualified" })).toBe(false);
    expect(isLeadInCloserPool({ closer_id: "closer-a", status: "scheduled" })).toBe(false);
  });

  it("allows setter progression until scheduled, then only lost", () => {
    const open = { closer_id: null, status: "new" as const };
    expect(isAllowedLeadStatusTransition(setter, open, "contacted")).toBe(true);
    expect(isAllowedLeadStatusTransition(setter, open, "scheduled")).toBe(false);

    const contacted = { closer_id: null, status: "contacted" as const };
    expect(isAllowedLeadStatusTransition(setter, contacted, "scheduled")).toBe(true);
    expect(isAllowedLeadStatusTransition(setter, contacted, "qualified")).toBe(false);

    const scheduled = { closer_id: null, status: "scheduled" as const };
    expect(isAllowedLeadStatusTransition(setter, scheduled, "qualified")).toBe(false);
    expect(isAllowedLeadStatusTransition(setter, scheduled, "lost")).toBe(true);
    expect(isAllowedLeadStatusTransition(setter, scheduled, "contacted")).toBe(false);
  });

  it("restricts closer to forward-only closer stages after claim", () => {
    const poolLead = { closer_id: null, status: "scheduled" as const };
    expect(isAllowedLeadStatusTransition(closer, poolLead, "qualified")).toBe(false);

    const owned = { closer_id: "closer-a", status: "scheduled" as const };
    expect(isAllowedLeadStatusTransition(closer, owned, "qualified")).toBe(true);
    expect(isAllowedLeadStatusTransition(closer, owned, "contacted")).toBe(false);
    expect(isAllowedLeadStatusTransition(closer, owned, "new")).toBe(false);

    const qualified = { closer_id: "closer-a", status: "qualified" as const };
    expect(isAllowedLeadStatusTransition(closer, qualified, "proposal")).toBe(true);
    expect(isAllowedLeadStatusTransition(closer, qualified, "scheduled")).toBe(false);
  });

  it("shows role-specific dropdown options", () => {
    expect(
      getSelectableLeadStatuses(setter, { closer_id: null, status: "contacted" }),
    ).toEqual(expect.arrayContaining(["contacted", "new", "scheduled", "lost"]));

    expect(
      getSelectableLeadStatuses(closer, { closer_id: null, status: "scheduled" }),
    ).toEqual(["scheduled"]);

    expect(
      getSelectableLeadStatuses(closer, { closer_id: "closer-a", status: "scheduled" }),
    ).toEqual(expect.arrayContaining(["scheduled", "qualified", "lost"]));
  });

  it("allows management to move across the full lifecycle", () => {
    expect(
      isAllowedLeadStatusTransition(owner, { closer_id: null, status: "scheduled" }, "qualified"),
    ).toBe(true);
  });
});
