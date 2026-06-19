import { describe, expect, it } from "vitest";
import {
  RESET_TEST_DATA_CONFIRMATION,
  isResetConfirmationValid,
} from "./maintenance";

describe("maintenance helpers", () => {
  it("accepts exact confirmation phrase", () => {
    expect(isResetConfirmationValid(RESET_TEST_DATA_CONFIRMATION)).toBe(true);
  });

  it("rejects incorrect or partial confirmation", () => {
    expect(isResetConfirmationValid("reset test data")).toBe(false);
    expect(isResetConfirmationValid("RESET TEST DATA ")).toBe(false);
    expect(isResetConfirmationValid(" RESET TEST DATA")).toBe(false);
    expect(isResetConfirmationValid("")).toBe(false);
  });
});
