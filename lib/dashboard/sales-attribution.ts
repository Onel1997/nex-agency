import { normalizeAgencyRole } from "@/lib/auth/roles";
import type { AgencyRole } from "@/lib/auth/types";
import { calculateSetterCloserCommissions } from "./commission-entries";

export type SalesDealAttributionType = "split" | "full_cycle" | "owner_full_cycle";

export const SALES_DEAL_ATTRIBUTION_LABELS: Record<SalesDealAttributionType, string> = {
  split: "Setter + Closer",
  full_cycle: "Full Cycle Deal",
  owner_full_cycle: "Owner Full-Cycle Deal",
};

export interface SalesAttributionProfileRef {
  id: string;
  full_name: string | null;
  email: string;
  agency_role?: string | null;
  setter_commission_rate?: number | null;
  closer_commission_rate?: number | null;
}

export interface SalesAttributionMember {
  id: string | null;
  name: string | null;
  rate: number;
}

export interface SalesAttributionPreview {
  setter: SalesAttributionMember;
  closer: SalesAttributionMember;
  projectValueCents: number;
  setterCommissionCents: number;
  closerCommissionCents: number;
  agencyRevenueCents: number;
  dealType: SalesDealAttributionType | null;
}

export function shouldInferFullCycleSetter(input: {
  setterId: string | null;
  closerId: string | null;
  leadOwnerId?: string | null;
  closerAgencyRole?: string | null;
}): boolean {
  if (input.setterId || !input.closerId) return false;
  if (input.leadOwnerId && input.leadOwnerId === input.closerId) return true;
  return normalizeAgencyRole(input.closerAgencyRole) === "owner";
}

export function resolveSalesAttributionIds(input: {
  setterId: string | null;
  closerId: string | null;
  leadOwnerId?: string | null;
  closerAgencyRole?: string | null;
}): {
  setterId: string | null;
  closerId: string | null;
} {
  const closerId = input.closerId;
  let setterId = input.setterId;

  if (shouldInferFullCycleSetter(input)) {
    setterId = closerId;
  }

  return { setterId, closerId };
}

export function detectSalesDealAttributionType(input: {
  setterId: string | null;
  closerId: string | null;
  sharedProfileAgencyRole?: string | null;
}): SalesDealAttributionType | null {
  const { setterId, closerId } = input;
  if (!setterId && !closerId) return null;
  if (setterId !== closerId) return "split";
  if (normalizeAgencyRole(input.sharedProfileAgencyRole) === "owner") {
    return "owner_full_cycle";
  }
  return "full_cycle";
}

function profileRate(
  profile: SalesAttributionProfileRef | null | undefined,
  role: "setter" | "closer",
): number {
  if (!profile) return 0;
  if (role === "setter") return Number(profile.setter_commission_rate ?? 0);
  return Number(profile.closer_commission_rate ?? 0);
}

export function buildSalesAttributionPreview(input: {
  projectValueCents: number | null;
  setterId?: string | null;
  setterName?: string | null;
  setterRate?: number | null;
  closerId?: string | null;
  closerName?: string | null;
  closerRate?: number | null;
  dealType?: SalesDealAttributionType | null;
}): SalesAttributionPreview {
  const projectValueCents = Math.max(0, input.projectValueCents ?? 0);
  const setterRate = Math.max(0, input.setterRate ?? 0);
  const closerRate = Math.max(0, input.closerRate ?? 0);
  const setterId = input.setterId ?? null;
  const closerId = input.closerId ?? null;
  const hasSetter = Boolean(setterId);
  const hasCloser = Boolean(closerId);

  const commissions = calculateSetterCloserCommissions({
    projectValueCents,
    setterRate,
    closerRate,
    hasSetter,
    hasCloser,
  });

  const agencyRevenueCents = Math.max(
    0,
    projectValueCents -
      commissions.setter_commission_cents -
      commissions.closer_commission_cents,
  );

  const dealType =
    input.dealType ??
    detectSalesDealAttributionType({
      setterId,
      closerId,
    });

  return {
    setter: {
      id: setterId,
      name: input.setterName ?? null,
      rate: setterRate,
    },
    closer: {
      id: closerId,
      name: input.closerName ?? null,
      rate: closerRate,
    },
    projectValueCents,
    setterCommissionCents: commissions.setter_commission_cents,
    closerCommissionCents: commissions.closer_commission_cents,
    agencyRevenueCents,
    dealType,
  };
}

