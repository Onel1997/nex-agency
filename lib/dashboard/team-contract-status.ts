import {
  CONTRACT_EXPIRING_DAYS,
  type ContractStatus as TeamContractStatus,
} from "./contract-constants";

export interface TeamContractStats {
  active: number;
  draft: number;
  terminated: number;
  expiring: number;
}

export function isTeamContractExpiring(
  status: TeamContractStatus,
  endDate: string | null,
  referenceDate: Date = new Date(),
): boolean {
  if (status !== "active" || !endDate) return false;

  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return false;

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + CONTRACT_EXPIRING_DAYS);

  return end >= today && end <= threshold;
}

export function shouldMarkTeamContractExpired(
  status: TeamContractStatus,
  endDate: string | null,
  referenceDate: Date = new Date(),
): boolean {
  if (status !== "active" || !endDate) return false;

  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return false;

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  return end < today;
}

export function computeTeamContractStats<
  T extends { status: TeamContractStatus; end_date: string | null },
>(contracts: T[], referenceDate: Date = new Date()): TeamContractStats {
  return contracts.reduce(
    (stats, contract) => {
      if (contract.status === "active") stats.active += 1;
      if (contract.status === "draft") stats.draft += 1;
      if (contract.status === "terminated") stats.terminated += 1;
      if (isTeamContractExpiring(contract.status, contract.end_date, referenceDate)) {
        stats.expiring += 1;
      }
      return stats;
    },
    { active: 0, draft: 0, terminated: 0, expiring: 0 },
  );
}

export function filterTeamContractsByStatus<
  T extends { status: TeamContractStatus; end_date: string | null },
>(
  contracts: T[],
  statusFilter: string | null,
  referenceDate: Date = new Date(),
): T[] {
  if (!statusFilter || statusFilter === "all") return contracts;

  if (statusFilter === "expiring") {
    return contracts.filter((contract) =>
      isTeamContractExpiring(contract.status, contract.end_date, referenceDate),
    );
  }

  return contracts.filter((contract) => contract.status === statusFilter);
}
