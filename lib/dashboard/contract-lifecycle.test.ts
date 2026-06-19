import { describe, expect, it } from "vitest";
import {
  buildContractLifecycleUpdate,
  canPerformContractLifecycleAction,
  getContractDetailUiPermissions,
  getContractLifecycleActions,
  isTeamContractRevenueActive,
  resolveStatusAfterSignatures,
} from "./contract-lifecycle";

describe("contract lifecycle", () => {
  it("exposes allowed actions per status", () => {
    expect(getContractLifecycleActions("draft")).toEqual(["send"]);
    expect(getContractLifecycleActions("sent")).toEqual(["sign"]);
    expect(getContractLifecycleActions("signed")).toEqual(["activate"]);
    expect(getContractLifecycleActions("active")).toEqual(["terminate"]);
    expect(getContractLifecycleActions("terminated")).toEqual(["archive"]);
    expect(getContractLifecycleActions("archived")).toEqual([]);
  });

  it("builds lifecycle updates with timestamps", () => {
    const now = "2026-06-19T12:00:00.000Z";

    expect(buildContractLifecycleUpdate({ status: "draft" }, "send", now)).toEqual({
      status: "sent",
      sent_at: now,
    });

    expect(buildContractLifecycleUpdate({ status: "sent" }, "sign", now)).toEqual({
      status: "signed",
      signed_at: now,
      signed_by_agency: true,
      signed_by_partner: true,
      agency_signed_at: now,
      partner_signed_at: now,
    });

    expect(buildContractLifecycleUpdate({ status: "signed" }, "activate", now)).toEqual({
      status: "active",
      activated_at: now,
    });
  });

  it("rejects invalid transitions", () => {
    expect(
      canPerformContractLifecycleAction({ status: "draft" }, "activate"),
    ).toBe(false);

    expect(() =>
      buildContractLifecycleUpdate({ status: "draft" }, "activate"),
    ).toThrow();
  });

  it("resolves signed status when both parties signed", () => {
    expect(
      resolveStatusAfterSignatures({
        signedByAgency: true,
        signedByPartner: true,
        currentStatus: "sent",
      }),
    ).toBe("signed");

    expect(
      resolveStatusAfterSignatures({
        signedByAgency: true,
        signedByPartner: false,
        currentStatus: "sent",
      }),
    ).toBe("sent");
  });

  it("counts only active contracts for revenue", () => {
    expect(isTeamContractRevenueActive("active")).toBe(true);
    expect(isTeamContractRevenueActive("signed")).toBe(false);
    expect(isTeamContractRevenueActive("draft")).toBe(false);
  });

  it("exposes detail UI permissions", () => {
    expect(getContractDetailUiPermissions("draft")).toEqual({
      lifecycle: ["send"],
      canEdit: true,
      canDelete: true,
    });
    expect(getContractDetailUiPermissions("active")).toEqual({
      lifecycle: ["terminate"],
      canEdit: false,
      canDelete: false,
    });
    expect(getContractDetailUiPermissions("archived")).toEqual({
      lifecycle: [],
      canEdit: false,
      canDelete: false,
    });
  });
});
