import { describe, expect, it } from "vitest";
import { sumCommissionFromClients } from "./profit";
import type { ClientRevenueRecord } from "./types";

function leonClientRecord(
  overrides: Partial<ClientRevenueRecord> = {},
): ClientRevenueRecord {
  return {
    id: "client-leon",
    company_name: "Leon",
    responsible_member_id: null,
    responsible_member_name: null,
    monthly_revenue_cents: 0,
    monthly_retainer_cents: null,
    setup_fee_cents: 500_000,
    contract_start_date: "2026-06-14",
    contract_status: "active",
    auto_invoice_enabled: false,
    total_revenue_cents: 500_000,
    setup_revenue_cents: 500_000,
    retainer_revenue_cents: 0,
    months_active: 1,
    months_paid: 0,
    months_open: 0,
    next_payment_due: null,
    outstanding_retainer_cents: 0,
    retainer_periods: [],
    retainer_invoices: [],
    commission_status: "paid",
    commission_cents: 200_000,
    commission_total_cents: 200_000,
    commission_paid_cents: 200_000,
    commission_outstanding_cents: 0,
    commission_payouts: [],
    commission_rate: 0,
    setter_id: "setter-1",
    setter_name: "Setter",
    setter_commission_rate: 20,
    closer_id: "closer-1",
    closer_name: "Closer",
    closer_commission_rate: 20,
    setter_commission_cents: 100_000,
    closer_commission_cents: 100_000,
    sales_agency_revenue_cents: 300_000,
    sales_deal_type: "setter_closer",
    commission_entry_id: "entry-leon",
    commission_entry_status: "paid",
    setter_commission_paid: true,
    closer_commission_paid: true,
    assigned_freelancer_id: null,
    assigned_freelancer_name: null,
    freelancer_commission_rate: 0,
    freelancer_payout_cents: 0,
    freelancer_paid_cents: 0,
    freelancer_outstanding_cents: 0,
    freelancer_payout_status: "none",
    agency_share_cents: 500_000,
    is_project_paid: true,
    freelancer_payouts: [],
    currency: "EUR",
    ...overrides,
  };
}

describe("sumCommissionFromClients", () => {
  it("uses setter and closer commission cents from commission entries", () => {
    expect(sumCommissionFromClients([leonClientRecord()], "total")).toBe(200_000);
  });

  it("ignores clients without commission entries", () => {
    expect(
      sumCommissionFromClients(
        [leonClientRecord({ commission_entry_id: null, commission_entry_status: null })],
        "total",
      ),
    ).toBe(0);
  });

  it("ignores cancelled commission entries", () => {
    expect(
      sumCommissionFromClients(
        [leonClientRecord({ commission_entry_status: "cancelled" })],
        "total",
      ),
    ).toBe(0);
  });
});
