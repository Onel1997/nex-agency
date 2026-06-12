import type { ContractStatus } from "./constants";

export function resolveContractStatus(
  row: {
    contract_status?: string | null;
    contract_start_date?: string | null;
  },
): ContractStatus {
  const status = row.contract_status as ContractStatus | undefined;
  if (status && ["draft", "active", "paused", "terminated"].includes(status)) {
    return status;
  }
  return row.contract_start_date ? "active" : "draft";
}

export function isContractRevenueActive(input: {
  contract_status?: ContractStatus | string | null;
  contract_start_date?: string | null;
}): boolean {
  const status = resolveContractStatus(input);
  return status === "active" && Boolean(input.contract_start_date);
}

export function isContractStatusSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("contract_status") &&
    normalized.includes("does not exist")
  );
}
