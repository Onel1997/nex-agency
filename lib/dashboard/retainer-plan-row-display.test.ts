import { describe, expect, it } from "vitest";
import {
  partitionRetainerPlanRows,
  resolveRetainerPlanRowDisplay,
} from "./retainer-plan-row-display";
import type { RetainerMonthPlanRow } from "./types";

function makeRow(
  overrides: Partial<RetainerMonthPlanRow> & Pick<RetainerMonthPlanRow, "id">,
): RetainerMonthPlanRow {
  return {
    billing_period_year: 2026,
    billing_period_month: 7,
    setter_commission_cents: 15_000,
    closer_commission_cents: 22_500,
    status: "pending",
    entry: null,
    isPlanned: true,
    ...overrides,
  };
}

describe("resolveRetainerPlanRowDisplay", () => {
  it("marks planned months without invoice as geplant", () => {
    const display = resolveRetainerPlanRowDisplay(
      makeRow({ id: "planned-2026-07", billing_period_month: 7 }),
      [],
    );

    expect(display).toMatchObject({
      group: "planned",
      statusLabel: "Geplant",
      actionLabel: "Rechnung noch nicht erstellt",
      showCommissionAmounts: false,
      canApprove: false,
    });
  });

  it("shows invoice number when invoice exists without commission entry", () => {
    const display = resolveRetainerPlanRowDisplay(
      makeRow({ id: "planned-2026-07", billing_period_month: 7 }),
      [
        {
          billing_period_year: 2026,
          billing_period_month: 7,
          status: "draft",
          invoice_type: "retainer",
          invoice_number: "RE-2026-000026",
        },
      ],
    );

    expect(display).toMatchObject({
      group: "billed",
      statusLabel: "Rechnung erstellt",
      actionLabel: "Zahlung ausstehend",
      invoiceNumber: "RE-2026-000026",
      canApprove: false,
    });
  });

  it("hides invoice numbers for planned months", () => {
    const display = resolveRetainerPlanRowDisplay(
      makeRow({ id: "planned-2026-07", billing_period_month: 7 }),
      [],
    );

    expect(display.group).toBe("planned");
    expect(display.invoiceNumber).toBeNull();
    expect(display.statusLabel).toBe("Geplant");
    expect(display.actionLabel).toBe("Rechnung noch nicht erstellt");
  });

  it("matches the Ralf retainer overview scenario", () => {
    const june = resolveRetainerPlanRowDisplay(
      makeRow({
        id: "entry-june",
        billing_period_month: 6,
        isPlanned: false,
        entry: { id: "entry-june", status: "paid" } as RetainerMonthPlanRow["entry"],
      }),
      [
        {
          billing_period_year: 2026,
          billing_period_month: 6,
          status: "paid",
          invoice_type: "retainer",
          invoice_number: "RE-2026-000021",
        },
      ],
    );
    const july = resolveRetainerPlanRowDisplay(
      makeRow({ id: "planned-2026-07", billing_period_month: 7 }),
      [],
    );

    expect(june).toMatchObject({
      group: "billed",
      statusLabel: "Bezahlt",
      invoiceNumber: "RE-2026-000021",
    });
    expect(july).toMatchObject({
      group: "planned",
      statusLabel: "Geplant",
      invoiceNumber: null,
      actionLabel: "Rechnung noch nicht erstellt",
    });
  });

  it("allows approve only for pending commission entries", () => {
    const display = resolveRetainerPlanRowDisplay(
      makeRow({
        id: "entry-1",
        billing_period_month: 6,
        isPlanned: false,
        entry: {
          id: "entry-1",
          status: "pending",
        } as RetainerMonthPlanRow["entry"],
      }),
      [
        {
          billing_period_year: 2026,
          billing_period_month: 6,
          status: "paid",
          invoice_type: "retainer",
          invoice_number: "RE-2026-000021",
        },
      ],
    );

    expect(display).toMatchObject({
      statusLabel: "Offen",
      actionLabel: "Freigeben",
      canApprove: true,
      invoiceNumber: "RE-2026-000021",
    });
  });
});

describe("partitionRetainerPlanRows", () => {
  it("groups billed and planned rows", () => {
    const rows = [
      makeRow({
        id: "entry-paid",
        billing_period_month: 6,
        isPlanned: false,
        entry: { id: "entry-paid", status: "paid" } as RetainerMonthPlanRow["entry"],
      }),
      makeRow({ id: "planned-2026-07", billing_period_month: 7 }),
      makeRow({ id: "planned-2026-08", billing_period_month: 8 }),
    ];

    const { billedRows, plannedRows } = partitionRetainerPlanRows(rows, [
      {
        billing_period_year: 2026,
        billing_period_month: 6,
        status: "paid",
        invoice_type: "retainer",
        invoice_number: "RE-2026-000021",
      },
    ]);

    expect(billedRows).toHaveLength(1);
    expect(plannedRows).toHaveLength(2);
  });

  it("matches the E2E retainer customer with all months billed", () => {
    const rows = [
      makeRow({
        id: "entry-6",
        billing_period_month: 6,
        isPlanned: false,
        entry: { id: "entry-6", status: "paid" } as RetainerMonthPlanRow["entry"],
      }),
      makeRow({
        id: "entry-7",
        billing_period_month: 7,
        isPlanned: false,
        entry: { id: "entry-7", status: "paid" } as RetainerMonthPlanRow["entry"],
      }),
      makeRow({
        id: "entry-8",
        billing_period_month: 8,
        isPlanned: false,
        entry: { id: "entry-8", status: "paid" } as RetainerMonthPlanRow["entry"],
      }),
    ];

    const { billedRows, plannedRows } = partitionRetainerPlanRows(rows, [
      {
        billing_period_year: 2026,
        billing_period_month: 6,
        status: "paid",
        invoice_type: "retainer",
        invoice_number: "RE-2026-000021",
      },
      {
        billing_period_year: 2026,
        billing_period_month: 7,
        status: "paid",
        invoice_type: "retainer",
        invoice_number: "RE-2026-000026",
      },
      {
        billing_period_year: 2026,
        billing_period_month: 8,
        status: "paid",
        invoice_type: "retainer",
        invoice_number: "RE-2026-000031",
      },
    ]);

    expect(billedRows).toHaveLength(3);
    expect(plannedRows).toHaveLength(0);
    expect(
      resolveRetainerPlanRowDisplay(billedRows[0]!, [
        {
          billing_period_year: 2026,
          billing_period_month: 6,
          status: "paid",
          invoice_type: "retainer",
          invoice_number: "RE-2026-000021",
        },
      ]).statusLabel,
    ).toBe("Bezahlt");
  });
});
