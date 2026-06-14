import { describe, expect, it } from "vitest";
import {
  buildResolvedSalesAttribution,
  buildSalesAttributionPreview,
  detectSalesDealAttributionType,
  resolveSalesAttributionIds,
  shouldInferFullCycleSetter,
} from "./sales-attribution";

describe("buildSalesAttributionPreview", () => {
  it("calculates setter, closer, and agency revenue separately", () => {
    const preview = buildSalesAttributionPreview({
      projectValueCents: 100_000,
      setterId: "setter-1",
      setterName: "Anna Setter",
      setterRate: 10,
      closerId: "closer-1",
      closerName: "Ben Closer",
      closerRate: 20,
    });

    expect(preview.setterCommissionCents).toBe(10_000);
    expect(preview.closerCommissionCents).toBe(20_000);
    expect(preview.agencyRevenueCents).toBe(70_000);
    expect(preview.setter.name).toBe("Anna Setter");
    expect(preview.closer.name).toBe("Ben Closer");
    expect(preview.dealType).toBe("split");
  });

  it("derives agency revenue from project value minus sales commissions", () => {
    const preview = buildSalesAttributionPreview({
      projectValueCents: 100_000,
      setterId: "setter-1",
      setterRate: 10,
      closerId: "closer-1",
      closerRate: 20,
    });

    expect(preview.agencyRevenueCents).toBe(70_000);
  });
});

describe("full-cycle attribution resolution", () => {
  it("infers owner full-cycle when closer is owner without setter", () => {
    expect(
      shouldInferFullCycleSetter({
        setterId: null,
        closerId: "owner-1",
        closerAgencyRole: "owner",
      }),
    ).toBe(true);

    const resolved = resolveSalesAttributionIds({
      setterId: null,
      closerId: "owner-1",
      closerAgencyRole: "owner",
    });

    expect(resolved).toEqual({
      setterId: "owner-1",
      closerId: "owner-1",
    });
  });

  it("infers full-cycle when lead owner closes their own deal", () => {
    expect(
      shouldInferFullCycleSetter({
        setterId: null,
        closerId: "member-1",
        leadOwnerId: "member-1",
      }),
    ).toBe(true);
  });

  it("does not infer full-cycle when closer claims an unassigned lead", () => {
    expect(
      shouldInferFullCycleSetter({
        setterId: null,
        closerId: "closer-1",
        leadOwnerId: "owner-1",
        closerAgencyRole: "closer",
      }),
    ).toBe(false);

    expect(
      resolveSalesAttributionIds({
        setterId: null,
        closerId: "closer-1",
        leadOwnerId: "owner-1",
        closerAgencyRole: "closer",
      }),
    ).toEqual({
      setterId: null,
      closerId: "closer-1",
    });
  });

  it("builds owner full-cycle preview with setter and closer names", () => {
    const preview = buildResolvedSalesAttribution({
      projectValueCents: 100_000,
      setterId: null,
      closerId: "owner-1",
      closerProfile: {
        id: "owner-1",
        full_name: "Onel",
        email: "onel@example.com",
        agency_role: "owner",
        setter_commission_rate: 10,
        closer_commission_rate: 20,
      },
      leadOwnerId: "owner-1",
    });

    expect(preview.setter.id).toBe("owner-1");
    expect(preview.closer.id).toBe("owner-1");
    expect(preview.setter.name).toBe("Onel");
    expect(preview.closer.name).toBe("Onel");
    expect(preview.dealType).toBe("owner_full_cycle");
    expect(preview.setterCommissionCents).toBe(10_000);
    expect(preview.closerCommissionCents).toBe(20_000);
  });

  it("detects split, full-cycle, and owner full-cycle deal types", () => {
    expect(
      detectSalesDealAttributionType({
        setterId: "a",
        closerId: "b",
      }),
    ).toBe("split");

    expect(
      detectSalesDealAttributionType({
        setterId: "member-1",
        closerId: "member-1",
        sharedProfileAgencyRole: "closer",
      }),
    ).toBe("full_cycle");

    expect(
      detectSalesDealAttributionType({
        setterId: "owner-1",
        closerId: "owner-1",
        sharedProfileAgencyRole: "owner",
      }),
    ).toBe("owner_full_cycle");
  });

  it("uses acquired_by as setter name fallback when profile join is unavailable", () => {
    const preview = buildResolvedSalesAttribution({
      projectValueCents: 100_000,
      setterId: "setter-1",
      closerId: "closer-1",
      closerProfile: {
        id: "closer-1",
        full_name: "Ben Closer",
        email: "ben@example.com",
        closer_commission_rate: 20,
      },
      acquiredByName: "Onel Test Setter",
      setterRate: 20,
      closerRate: 20,
    });

    expect(preview.setter.name).toBe("Onel Test Setter");
    expect(preview.setterCommissionCents).toBe(20_000);
  });
});
