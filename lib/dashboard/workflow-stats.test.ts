import { describe, expect, it } from "vitest";
import { computeWorkflowDashboardStats } from "./workflow-stats";
import type { InvoiceRecord } from "./types";

function invoice(
  overrides: Partial<InvoiceRecord> & Pick<InvoiceRecord, "status">,
): InvoiceRecord {
  return {
    id: "inv-1",
    client_id: "client-max",
    invoice_number: "RE-2026-000001",
    amount_cents: 10000,
    created_at: "2026-01-01T00:00:00.000Z",
    due_date: null,
    invoice_type: "setup",
    billing_period_year: null,
    billing_period_month: null,
    subtotal_cents: 10000,
    tax_amount_cents: 1900,
    total_amount_cents: 11900,
    vat_rate: 19,
    contract_id: null,
    created_by: null,
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const activeClient = {
  id: "client-max",
  company_name: "Max",
  contract_status: "active",
  contract_start_date: "2026-06-01",
  setup_fee_cents: 500_000,
  monthly_retainer_cents: null,
  monthly_revenue_cents: null,
  lead_estimated_value_cents: 500_000,
};

describe("computeWorkflowDashboardStats activeCustomers", () => {
  it("counts customers with commission_paid as active", () => {
    const stats = computeWorkflowDashboardStats({
      leads: [],
      clients: [activeClient],
      invoices: [invoice({ status: "paid", client_id: "client-max" })],
      entriesByClient: new Map([
        [
          "client-max",
          {
            id: "entry-1",
            client_id: "client-max",
            client_name: "Max",
            setter_id: "setter-1",
            setter_name: "Setter",
            closer_id: "closer-1",
            closer_name: "Closer",
            project_value_cents: 500_000,
            setter_rate: 10,
            closer_rate: 10,
            setter_commission_cents: 50_000,
            closer_commission_cents: 50_000,
            status: "paid",
            deal_type: "split",
            triggered_by_invoice_id: "inv-1",
            created_at: "2026-06-01",
            updated_at: "2026-06-01",
            paid_at: "2026-06-02",
          },
        ],
      ]),
    });

    expect(stats.activeCustomers).toBe(1);
  });

  it("does not count customers without contract or unpaid invoices", () => {
    const stats = computeWorkflowDashboardStats({
      leads: [],
      clients: [
        {
          ...activeClient,
          id: "client-draft",
          contract_status: "draft",
          contract_start_date: null,
        },
        {
          ...activeClient,
          id: "client-unpaid",
        },
      ],
      invoices: [invoice({ status: "sent", client_id: "client-unpaid" })],
    });

    expect(stats.activeCustomers).toBe(0);
  });
});
