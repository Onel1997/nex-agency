import { describe, expect, it } from "vitest";
import {
  advanceBillingDate,
  getBillingPeriodForDate,
  resolveRetainerAmountCents,
} from "./billing-cycle";

describe("resolveRetainerAmountCents", () => {
  it("nutzt monthly_retainer_cents für 500 €/Monat", () => {
    expect(
      resolveRetainerAmountCents({
        monthly_retainer_cents: 50_000,
        monthly_revenue_cents: null,
      }),
    ).toBe(50_000);
  });
});

describe("getBillingPeriodForDate", () => {
  it("ordnet Juli 2026 der Periode 2026-07 zu", () => {
    expect(getBillingPeriodForDate(new Date("2026-07-15T12:00:00"), "monthly")).toEqual({
      year: 2026,
      month: 7,
    });
  });
});

describe("advanceBillingDate", () => {
  it("erhöht next_invoice_date monatlich um 1 Monat", () => {
    const current = new Date("2026-07-01T12:00:00");
    const next = advanceBillingDate(current, "monthly");
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(7);
  });

  it("erhöht next_invoice_date vierteljährlich um 3 Monate", () => {
    const current = new Date("2026-04-01T12:00:00");
    const next = advanceBillingDate(current, "quarterly");
    expect(next.getMonth()).toBe(6);
  });

  it("erhöht next_invoice_date jährlich um 12 Monate", () => {
    const current = new Date("2026-03-01T12:00:00");
    const next = advanceBillingDate(current, "yearly");
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(2);
  });
});
