import { describe, expect, it } from "vitest";
import {
  aggregateCommissionKpisFromEntries,
  aggregateSalesMetrics,
  computeEntryCommissionTotals,
  computeMemberRoleCommission,
  isProjectFreelancerProfile,
  resolveSalesMemberIds,
} from "./sales-metrics";
import type { CommissionEntryRecord } from "./types";

function retainerEntry(
  id: string,
  status: CommissionEntryRecord["status"] = "pending",
): CommissionEntryRecord {
  return {
    id,
    client_id: "client-retainer",
    client_name: "Retainer Kunde",
    setter_id: "setter-1",
    setter_name: "Setter",
    closer_id: "closer-1",
    closer_name: "Closer",
    project_value_cents: 150_000,
    setter_rate: 10,
    closer_rate: 10,
    setter_commission_cents: 15_000,
    closer_commission_cents: 15_000,
    status,
    entry_type: "retainer",
    deal_type: "setter_closer",
    triggered_by_invoice_id: `inv-${id}`,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    paid_at: null,
  };
}

const leonClient = {
  id: "afd03c42-4f2c-4f0d-96e3-14f65bf57987",
  created_at: "2026-06-14T20:34:13.545Z",
  setter_id: "dbc63f16-0404-4e9d-b631-d4e3e44e9847",
  closer_id: "74202fac-e867-4e51-b321-4cf485abb7ad",
  setup_fee_cents: 500_000,
  monthly_revenue_cents: 0,
  contract_start_date: "2026-06-14",
};

const leonEntry: CommissionEntryRecord = {
  id: "f57f266a-dcea-4215-b8dd-269bbf6f5402",
  client_id: leonClient.id,
  client_name: "Leon",
  setter_id: leonClient.setter_id,
  setter_name: "onel test setter",
  closer_id: leonClient.closer_id,
  closer_name: "Onel Test Closer",
  project_value_cents: 500_000,
  setter_rate: 20,
  closer_rate: 20,
  setter_commission_cents: 100_000,
  closer_commission_cents: 100_000,
  status: "paid",
  entry_type: "setup",
  deal_type: "setter_closer",
  triggered_by_invoice_id: "inv-1",
  created_at: "2026-06-14T21:01:36.300Z",
  updated_at: "2026-06-14T21:02:04.217Z",
  paid_at: "2026-06-14T21:02:04.217Z",
};

describe("sales-metrics Leon case", () => {
  it("attributes revenue and paid commissions to setter and closer", () => {
    const paidProfiles = new Set([
      leonClient.setter_id!,
      leonClient.closer_id!,
    ]);
    const range = {
      start: new Date("2026-06-01T00:00:00"),
      end: new Date("2026-06-30T23:59:59"),
    };

    const result = aggregateSalesMetrics(
      {
        clients: [leonClient],
        entriesByClient: new Map([[leonClient.id, [leonEntry]]]),
        paidProfilesByEntry: new Map([[leonEntry.id, paidProfiles]]),
        retainerInvoicesByClient: new Map(),
      },
      range,
    );

    const setterStats = result.statsByUser.get(leonClient.setter_id!);
    const closerStats = result.statsByUser.get(leonClient.closer_id!);

    expect(result.teamKpis.totalRevenueCents).toBe(500_000);
    expect(result.teamKpis.paidCommissionsCents).toBe(200_000);
    expect(result.teamKpis.outstandingCommissionsCents).toBe(0);

    expect(setterStats?.revenueCents).toBe(500_000);
    expect(setterStats?.commissionTotalCents).toBe(100_000);
    expect(setterStats?.commissionPaidCents).toBe(100_000);
    expect(setterStats?.commissionOutstandingCents).toBe(0);

    expect(closerStats?.revenueCents).toBe(500_000);
    expect(closerStats?.commissionTotalCents).toBe(100_000);
    expect(closerStats?.commissionPaidCents).toBe(100_000);
    expect(closerStats?.commissionOutstandingCents).toBe(0);
  });

  it("resolves sales members from entry attribution", () => {
    expect(resolveSalesMemberIds(leonClient, leonEntry)).toEqual([
      leonClient.setter_id,
      leonClient.closer_id,
    ]);
  });

  it("marks role commission as paid when payout profile exists", () => {
    const paid = computeMemberRoleCommission(
      leonEntry,
      leonClient.setter_id!,
      new Set([leonClient.setter_id!]),
    );
    expect(paid).toEqual({
      earnedCents: 100_000,
      paidCents: 100_000,
      outstandingCents: 0,
    });
  });
});

describe("entry commission totals", () => {
  it("marks Leon entry as fully paid with zero outstanding", () => {
    const paidProfiles = new Set([
      leonClient.setter_id!,
      leonClient.closer_id!,
    ]);

    const totals = computeEntryCommissionTotals(leonEntry, paidProfiles);
    expect(totals).toEqual({
      commissionTotalCents: 200_000,
      commissionPaidCents: 200_000,
      commissionOutstandingCents: 0,
    });

    const team = aggregateCommissionKpisFromEntries(
      [leonEntry],
      new Map([[leonEntry.id, paidProfiles]]),
    );
    expect(team).toEqual({
      outstandingCommissionsCents: 0,
      paidCommissionsCents: 200_000,
    });
  });
});

describe("retainer commission acceptance case", () => {
  const retainerClient = {
    id: "client-retainer",
    created_at: "2026-06-01T00:00:00.000Z",
    setter_id: "setter-1",
    closer_id: "closer-1",
    setup_fee_cents: 0,
    monthly_revenue_cents: 150_000,
    contract_start_date: "2026-06-01",
  };

  it("totals 450 EUR per role across three retainer months", () => {
    const entries = [
      retainerEntry("m1"),
      retainerEntry("m2"),
      retainerEntry("m3"),
    ];
    const range = {
      start: null,
      end: new Date("2099-12-31T23:59:59.999Z"),
    };

    const result = aggregateSalesMetrics(
      {
        clients: [retainerClient],
        entriesByClient: new Map([[retainerClient.id, entries]]),
        paidProfilesByEntry: new Map(),
        retainerInvoicesByClient: new Map(),
      },
      range,
    );

    expect(result.statsByUser.get("setter-1")?.commissionTotalCents).toBe(45_000);
    expect(result.statsByUser.get("closer-1")?.commissionTotalCents).toBe(45_000);
    expect(result.teamKpis.outstandingCommissionsCents).toBe(90_000);
  });
});

describe("sales-metrics profile routing", () => {
  it("treats setter freelancers as sales, not project freelancers", () => {
    expect(
      isProjectFreelancerProfile({
        role: "freelancer",
        agency_role: "setter",
      }),
    ).toBe(false);
  });

  it("treats pure project freelancers separately", () => {
    expect(
      isProjectFreelancerProfile({
        role: "freelancer",
        agency_role: "project_manager",
      }),
    ).toBe(true);
  });
});
