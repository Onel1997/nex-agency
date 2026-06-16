import { describe, expect, it } from "vitest";
import {
  buildPayoutCenterKpis,
  buildPayoutCenterLines,
  computePayoutCenterStats,
  computePayoutInvoiceMetrics,
  derivePayoutLineStatus,
} from "./payout-center";
import type { CommissionEntryRecord } from "./types";

describe("derivePayoutLineStatus", () => {
  it("returns null for cancelled entries", () => {
    expect(
      derivePayoutLineStatus({
        entryStatus: "cancelled",
        rolePaid: false,
        hasInvoice: false,
      }),
    ).toBeNull();
  });

  it("returns offen when pending and role not paid", () => {
    expect(
      derivePayoutLineStatus({
        entryStatus: "pending",
        rolePaid: false,
        hasInvoice: false,
      }),
    ).toBe("offen");
  });

  it("returns freigegeben when approved and role not paid", () => {
    expect(
      derivePayoutLineStatus({
        entryStatus: "approved",
        rolePaid: false,
        hasInvoice: false,
      }),
    ).toBe("freigegeben");
  });

  it("returns ausgezahlt when role paid without invoice", () => {
    expect(
      derivePayoutLineStatus({
        entryStatus: "approved",
        rolePaid: true,
        hasInvoice: false,
      }),
    ).toBe("ausgezahlt");
  });

  it("returns abgeschlossen when role paid with invoice", () => {
    expect(
      derivePayoutLineStatus({
        entryStatus: "paid",
        rolePaid: true,
        hasInvoice: true,
      }),
    ).toBe("abgeschlossen");
  });
});

function baseEntry(
  overrides: Partial<CommissionEntryRecord> = {},
): CommissionEntryRecord {
  return {
    id: "entry-1",
    client_id: "client-1",
    client_name: "Ralf GmbH",
    setter_id: "profile-setter",
    setter_name: "Max Setter",
    closer_id: null,
    closer_name: null,
    project_value_cents: 225000,
    setter_rate: 10,
    closer_rate: 0,
    setter_commission_cents: 22500,
    closer_commission_cents: 0,
    status: "pending",
    entry_type: "retainer",
    deal_type: null,
    triggered_by_invoice_id: "invoice-1",
    billing_period_year: 2026,
    billing_period_month: 6,
    allowed_retainer_months: 3,
    contract_start_date: null,
    monthly_retainer_cents: null,
    created_at: "2026-06-01T10:00:00.000Z",
    updated_at: "2026-06-01T10:00:00.000Z",
    paid_at: null,
    ...overrides,
  };
}

describe("buildPayoutCenterLines", () => {
  it("builds offen line for pending setter commission", () => {
    const lines = buildPayoutCenterLines({
      entries: [baseEntry()],
      payouts: [],
      invoices: [],
      triggeredInvoiceNumbers: new Map([["invoice-1", "RE-2026-000001"]]),
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.derivedStatus).toBe("offen");
    expect(lines[0]?.profileName).toBe("Max Setter");
    expect(lines[0]?.triggeredInvoiceNumber).toBe("RE-2026-000001");
  });

  it("builds abgeschlossen line when payout and invoice exist", () => {
    const lines = buildPayoutCenterLines({
      entries: [baseEntry({ status: "paid", paid_at: "2026-06-15T12:00:00.000Z" })],
      payouts: [
        {
          id: "payout-1",
          commission_entry_id: "entry-1",
          profile_id: "profile-setter",
          amount_cents: 22500,
          paid_at: "2026-06-15T12:00:00.000Z",
        },
      ],
      invoices: [
        {
          id: "invoice-fr-1",
          commission_payout_id: "payout-1",
          invoice_number: "FR-2026-000001",
          pdf_url: "commission/invoice-fr-1/FR-2026-000001.pdf",
          status: "completed",
          amount_cents: 22500,
        },
      ],
      triggeredInvoiceNumbers: new Map(),
    });

    expect(lines[0]?.derivedStatus).toBe("abgeschlossen");
    expect(lines[0]?.invoiceNumber).toBe("FR-2026-000001");
    expect(lines[0]?.amountCents).toBe(22500);
  });
});

describe("computePayoutCenterStats", () => {
  it("sums line amounts by derived_status", () => {
    const lines = buildPayoutCenterLines({
      entries: [
        baseEntry(),
        baseEntry({
          id: "entry-2",
          setter_id: null,
          setter_name: null,
          setter_commission_cents: 0,
          setter_rate: 0,
          status: "approved",
          closer_id: "profile-closer",
          closer_name: "Onel Closer",
          closer_commission_cents: 125000,
          closer_rate: 10,
        }),
      ],
      payouts: [],
      invoices: [],
      triggeredInvoiceNumbers: new Map(),
    });

    const stats = computePayoutCenterStats(lines);
    expect(stats.offenCents).toBe(22500);
    expect(stats.freigegebenCents).toBe(125000);
    expect(stats.ausgezahltCents).toBe(0);
    expect(stats.abgeschlossenCents).toBe(0);
  });
});

describe("computePayoutInvoiceMetrics", () => {
  it("counts invoices and sums amount_cents", () => {
    const metrics = computePayoutInvoiceMetrics([
      { amount_cents: 90000 },
      { amount_cents: 125000 },
    ]);

    expect(metrics.freelancerInvoiceCount).toBe(2);
    expect(metrics.freelancerCostsCents).toBe(215000);
  });
});

describe("buildPayoutCenterKpis", () => {
  it("matches payout-center stats and invoice metrics combined", () => {
    const lines = buildPayoutCenterLines({
      entries: [baseEntry({ status: "paid", paid_at: "2026-06-15T12:00:00.000Z" })],
      payouts: [
        {
          id: "payout-1",
          commission_entry_id: "entry-1",
          profile_id: "profile-setter",
          amount_cents: 22500,
          paid_at: "2026-06-15T12:00:00.000Z",
        },
      ],
      invoices: [
        {
          id: "invoice-fr-1",
          commission_payout_id: "payout-1",
          invoice_number: "FR-2026-000001",
          pdf_url: null,
          status: "completed",
          amount_cents: 22500,
        },
      ],
      triggeredInvoiceNumbers: new Map(),
    });

    const invoices = [{ amount_cents: 22500 }];
    const kpis = buildPayoutCenterKpis({ lines, invoices });

    expect(kpis).toEqual({
      ...computePayoutCenterStats(lines),
      ...computePayoutInvoiceMetrics(invoices),
    });
    expect(kpis.abgeschlossenCents).toBe(22500);
    expect(kpis.freelancerInvoiceCount).toBe(1);
    expect(kpis.freelancerCostsCents).toBe(22500);
  });
});
