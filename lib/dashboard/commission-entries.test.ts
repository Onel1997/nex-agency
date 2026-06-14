import { describe, expect, it } from "vitest";
import {
  calculateRoleCommissionCents,
  calculateSetterCloserCommissions,
  canApproveCommissionEntry,
  canPayCommissionEntry,
  isCommissionTriggeringInvoiceType,
  nextCommissionEntryStatus,
  shouldCreateCommissionEntry,
  sumMemberCommissionEarned,
  sumMemberCommissionOpen,
} from "./commission-entries";

describe("commission calculation", () => {
  it("calculates setter and closer commissions from project value", () => {
    const result = calculateSetterCloserCommissions({
      projectValueCents: 500_000,
      setterRate: 30,
      closerRate: 20,
      hasSetter: true,
      hasCloser: true,
    });

    expect(result.setter_commission_cents).toBe(150_000);
    expect(result.closer_commission_cents).toBe(100_000);
  });

  it("calculates role commission with rounding", () => {
    expect(calculateRoleCommissionCents(10_000, 15)).toBe(1_500);
    expect(calculateRoleCommissionCents(0, 30)).toBe(0);
  });

  it("supports freelancer setter with employee closer combinations", () => {
    const setterOnly = calculateSetterCloserCommissions({
      projectValueCents: 300_000,
      setterRate: 25,
      closerRate: 15,
      hasSetter: true,
      hasCloser: false,
    });
    expect(setterOnly.setter_commission_cents).toBe(75_000);
    expect(setterOnly.closer_commission_cents).toBe(0);
  });
});

describe("commission entry creation rules", () => {
  it("triggers on paid setup and manual invoices only", () => {
    expect(isCommissionTriggeringInvoiceType("setup")).toBe(true);
    expect(isCommissionTriggeringInvoiceType("manual")).toBe(true);
    expect(isCommissionTriggeringInvoiceType("retainer")).toBe(false);
  });

  it("creates entry when paid setup invoice has setter/closer attribution", () => {
    expect(
      shouldCreateCommissionEntry({
        invoiceStatus: "paid",
        invoiceType: "setup",
        existingEntryForInvoice: false,
        setterId: "setter-1",
        closerId: "closer-1",
        setterCommissionCents: 150_000,
        closerCommissionCents: 100_000,
      }),
    ).toBe(true);
  });

  it("does not create duplicate entries", () => {
    expect(
      shouldCreateCommissionEntry({
        invoiceStatus: "paid",
        invoiceType: "setup",
        existingEntryForInvoice: true,
        setterId: "setter-1",
        closerId: null,
        setterCommissionCents: 50_000,
        closerCommissionCents: 0,
      }),
    ).toBe(false);
  });

  it("does not create entry on lead won or draft invoice", () => {
    expect(
      shouldCreateCommissionEntry({
        invoiceStatus: "draft",
        invoiceType: "setup",
        existingEntryForInvoice: false,
        setterId: "setter-1",
        closerId: null,
        setterCommissionCents: 50_000,
        closerCommissionCents: 0,
      }),
    ).toBe(false);
  });
});

describe("commission status workflow", () => {
  it("approves pending entries", () => {
    expect(canApproveCommissionEntry("pending")).toBe(true);
    expect(nextCommissionEntryStatus("pending", "approve")).toBe("approved");
  });

  it("pays approved entries", () => {
    expect(canPayCommissionEntry("approved")).toBe(true);
    expect(nextCommissionEntryStatus("approved", "pay")).toBe("paid");
  });

  it("cannot pay pending entries directly", () => {
    expect(canPayCommissionEntry("pending")).toBe(false);
  });
});

describe("member commission summaries", () => {
  const entries = [
    {
      setter_id: "setter-1",
      closer_id: "closer-1",
      setter_commission_cents: 100_000,
      closer_commission_cents: 50_000,
      status: "pending" as const,
    },
    {
      setter_id: "setter-1",
      closer_id: null,
      setter_commission_cents: 30_000,
      closer_commission_cents: 0,
      status: "paid" as const,
    },
  ];

  it("sums earned and open amounts per member", () => {
    expect(sumMemberCommissionEarned(entries, "setter-1")).toBe(130_000);
    expect(sumMemberCommissionOpen(entries, "setter-1")).toBe(100_000);
    expect(sumMemberCommissionEarned(entries, "closer-1")).toBe(50_000);
  });
});
