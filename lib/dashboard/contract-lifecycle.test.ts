import { describe, expect, it } from "vitest";
import {
  buildContractLifecycleUpdate,
  canDeleteContract,
  canPerformContractLifecycleAction,
  getContractDeleteDialogTitle,
  getContractDetailUiPermissions,
  getContractLifecycleActions,
  getContractLifecycleConfirmTitle,
  isTeamContractRevenueActive,
  resolveContractLifecycleStepIndex,
  resolveContractTimelineTimestamp,
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

    expect(buildContractLifecycleUpdate({ status: "active" }, "terminate", now)).toEqual({
      status: "terminated",
      terminated_at: now,
    });

    expect(buildContractLifecycleUpdate({ status: "terminated" }, "archive", now)).toEqual({
      status: "archived",
      archived_at: now,
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
    expect(getContractDetailUiPermissions("sent")).toEqual({
      lifecycle: ["sign"],
      canEdit: false,
      canDelete: false,
    });
    expect(getContractDetailUiPermissions("signed")).toEqual({
      lifecycle: ["activate"],
      canEdit: false,
      canDelete: false,
    });
    expect(getContractDetailUiPermissions("active")).toEqual({
      lifecycle: ["terminate"],
      canEdit: false,
      canDelete: false,
    });
    expect(getContractDetailUiPermissions("archived")).toEqual({
      lifecycle: [],
      canEdit: false,
      canDelete: true,
    });
    expect(getContractDetailUiPermissions("terminated")).toEqual({
      lifecycle: ["archive"],
      canEdit: false,
      canDelete: false,
    });
  });

  it("allows deleting only draft and archived contracts", () => {
    expect(canDeleteContract("draft")).toBe(true);
    expect(canDeleteContract("archived")).toBe(true);
    expect(canDeleteContract("active")).toBe(false);
    expect(canDeleteContract("terminated")).toBe(false);
    expect(canDeleteContract("signed")).toBe(false);
    expect(canDeleteContract("sent")).toBe(false);
  });

  it("uses lifecycle confirmation dialog titles", () => {
    expect(getContractLifecycleConfirmTitle("send")).toBe("Vertrag wirklich versenden?");
    expect(getContractLifecycleConfirmTitle("sign")).toBe(
      "Vertrag als unterschrieben markieren?",
    );
    expect(getContractLifecycleConfirmTitle("activate")).toBe("Vertrag aktivieren?");
    expect(getContractLifecycleConfirmTitle("terminate")).toBe("Vertrag kündigen?");
    expect(getContractLifecycleConfirmTitle("archive")).toBe("Vertrag archivieren?");
    expect(getContractDeleteDialogTitle("draft")).toBe("Vertrag wirklich löschen?");
  });

  it("resolves timeline timestamps with backward compatibility", () => {
    const contract = {
      created_at: "2026-01-01T10:00:00.000Z",
      sent_at: "2026-01-02T10:00:00.000Z",
      signed_at: null,
      agency_signed_at: "2026-01-03T10:00:00.000Z",
      partner_signed_at: null,
      activated_at: "2026-01-04T10:00:00.000Z",
      terminated_at: null,
      archived_at: null,
    };

    expect(resolveContractTimelineTimestamp("signed_at", contract)).toBe(
      "2026-01-03T10:00:00.000Z",
    );
    expect(resolveContractLifecycleStepIndex("active")).toBe(3);
    expect(resolveContractLifecycleStepIndex("expired")).toBe(4);
  });
});
