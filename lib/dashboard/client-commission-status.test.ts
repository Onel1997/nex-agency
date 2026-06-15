import { describe, expect, it } from "vitest";
import {
  areAllCommissionRolesPaid,
  resolveClientCommissionPayoutStatus,
} from "./client-commission-status";
import type { CommissionEntryRecord } from "./types";

function entry(
  overrides: Partial<CommissionEntryRecord> = {},
): CommissionEntryRecord {
  return {
    id: "entry-1",
    client_id: "client-1",
    client_name: "Acme",
    setter_id: "setter-1",
    setter_name: "Anna",
    closer_id: "closer-1",
    closer_name: "Ben",
    project_value_cents: 100_000,
    setter_rate: 10,
    closer_rate: 20,
    setter_commission_cents: 10_000,
    closer_commission_cents: 20_000,
    status: "approved",
    entry_type: "setup",
    deal_type: "setter_closer",
    triggered_by_invoice_id: "inv-1",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    paid_at: null,
    ...overrides,
  };
}

describe("resolveClientCommissionPayoutStatus", () => {
  it("tracks setter and closer payouts independently", () => {
    const setterOnlyPaid = resolveClientCommissionPayoutStatus(
      entry(),
      new Set(["setter-1"]),
    );
    expect(setterOnlyPaid.setterPaid).toBe(true);
    expect(setterOnlyPaid.closerPaid).toBe(false);

    const closerOnlyPaid = resolveClientCommissionPayoutStatus(
      entry(),
      new Set(["closer-1"]),
    );
    expect(closerOnlyPaid.setterPaid).toBe(false);
    expect(closerOnlyPaid.closerPaid).toBe(true);
  });

  it("marks roles without commission as paid", () => {
    const payoutStatus = resolveClientCommissionPayoutStatus(
      entry({
        closer_id: null,
        closer_name: null,
        closer_commission_cents: 0,
      }),
      new Set(),
    );

    expect(payoutStatus.setterPaid).toBe(false);
    expect(payoutStatus.closerPaid).toBe(true);
    expect(areAllCommissionRolesPaid(payoutStatus)).toBe(false);
  });
});

describe("areAllCommissionRolesPaid", () => {
  it("returns true only when both roles are paid", () => {
    expect(
      areAllCommissionRolesPaid({
        setterPaid: true,
        closerPaid: true,
      }),
    ).toBe(true);
    expect(
      areAllCommissionRolesPaid({
        setterPaid: true,
        closerPaid: false,
      }),
    ).toBe(false);
  });
});
