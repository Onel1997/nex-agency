import { describe, expect, it } from "vitest";
import { mapResolvedCommissionEntryRow } from "./commission-entry-attribution";

describe("mapResolvedCommissionEntryRow", () => {
  it("resolves owner full-cycle commission entry attribution for display", () => {
    const entry = mapResolvedCommissionEntryRow({
      id: "entry-1",
      client_id: "client-1",
      setter_id: null,
      closer_id: "owner-1",
      project_value_cents: 100_000,
      setter_rate: 0,
      closer_rate: 20,
      setter_commission_cents: 0,
      closer_commission_cents: 20_000,
      status: "pending",
      triggered_by_invoice_id: "invoice-1",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      paid_at: null,
      client: {
        company_name: "Acme GmbH",
        lead: { owner_id: "owner-1" },
      },
      setter: null,
      closer: {
        full_name: "Onel",
        email: "onel@example.com",
        agency_role: "owner",
      },
    });

    expect(entry.setter_id).toBe("owner-1");
    expect(entry.closer_id).toBe("owner-1");
    expect(entry.setter_name).toBe("Onel");
    expect(entry.closer_name).toBe("Onel");
    expect(entry.deal_type).toBe("owner_full_cycle");
  });

  it("falls back to acquired_by when setter profile join is unavailable", () => {
    const entry = mapResolvedCommissionEntryRow({
      id: "entry-2",
      client_id: "client-1",
      setter_id: "setter-1",
      closer_id: "closer-1",
      project_value_cents: 100_000,
      setter_rate: 20,
      closer_rate: 20,
      setter_commission_cents: 20_000,
      closer_commission_cents: 20_000,
      status: "pending",
      triggered_by_invoice_id: "invoice-1",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      paid_at: null,
      client: {
        company_name: "Acme GmbH",
        acquired_by: "Onel Test Setter",
        lead: { owner_id: "setter-1", created_by: "setter-1" },
      },
      setter: null,
      closer: {
        full_name: "Ben Closer",
        email: "ben@example.com",
        agency_role: "closer",
      },
    });

    expect(entry.setter_id).toBe("setter-1");
    expect(entry.setter_name).toBe("Onel Test Setter");
    expect(entry.closer_name).toBe("Ben Closer");
  });
});
