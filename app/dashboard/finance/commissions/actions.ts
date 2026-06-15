"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceAccess } from "@/lib/auth/session";
import {
  canApproveCommissionEntry,
  canPayCommissionEntry,
  nextCommissionEntryStatus,
} from "@/lib/dashboard/commission-entries";
import {
  areAllCommissionRolesPaid,
  resolveClientCommissionPayoutStatus,
} from "@/lib/dashboard/client-commission-status";
import { createClient } from "@/lib/supabase/server";

export type CommissionPayoutRole = "setter" | "closer";

function revalidateCommissions() {
  revalidatePath("/dashboard/finance/commissions");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/performance");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
}

async function requireCommissionEntry(entryId: string) {
  await requireFinanceAccess();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commission_entries")
    .select(
      "id, status, setter_id, closer_id, setter_commission_cents, closer_commission_cents, client_id",
    )
    .eq("id", entryId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function approveCommissionEntry(entryId: string) {
  const entry = await requireCommissionEntry(entryId);
  const status = entry.status as import("@/lib/dashboard/commission-constants").CommissionEntryStatus;

  if (!canApproveCommissionEntry(status)) {
    throw new Error("Provision kann nicht freigegeben werden");
  }

  const nextStatus = nextCommissionEntryStatus(status, "approve");
  if (!nextStatus) throw new Error("Ungültiger Statuswechsel");

  const supabase = await createClient();
  const { error } = await supabase
    .from("commission_entries")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) throw new Error(error.message);
  revalidateCommissions();
  if (entry.client_id) {
    revalidatePath(`/dashboard/clients/${entry.client_id}`);
  }
  if (entry.setter_id) revalidatePath(`/dashboard/team/${entry.setter_id}`);
  if (entry.closer_id) revalidatePath(`/dashboard/team/${entry.closer_id}`);
}

async function fetchPaidCommissionProfileIds(
  entryId: string,
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commission_payouts")
    .select("profile_id")
    .eq("commission_entry_id", entryId);

  if (error) throw new Error(error.message);

  return new Set((data ?? []).map((row) => row.profile_id as string));
}

function buildRolePayout(
  entry: Awaited<ReturnType<typeof requireCommissionEntry>>,
  role: CommissionPayoutRole,
  paidAt: string,
  createdBy: string,
) {
  const profileId =
    role === "setter" ? (entry.setter_id as string | null) : (entry.closer_id as string | null);
  const amountCents =
    role === "setter"
      ? Number(entry.setter_commission_cents)
      : Number(entry.closer_commission_cents);

  if (!profileId || amountCents <= 0) return null;

  return {
    commission_entry_id: entry.id as string,
    profile_id: profileId,
    amount_cents: amountCents,
    paid_at: paidAt,
    created_by: createdBy,
  };
}

export async function payCommissionEntry(
  entryId: string,
  role?: CommissionPayoutRole,
) {
  const profile = await requireFinanceAccess();
  const entry = await requireCommissionEntry(entryId);
  const status = entry.status as import("@/lib/dashboard/commission-constants").CommissionEntryStatus;

  if (!canPayCommissionEntry(status)) {
    throw new Error("Provision kann nicht ausbezahlt werden");
  }

  const alreadyPaidProfileIds = await fetchPaidCommissionProfileIds(entryId);
  const paidAt = new Date().toISOString();
  const rolesToPay: CommissionPayoutRole[] = role ? [role] : ["setter", "closer"];
  const payouts: {
    commission_entry_id: string;
    profile_id: string;
    amount_cents: number;
    paid_at: string;
    created_by: string;
  }[] = [];

  for (const payoutRole of rolesToPay) {
    const payout = buildRolePayout(entry, payoutRole, paidAt, profile.id);
    if (!payout) continue;
    if (alreadyPaidProfileIds.has(payout.profile_id)) continue;
    payouts.push(payout);
  }

  if (payouts.length === 0) {
    if (role) {
      const roleLabel = role === "setter" ? "Setter" : "Closer";
      throw new Error(`${roleLabel}-Provision ist bereits bezahlt oder nicht vorhanden`);
    }
    throw new Error("Keine Auszahlungsbeträge vorhanden");
  }

  const supabase = await createClient();
  const { error: payoutError } = await supabase
    .from("commission_payouts")
    .insert(payouts);

  if (payoutError) throw new Error(payoutError.message);

  const paidProfileIds = new Set(alreadyPaidProfileIds);
  for (const payout of payouts) {
    paidProfileIds.add(payout.profile_id);
  }

  const payoutStatus = resolveClientCommissionPayoutStatus(
    {
      id: entry.id as string,
      client_id: entry.client_id as string,
      client_name: "",
      setter_id: (entry.setter_id as string | null) ?? null,
      setter_name: null,
      closer_id: (entry.closer_id as string | null) ?? null,
      closer_name: null,
      project_value_cents: 0,
      setter_rate: 0,
      closer_rate: 0,
      setter_commission_cents: Number(entry.setter_commission_cents),
      closer_commission_cents: Number(entry.closer_commission_cents),
      status,
      deal_type: null,
      triggered_by_invoice_id: null,
      created_at: "",
      updated_at: "",
      paid_at: null,
    },
    paidProfileIds,
  );

  const updatePayload: {
    updated_at: string;
    status?: import("@/lib/dashboard/commission-constants").CommissionEntryStatus;
    paid_at?: string;
  } = {
    updated_at: paidAt,
  };

  if (areAllCommissionRolesPaid(payoutStatus)) {
    const nextStatus = nextCommissionEntryStatus(status, "pay");
    if (!nextStatus) throw new Error("Ungültiger Statuswechsel");
    updatePayload.status = nextStatus;
    updatePayload.paid_at = paidAt;
  }

  const { error } = await supabase
    .from("commission_entries")
    .update(updatePayload)
    .eq("id", entryId);

  if (error) throw new Error(error.message);

  revalidateCommissions();
  if (entry.client_id) {
    revalidatePath(`/dashboard/clients/${entry.client_id}`);
  }
  if (entry.setter_id) revalidatePath(`/dashboard/team/${entry.setter_id}`);
  if (entry.closer_id) revalidatePath(`/dashboard/team/${entry.closer_id}`);
}

export async function cancelCommissionEntry(entryId: string) {
  const entry = await requireCommissionEntry(entryId);
  const status = entry.status as import("@/lib/dashboard/commission-constants").CommissionEntryStatus;
  const nextStatus = nextCommissionEntryStatus(status, "cancel");

  if (!nextStatus) throw new Error("Provision kann nicht storniert werden");

  const supabase = await createClient();
  const { error } = await supabase
    .from("commission_entries")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) throw new Error(error.message);
  revalidateCommissions();
}
