import { describe, expect, it } from "vitest";
import { buildPlannedRetainerMonths } from "./retainer-commission-plan";
import type { CommissionEntryRecord } from "./types";

function makeEntry(
  overrides: Partial<CommissionEntryRecord> & Pick<CommissionEntryRecord, "id" | "client_id">,
): CommissionEntryRecord {
  return {
    client_name: "Ralf",
    setter_id: "setter-1",
    setter_name: "Setter",
    closer_id: "closer-1",
    closer_name: "Closer",
    project_value_cents: 150_000,
    setter_rate: 10,
    closer_rate: 15,
    setter_commission_cents: 15_000,
    closer_commission_cents: 22_500,
    status: "paid",
    entry_type: "retainer",
    deal_type: "setter_closer",
    triggered_by_invoice_id: `invoice-${overrides.id}`,
    billing_period_year: 2026,
    billing_period_month: 6,
    allowed_retainer_months: 3,
    contract_start_date: "2026-06-01",
    monthly_retainer_cents: 150_000,
    created_at: "2026-06-15T18:40:47.714926+00:00",
    updated_at: "2026-06-15T18:40:47.714926+00:00",
    paid_at: null,
    ...overrides,
  };
}

describe("buildPlannedRetainerMonths", () => {
  it("shows all planned months up to the configured limit", () => {
    const rows = buildPlannedRetainerMonths({
      contractStartDate: "2026-06-01",
      allowedMonths: 3,
      entries: [
        makeEntry({
          id: "entry-1",
          client_id: "client-1",
          billing_period_month: 6,
          status: "paid",
        }),
      ],
    });

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.billing_period_month)).toEqual([6, 7, 8]);
    expect(rows[0]).toMatchObject({
      status: "paid",
      setter_commission_cents: 15_000,
      closer_commission_cents: 22_500,
      isPlanned: false,
    });
    expect(rows[1]).toMatchObject({
      status: "pending",
      setter_commission_cents: 15_000,
      closer_commission_cents: 22_500,
      isPlanned: true,
      entry: null,
    });
    expect(rows[2].isPlanned).toBe(true);
  });

  it("does not include months beyond the configured limit", () => {
    const rows = buildPlannedRetainerMonths({
      contractStartDate: "2026-06-01",
      allowedMonths: 3,
      entries: [
        makeEntry({
          id: "entry-4",
          client_id: "client-1",
          billing_period_month: 9,
          status: "paid",
        }),
      ],
    });

    expect(rows).toHaveLength(3);
    expect(rows.some((row) => row.billing_period_month === 9)).toBe(false);
  });
});
