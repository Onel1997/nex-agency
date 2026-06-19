import { describe, expect, it } from "vitest";
import {
  collectRetainerPlanEntriesByStatus,
  formatRetainerProgressLabel,
  groupCommissionEntriesForCenter,
  resolveGroupDisplayStatus,
} from "./commission-center-groups";
import { buildPlannedRetainerMonths } from "./retainer-commission-plan";
import type { CommissionEntryRecord } from "./types";

function makeEntry(
  overrides: Partial<CommissionEntryRecord> & Pick<CommissionEntryRecord, "id" | "client_id">,
): CommissionEntryRecord {
  return {
    client_name: "Test GmbH",
    setter_id: "setter-1",
    setter_name: "Setter",
    closer_id: "closer-1",
    closer_name: "Closer",
    project_value_cents: 150_000,
    setter_rate: 10,
    closer_rate: 15,
    setter_commission_cents: 15_000,
    closer_commission_cents: 22_500,
    status: "pending",
    entry_type: "retainer",
    deal_type: "setter_closer",
    triggered_by_invoice_id: `invoice-${overrides.id}`,
    billing_period_year: 2026,
    billing_period_month: 7,
    allowed_retainer_months: 3,
    contract_start_date: "2026-06-01",
    monthly_retainer_cents: 150_000,
    created_at: "2026-06-15T18:40:47.714926+00:00",
    updated_at: "2026-06-15T18:40:47.714926+00:00",
    paid_at: null,
    ...overrides,
  };
}

describe("groupCommissionEntriesForCenter", () => {
  it("groups retainer entries by client into one expandable row", () => {
    const groups = groupCommissionEntriesForCenter([
      makeEntry({
        id: "entry-1",
        client_id: "client-1",
        billing_period_month: 6,
      }),
      makeEntry({
        id: "entry-2",
        client_id: "client-1",
        billing_period_month: 7,
        created_at: "2026-06-15T18:40:48.27604+00:00",
      }),
      makeEntry({
        id: "entry-3",
        client_id: "client-1",
        billing_period_month: 8,
        status: "paid",
        created_at: "2026-06-15T18:40:48.883706+00:00",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].entry_type).toBe("retainer");
    expect(groups[0].displayStatus).toEqual({
      label: "Teilweise ausgezahlt",
      detail: "2 offen / 1 bezahlt",
      variant: "partial",
    });
    expect(groups[0].retainerProgress).toEqual({
      primary: "3 von 3 Provisionsmonaten abgerechnet",
      secondary: "Provisionslimit erreicht",
    });
    expect(groups[0].plannedMonths).toHaveLength(3);
    expect(groups[0].plannedMonths.map((row) => row.billing_period_month)).toEqual([
      6, 7, 8,
    ]);
    expect(groups[0].plannedMonths[2]?.isPlanned).toBe(false);
    expect(groups[0].plannedMonths[0]?.isPlanned).toBe(false);
    expect(groups[0].expandable).toBe(true);
  });

  it("keeps setup entries as separate compact rows", () => {
    const groups = groupCommissionEntriesForCenter([
      makeEntry({
        id: "setup-1",
        client_id: "client-1",
        entry_type: "setup",
        billing_period_year: null,
        billing_period_month: null,
      }),
      makeEntry({
        id: "retainer-1",
        client_id: "client-1",
        billing_period_month: 6,
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.entry_type === "setup")?.expandable).toBe(
      false,
    );
    expect(groups.find((group) => group.entry_type === "retainer")?.expandable).toBe(
      true,
    );
  });

  it("keeps retainer accordion available even with a single billed month", () => {
    const singleMonth = groupCommissionEntriesForCenter([
      makeEntry({ id: "entry-1", client_id: "client-1", billing_period_month: 6 }),
    ]);
    const multiMonth = groupCommissionEntriesForCenter([
      makeEntry({ id: "entry-1", client_id: "client-1", billing_period_month: 6 }),
      makeEntry({
        id: "entry-2",
        client_id: "client-1",
        billing_period_month: 7,
        created_at: "2026-06-15T18:40:48.27604+00:00",
      }),
    ]);

    expect(singleMonth[0]?.expandable).toBe(true);
    expect(multiMonth[0]?.expandable).toBe(true);
  });
});

describe("resolveGroupDisplayStatus", () => {
  it("shows bezahlt when all retainer months are paid", () => {
    const status = resolveGroupDisplayStatus({
      entry_type: "retainer",
      entries: [
        makeEntry({
          id: "entry-1",
          client_id: "client-1",
          status: "paid",
        }),
        makeEntry({
          id: "entry-2",
          client_id: "client-1",
          status: "paid",
          billing_period_month: 8,
        }),
      ],
      openEntryCount: 0,
      paidEntryCount: 2,
      retainerMonthCount: 2,
      allowedRetainerMonths: 3,
    });

    expect(status).toEqual({
      label: "Bezahlt",
      detail: null,
      variant: "paid",
    });
  });

  it("shows active status when one retainer month is paid and limit not reached", () => {
    const status = resolveGroupDisplayStatus({
      entry_type: "retainer",
      entries: [
        makeEntry({
          id: "entry-1",
          client_id: "client-1",
          status: "paid",
        }),
      ],
      openEntryCount: 0,
      paidEntryCount: 1,
      retainerMonthCount: 1,
      allowedRetainerMonths: 3,
    });

    expect(status).toEqual({
      label: "Bezahlt",
      detail: null,
      variant: "paid",
    });
  });
});

describe("formatRetainerProgressLabel", () => {
  it("shows limit reached when all months are billed", () => {
    expect(formatRetainerProgressLabel(3, 3)).toEqual({
      primary: "3 von 3 Provisionsmonaten abgerechnet",
      secondary: "Provisionslimit erreicht",
    });
  });

  it("shows billed months below the limit", () => {
    expect(formatRetainerProgressLabel(1, 3)).toEqual({
      primary: "1 von 3 Provisionsmonaten abgerechnet",
      secondary: null,
    });
  });
});

describe("collectRetainerPlanEntriesByStatus", () => {
  it("returns only plan rows with linked commission entries", () => {
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
        makeEntry({
          id: "entry-2",
          client_id: "client-1",
          billing_period_month: 7,
          status: "pending",
        }),
      ],
    });

    expect(collectRetainerPlanEntriesByStatus(rows, "pending")).toHaveLength(1);
    expect(collectRetainerPlanEntriesByStatus(rows, "pending")[0]?.id).toBe(
      "entry-2",
    );
  });
});
