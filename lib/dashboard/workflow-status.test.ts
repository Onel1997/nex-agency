import { describe, expect, it } from "vitest";
import {
  resolveCustomerWorkflowStatus,
  resolveLeadWorkflowStatus,
} from "./workflow-status";
import type { InvoiceRecord } from "./types";

function invoice(
  overrides: Partial<InvoiceRecord> & Pick<InvoiceRecord, "status">,
): InvoiceRecord {
  return {
    id: "inv-1",
    client_id: "client-1",
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
    company_name: null,
    customer_number: null,
    ...overrides,
  };
}

describe("resolveLeadWorkflowStatus", () => {
  it("maps pipeline stages to workflow stages", () => {
    expect(resolveLeadWorkflowStatus({ status: "new", converted_to_client: false })).toEqual({
      stage: "new",
      urgency: "waiting",
    });
    expect(
      resolveLeadWorkflowStatus({ status: "contacted", converted_to_client: false }),
    ).toEqual({
      stage: "contacted",
      urgency: "waiting",
    });
    expect(
      resolveLeadWorkflowStatus({
        status: "scheduled",
        converted_to_client: false,
        closer_id: null,
      }),
    ).toEqual({
      stage: "open_for_closer",
      urgency: "action",
    });
    expect(
      resolveLeadWorkflowStatus({
        status: "scheduled",
        converted_to_client: false,
        closer_id: "closer-a",
      }),
    ).toEqual({
      stage: "scheduled",
      urgency: "action",
    });
    expect(
      resolveLeadWorkflowStatus({ status: "qualified", converted_to_client: false }),
    ).toEqual({
      stage: "qualified",
      urgency: "action",
    });
    expect(
      resolveLeadWorkflowStatus({ status: "proposal", converted_to_client: false }),
    ).toEqual({
      stage: "offer",
      urgency: "action",
    });
  });

  it("flags unconverted won leads as urgent", () => {
    expect(resolveLeadWorkflowStatus({ status: "won", converted_to_client: false })).toEqual({
      stage: "won",
      urgency: "urgent",
    });
    expect(resolveLeadWorkflowStatus({ status: "won", converted_to_client: true })).toEqual({
      stage: "won",
      urgency: "completed",
    });
  });
});

describe("resolveCustomerWorkflowStatus", () => {
  const client = {
    id: "client-1",
    contract_status: "active" as const,
    contract_start_date: "2026-01-01",
    setup_fee_cents: 50000,
    monthly_retainer_cents: 0,
    monthly_revenue_cents: 0,
    lead_estimated_value_cents: 50000,
  };

  it("detects missing contract", () => {
    expect(
      resolveCustomerWorkflowStatus(
        { ...client, contract_status: "draft", contract_start_date: null },
        [],
      ).stage,
    ).toBe("won_no_contract");
  });

  it("detects contract without invoice", () => {
    expect(resolveCustomerWorkflowStatus(client, []).stage).toBe("contract_no_invoice");
  });

  it("detects unpaid invoices", () => {
    expect(
      resolveCustomerWorkflowStatus(client, [invoice({ status: "sent" })]).stage,
    ).toBe("invoice_unpaid");
  });

  it("marks active paid customers as completed", () => {
    expect(
      resolveCustomerWorkflowStatus(client, [invoice({ status: "paid" })]),
    ).toEqual({
      stage: "active_paid",
      urgency: "completed",
    });
  });

  it("flags open setter commission after invoice is paid", () => {
    expect(
      resolveCustomerWorkflowStatus(
        client,
        [invoice({ status: "paid" })],
        {
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
          status: "pending",
          triggered_by_invoice_id: "inv-1",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          paid_at: null,
        },
        new Set(),
      ),
    ).toEqual({
      stage: "both_commissions_open",
      urgency: "action",
    });
  });

  it("shows commission approved badge from entry status only", () => {
    expect(
      resolveCustomerWorkflowStatus(
        client,
        [invoice({ status: "paid" })],
        {
          id: "entry-1",
          client_id: "client-1",
          client_name: "Acme",
          setter_id: "setter-1",
          setter_name: "Anna",
          closer_id: null,
          closer_name: null,
          project_value_cents: 100_000,
          setter_rate: 10,
          closer_rate: 0,
          setter_commission_cents: 10_000,
          closer_commission_cents: 0,
          status: "approved",
          triggered_by_invoice_id: "inv-1",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          paid_at: null,
        },
        new Set(),
      ).stage,
    ).toBe("commission_approved");
  });

  it("shows commission paid badge when entry is paid", () => {
    expect(
      resolveCustomerWorkflowStatus(
        client,
        [invoice({ status: "paid" })],
        {
          id: "entry-1",
          client_id: "client-1",
          client_name: "Acme",
          setter_id: "setter-1",
          setter_name: "Anna",
          closer_id: null,
          closer_name: null,
          project_value_cents: 100_000,
          setter_rate: 10,
          closer_rate: 0,
          setter_commission_cents: 10_000,
          closer_commission_cents: 0,
          status: "paid",
          triggered_by_invoice_id: "inv-1",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          paid_at: "2026-01-02",
        },
        new Set(),
      ).stage,
    ).toBe("commission_paid");
  });
});
