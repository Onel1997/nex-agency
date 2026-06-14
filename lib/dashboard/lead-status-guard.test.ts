import { describe, expect, it } from "vitest";
import {
  assertLeadStatusTransition,
  preserveLeadStatusForUpdate,
} from "./lead-status-guard";

describe("preserveLeadStatusForUpdate", () => {
  it("keeps won leads at won even when form submits another status", () => {
    expect(preserveLeadStatusForUpdate("won", "new")).toBe("won");
    expect(preserveLeadStatusForUpdate("won", "qualified")).toBe("won");
  });

  it("allows pipeline status changes for open leads", () => {
    expect(preserveLeadStatusForUpdate("new", "qualified")).toBe("qualified");
    expect(preserveLeadStatusForUpdate("proposal", "won")).toBe("won");
  });
});

describe("assertLeadStatusTransition", () => {
  it("blocks downgrading won leads", () => {
    expect(() => assertLeadStatusTransition("won", "new")).toThrow(
      "Der Lead-Status „Gewonnen“ kann nicht mehr geändert werden.",
    );
  });

  it("allows staying won or progressing to won", () => {
    expect(() => assertLeadStatusTransition("won", "won")).not.toThrow();
    expect(() => assertLeadStatusTransition("proposal", "won")).not.toThrow();
  });
});
