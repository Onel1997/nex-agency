import { describe, expect, it } from "vitest";
import {
  buildRetainerPeriodViews,
  formatRetainerPeriodStatus,
  getNextOpenRetainerPeriod,
} from "./retainer";

describe("retainer period mapping", () => {
  const referenceDate = new Date("2026-06-12T12:00:00");
  const maxRetainerInvoices = [
    {
      billing_period_year: 2026,
      billing_period_month: 5,
      status: "paid",
      invoice_type: "retainer",
    },
    {
      billing_period_year: 2026,
      billing_period_month: 6,
      status: "draft",
      invoice_type: "retainer",
    },
  ];

  it("derives Max period status from invoices only", () => {
    const periods = buildRetainerPeriodViews(
      "2026-05-01",
      1000,
      maxRetainerInvoices,
      referenceDate,
    );

    expect(periods).toHaveLength(3);
    expect(periods[0]).toMatchObject({
      period_year: 2026,
      period_month: 5,
      status: "paid",
      isUpcoming: false,
    });
    expect(periods[1]).toMatchObject({
      period_year: 2026,
      period_month: 6,
      status: "invoice_created",
      isUpcoming: false,
    });
    expect(periods[2]).toMatchObject({
      period_year: 2026,
      period_month: 7,
      status: "upcoming",
      isUpcoming: true,
    });

    expect(formatRetainerPeriodStatus(periods[0].status)).toBe("Bezahlt");
    expect(formatRetainerPeriodStatus(periods[1].status)).toBe("Rechnung erstellt");
    expect(formatRetainerPeriodStatus(periods[2].status)).toBe("Bevorstehend");
  });

  it("returns June 2026 as next open period for Max", () => {
    const periods = buildRetainerPeriodViews(
      "2026-05-01",
      1000,
      maxRetainerInvoices,
      referenceDate,
    );

    const nextOpen = getNextOpenRetainerPeriod(periods);
    expect(nextOpen).toMatchObject({
      period_year: 2026,
      period_month: 6,
      status: "invoice_created",
    });
  });

  it("ignores orphan paid payment rows when only invoices are passed", () => {
    const periods = buildRetainerPeriodViews(
      "2026-05-01",
      1000,
      maxRetainerInvoices,
      referenceDate,
    );

    expect(periods.some((period) => period.period_month === 6 && period.status === "paid")).toBe(
      false,
    );
  });
});
