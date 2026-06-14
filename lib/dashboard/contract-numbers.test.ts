import { describe, expect, it } from "vitest";
import {
  formatContractNumber,
  isValidContractNumber,
  nextContractNumberFromSequence,
  parseContractNumber,
} from "./contract-numbers";

describe("contract numbers", () => {
  it("formats contract numbers with zero padding", () => {
    expect(formatContractNumber(2026, 1)).toBe("CTR-2026-000001");
    expect(formatContractNumber(2026, 42)).toBe("CTR-2026-000042");
  });

  it("parses valid contract numbers", () => {
    expect(parseContractNumber("CTR-2026-000001")).toEqual({
      year: 2026,
      sequence: 1,
    });
    expect(isValidContractNumber("CTR-2026-000123")).toBe(true);
  });

  it("rejects invalid contract numbers", () => {
    expect(parseContractNumber("INV-2026-000001")).toBeNull();
    expect(parseContractNumber("CTR-26-1")).toBeNull();
    expect(isValidContractNumber("CTR-2026-000000")).toBe(false);
  });

  it("increments sequence for next contract number", () => {
    expect(nextContractNumberFromSequence(2026, 0)).toBe("CTR-2026-000001");
    expect(nextContractNumberFromSequence(2026, 15)).toBe("CTR-2026-000016");
  });
});
