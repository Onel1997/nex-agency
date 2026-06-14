import { describe, expect, it } from "vitest";
import {
  computeTeamContractStats,
  filterTeamContractsByStatus,
  isTeamContractExpiring,
  shouldMarkTeamContractExpired,
} from "./team-contract-status";

const referenceDate = new Date("2026-06-15T12:00:00");

describe("team contract status logic", () => {
  it("detects active contracts expiring within 30 days", () => {
    expect(
      isTeamContractExpiring("active", "2026-07-01", referenceDate),
    ).toBe(true);
    expect(
      isTeamContractExpiring("active", "2026-08-01", referenceDate),
    ).toBe(false);
    expect(isTeamContractExpiring("draft", "2026-07-01", referenceDate)).toBe(false);
  });

  it("detects contracts that should be marked expired", () => {
    expect(
      shouldMarkTeamContractExpired("active", "2026-06-01", referenceDate),
    ).toBe(true);
    expect(
      shouldMarkTeamContractExpired("active", "2026-07-01", referenceDate),
    ).toBe(false);
  });

  it("computes contract KPI stats", () => {
    const stats = computeTeamContractStats(
      [
        { status: "active", end_date: "2026-07-01" },
        { status: "active", end_date: "2027-01-01" },
        { status: "draft", end_date: null },
        { status: "terminated", end_date: null },
      ],
      referenceDate,
    );

    expect(stats).toEqual({
      active: 2,
      draft: 1,
      terminated: 1,
      expiring: 1,
    });
  });

  it("filters contracts by expiring status", () => {
    const contracts = [
      { id: "1", status: "active" as const, end_date: "2026-07-01" },
      { id: "2", status: "active" as const, end_date: "2027-01-01" },
    ];

    const filtered = filterTeamContractsByStatus(contracts, "expiring", referenceDate);
    expect(filtered.map((contract) => contract.id)).toEqual(["1"]);
  });
});
