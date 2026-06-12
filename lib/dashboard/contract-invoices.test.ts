import { describe, expect, it } from "vitest";
import {
  filterContractInvoicesForClient,
  filterInvoicesForClient,
  getContractRetainerCents,
  getContractSubtotalCents,
  getSetupFeeCents,
  hasActiveContract,
} from "./contract-invoices";
import type { ClientDetailRecord, InvoiceRecord } from "./types";

function invoice(
  id: string,
  clientId: string,
  contractId: string | null = null,
): InvoiceRecord {
  return {
    id,
    client_id: clientId,
    contract_id: contractId,
    invoice_number: `RE-2026-${id}`,
    amount_cents: 11900,
    subtotal_cents: 10000,
    tax_amount_cents: 1900,
    total_amount_cents: 11900,
    vat_rate: 19,
    status: "draft",
    created_by: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    due_date: null,
  };
}

const nicklasId = "11111111-1111-1111-1111-111111111111";
const pabloId = "22222222-2222-2222-2222-222222222222";

const allInvoices = [
  invoice("001", nicklasId, nicklasId),
  invoice("002", nicklasId, null),
  invoice("003", pabloId, pabloId),
  invoice("004", pabloId, null),
];

describe("filterInvoicesForClient", () => {
  it("Nicklas sieht nur Nicklas-Rechnungen", () => {
    const result = filterInvoicesForClient(allInvoices, nicklasId);
    expect(result.map((row) => row.id)).toEqual(["001", "002"]);
  });

  it("Pablo sieht nur Pablo-Rechnungen", () => {
    const result = filterInvoicesForClient(allInvoices, pabloId);
    expect(result.map((row) => row.id)).toEqual(["003", "004"]);
  });

  it("globale Liste bleibt ungefiltert", () => {
    expect(allInvoices).toHaveLength(4);
  });
});

function contractClient(
  overrides: Partial<
    Pick<
      ClientDetailRecord,
      | "contract_start_date"
      | "contract_status"
      | "lead_estimated_value_cents"
      | "setup_fee_cents"
      | "monthly_retainer_cents"
      | "monthly_revenue_cents"
    >
  > = {},
) {
  return {
    contract_start_date: "2026-05-01",
    contract_status: "active" as const,
    lead_estimated_value_cents: 500_000,
    setup_fee_cents: 450_000,
    monthly_retainer_cents: null,
    monthly_revenue_cents: null,
    ...overrides,
  };
}

describe("getSetupFeeCents", () => {
  it("liefert nur die Setup-Gebühr", () => {
    expect(getSetupFeeCents(contractClient())).toBe(450_000);
  });

  it("ignoriert Retainer-Beträge", () => {
    expect(
      getSetupFeeCents(
        contractClient({ setup_fee_cents: null, monthly_revenue_cents: 120_000 }),
      ),
    ).toBeNull();
  });
});

describe("getContractRetainerCents", () => {
  it("bevorzugt monthly_revenue_cents", () => {
    expect(
      getContractRetainerCents(
        contractClient({
          setup_fee_cents: 450_000,
          monthly_revenue_cents: 10_000,
          monthly_retainer_cents: 5_000,
        }),
      ),
    ).toBe(10_000);
  });
});

describe("getContractSubtotalCents", () => {
  it("priorisiert setup_fee_cents vor Lead-Schätzung (Pablo-Fall)", () => {
    expect(getContractSubtotalCents(contractClient())).toBe(450_000);
  });

  it("nutzt Retainer wenn keine Setup-Gebühr gesetzt ist", () => {
    expect(
      getContractSubtotalCents(
        contractClient({ setup_fee_cents: null, monthly_revenue_cents: 120_000 }),
      ),
    ).toBe(120_000);
  });

  it("nutzt lead_estimated_value_cents nur als Fallback", () => {
    expect(
      getContractSubtotalCents(
        contractClient({
          setup_fee_cents: null,
          monthly_retainer_cents: null,
          monthly_revenue_cents: null,
          lead_estimated_value_cents: 500_000,
        }),
      ),
    ).toBe(500_000);
  });
});

describe("hasActiveContract", () => {
  it("erkennt Vertrag mit Setup-Gebühr", () => {
    expect(hasActiveContract(contractClient())).toBe(true);
  });

  it("erkennt Retainer-Vertrag ohne Setup", () => {
    expect(
      hasActiveContract(
        contractClient({
          setup_fee_cents: null,
          monthly_revenue_cents: 1_000,
        }),
      ),
    ).toBe(true);
  });
});

describe("filterContractInvoicesForClient", () => {
  it("filtert Vertragsrechnungen strikt nach client_id", () => {
    const result = filterContractInvoicesForClient(allInvoices, {
      clientId: nicklasId,
    });
    expect(result.map((row) => row.id)).toEqual(["001", "002"]);
    expect(result.every((row) => row.client_id === nicklasId)).toBe(true);
  });

  it("filtert bei aktivem Vertrag zusätzlich nach contract_id", () => {
    const result = filterContractInvoicesForClient(allInvoices, {
      clientId: nicklasId,
      contractId: nicklasId,
    });
    expect(result.map((row) => row.id)).toEqual(["001"]);
  });

  it("zeigt keine Rechnungen anderer Kunden im Verträge-Tab", () => {
    const result = filterContractInvoicesForClient(allInvoices, {
      clientId: pabloId,
      contractId: pabloId,
    });
    expect(result.map((row) => row.id)).toEqual(["003"]);
    expect(result.some((row) => row.client_id === nicklasId)).toBe(false);
  });
});
