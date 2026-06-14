import {
  CONTRACT_NUMBER_PREFIX,
  type ContractStatus,
} from "./contract-constants";

const CONTRACT_NUMBER_PATTERN = /^CTR-(\d{4})-(\d{6})$/;

export function formatContractNumber(year: number, sequence: number): string {
  return `${CONTRACT_NUMBER_PREFIX}-${year}-${String(sequence).padStart(6, "0")}`;
}

export function parseContractNumber(
  contractNumber: string,
): { year: number; sequence: number } | null {
  const match = CONTRACT_NUMBER_PATTERN.exec(contractNumber.trim());
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const sequence = Number.parseInt(match[2], 10);
  if (Number.isNaN(year) || Number.isNaN(sequence) || sequence <= 0) {
    return null;
  }

  return { year, sequence };
}

export function isValidContractNumber(contractNumber: string): boolean {
  return parseContractNumber(contractNumber) !== null;
}

export function nextContractNumberFromSequence(
  year: number,
  lastNumber: number,
): string {
  return formatContractNumber(year, lastNumber + 1);
}

export function isContractStatus(value: string): value is ContractStatus {
  return ["draft", "active", "terminated", "expired"].includes(value);
}
