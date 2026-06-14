import { describe, expect, it } from "vitest";
import {
  buildCommissionEntryFromClientRevenue,
  formatRoleCommissionStatusLabel,
  resolveRoleCommissionDisplayStatus,
} from "./commission-display";

describe("resolveRoleCommissionDisplayStatus", () => {
  it("maps commission entry statuses to role display statuses", () => {
    expect(resolveRoleCommissionDisplayStatus("pending", 10_000)).toBe("open");
    expect(resolveRoleCommissionDisplayStatus("approved", 10_000)).toBe("ready");
    expect(resolveRoleCommissionDisplayStatus("paid", 10_000)).toBe("paid");
    expect(resolveRoleCommissionDisplayStatus("cancelled", 10_000)).toBeNull();
    expect(resolveRoleCommissionDisplayStatus("paid", 0)).toBeNull();
  });
});

describe("formatRoleCommissionStatusLabel", () => {
  it("formats paid setter status", () => {
    expect(formatRoleCommissionStatusLabel("setter", "paid")).toBe(
      "✅ Setter-Provision bezahlt",
    );
  });

  it("formats ready closer status", () => {
    expect(formatRoleCommissionStatusLabel("closer", "ready")).toBe(
      "🟡 Bereit zur Auszahlung",
    );
  });
});

describe("buildCommissionEntryFromClientRevenue", () => {
  it("returns null without commission entry id", () => {
    expect(
      buildCommissionEntryFromClientRevenue({
        commissionEntryId: null,
        clientId: "client-1",
        companyName: "Acme",
        setterId: "setter-1",
        setterName: "Anna",
        closerId: null,
        closerName: null,
        projectValueCents: 100_000,
        setterRate: 10,
        closerRate: 0,
        setterCommissionCents: 10_000,
        closerCommissionCents: 0,
        commissionEntryStatus: null,
      }),
    ).toBeNull();
  });
});
