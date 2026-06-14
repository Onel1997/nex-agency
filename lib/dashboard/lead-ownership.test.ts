import { describe, expect, it } from "vitest";
import {
  canClaimLead,
  canCloserWorkLead,
  canConvertLeadForLead,
  canMarkLeadWonForLead,
  isLeadInCloserPool,
  isOpenLeadStatus,
} from "./lead-ownership";

const closer = {
  id: "closer-a",
  agency_role: "closer" as const,
  role: "freelancer" as const,
  employment_type: "freelancer" as const,
};

const closerB = {
  id: "closer-b",
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

describe("lead ownership helpers", () => {
  it("identifies scheduled handoff as the closer pool status", () => {
    expect(isOpenLeadStatus("scheduled")).toBe(true);
    expect(isOpenLeadStatus("qualified")).toBe(false);
    expect(isOpenLeadStatus("won")).toBe(false);
    expect(isOpenLeadStatus("lost")).toBe(false);
  });

  it("allows claiming only unassigned scheduled leads", () => {
    const poolLead = { closer_id: null, status: "scheduled" as const };
    const claimedLead = { closer_id: "closer-a", status: "scheduled" as const };
    const wrongStage = { closer_id: null, status: "qualified" as const };

    expect(isLeadInCloserPool(poolLead)).toBe(true);
    expect(canClaimLead(closer, poolLead)).toBe(true);
    expect(canClaimLead(closer, claimedLead)).toBe(false);
    expect(canClaimLead(closer, wrongStage)).toBe(false);
  });

  it("restricts closer actions to owned leads", () => {
    const owned = { closer_id: "closer-a", status: "won" as const };
    const other = { closer_id: "closer-b", status: "won" as const };

    expect(canCloserWorkLead(closer, owned)).toBe(true);
    expect(canCloserWorkLead(closer, other)).toBe(false);
    expect(canMarkLeadWonForLead(closer, owned)).toBe(true);
    expect(canMarkLeadWonForLead(closerB, owned)).toBe(false);
    expect(canConvertLeadForLead(closer, owned)).toBe(true);
    expect(canConvertLeadForLead(closerB, owned)).toBe(false);
  });

  it("allows management to act on any lead", () => {
    const lead = { closer_id: "closer-b", status: "won" as const };
    expect(canMarkLeadWonForLead(owner, lead)).toBe(true);
    expect(canConvertLeadForLead(owner, lead)).toBe(true);
  });
});