export function buildResolvedSalesAttribution(input: {
  projectValueCents: number | null;
  setterId: string | null;
  closerId: string | null;
  setterProfile?: SalesAttributionProfileRef | null;
  closerProfile?: SalesAttributionProfileRef | null;
  leadOwnerId?: string | null;
  acquiredByName?: string | null;
  setterName?: string | null;
  closerName?: string | null;
  setterRate?: number | null;
  closerRate?: number | null;
}): SalesAttributionPreview {
  const closerAgencyRole =
    input.closerProfile?.agency_role ??
    (input.setterProfile?.id === input.closerId
      ? input.setterProfile?.agency_role
      : null);

  const resolvedIds = resolveSalesAttributionIds({
    setterId: input.setterId,
    closerId: input.closerId,
    leadOwnerId: input.leadOwnerId,
    closerAgencyRole,
  });

  const sharedProfile =
    resolvedIds.setterId &&
    resolvedIds.setterId === resolvedIds.closerId
      ? input.closerProfile?.id === resolvedIds.closerId
        ? input.closerProfile
        : input.setterProfile?.id === resolvedIds.setterId
          ? input.setterProfile
          : input.closerProfile ?? input.setterProfile
      : null;

  const setterProfile =
    resolvedIds.setterId === input.closerId && !input.setterId
      ? input.closerProfile
      : input.setterProfile;

  const closerProfile = input.closerProfile;

  const setterName =
    input.setterName ??
    formatAttributionMemberName(setterProfile) ??
    (resolvedIds.setterId && input.acquiredByName?.trim()
      ? input.acquiredByName.trim()
      : null) ??
    (resolvedIds.setterId === resolvedIds.closerId
      ? formatAttributionMemberName(closerProfile)
      : null);

  const closerName =
    input.closerName ?? formatAttributionMemberName(closerProfile);

  const setterRate =
    input.setterRate ??
    profileRate(setterProfile, "setter") ??
    (resolvedIds.setterId === resolvedIds.closerId
      ? profileRate(closerProfile, "setter")
      : 0);

  const closerRate =
    input.closerRate ?? profileRate(closerProfile, "closer");

  const dealType = detectSalesDealAttributionType({
    setterId: resolvedIds.setterId,
    closerId: resolvedIds.closerId,
    sharedProfileAgencyRole: sharedProfile?.agency_role,
  });

  return buildSalesAttributionPreview({
    projectValueCents: input.projectValueCents,
    setterId: resolvedIds.setterId,
    setterName,
    setterRate,
    closerId: resolvedIds.closerId,
    closerName,
    closerRate,
    dealType,
  });
}

export function resolveCommissionEntryAttribution(input: {
  setterId: string | null;
  closerId: string | null;
  setterName: string | null;
  closerName: string | null;
  setterAgencyRole?: string | null;
  closerAgencyRole?: string | null;
  leadOwnerId?: string | null;
}): {
  setterId: string | null;
  closerId: string | null;
  setterName: string | null;
  closerName: string | null;
  dealType: SalesDealAttributionType | null;
} {
  const resolvedIds = resolveSalesAttributionIds({
    setterId: input.setterId,
    closerId: input.closerId,
    leadOwnerId: input.leadOwnerId,
    closerAgencyRole: input.closerAgencyRole,
  });

  const inferredSetter = !input.setterId && Boolean(resolvedIds.setterId);
  const sharedAgencyRole = inferredSetter
    ? input.closerAgencyRole
    : resolvedIds.setterId === resolvedIds.closerId
      ? input.setterAgencyRole ?? input.closerAgencyRole
      : null;

  return {
    setterId: resolvedIds.setterId,
    closerId: resolvedIds.closerId,
    setterName: inferredSetter ? input.closerName : input.setterName,
    closerName: input.closerName,
    dealType: detectSalesDealAttributionType({
      setterId: resolvedIds.setterId,
      closerId: resolvedIds.closerId,
      sharedProfileAgencyRole: sharedAgencyRole,
    }),
  };
}

export function salesAttributionFromClientRevenue(
  revenue: {
    setup_fee_cents: number | null;
    setter_id: string | null;
    setter_name: string | null;
    setter_commission_rate: number;
    closer_id: string | null;
    closer_name: string | null;
    closer_commission_rate: number;
    setter_commission_cents: number;
    closer_commission_cents: number;
    sales_agency_revenue_cents: number;
    sales_deal_type: SalesDealAttributionType | null;
  },
): SalesAttributionPreview {
  return {
    setter: {
      id: revenue.setter_id,
      name: revenue.setter_name,
      rate: revenue.setter_commission_rate,
    },
    closer: {
      id: revenue.closer_id,
      name: revenue.closer_name,
      rate: revenue.closer_commission_rate,
    },
    projectValueCents: revenue.setup_fee_cents ?? 0,
    setterCommissionCents: revenue.setter_commission_cents,
    closerCommissionCents: revenue.closer_commission_cents,
    agencyRevenueCents: revenue.sales_agency_revenue_cents,
    dealType: revenue.sales_deal_type,
  };
}

export function formatAttributionMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

export function isOwnerAgencyRole(role: string | null | undefined): role is AgencyRole {
  return normalizeAgencyRole(role) === "owner";
}
