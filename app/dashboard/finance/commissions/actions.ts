"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceAccess } from "@/lib/auth/session";
import {
  canApproveCommissionEntry,
  canPayCommissionEntry,
  nextCommissionEntryStatus,
} from "@/lib/dashboard/commission-entries";
import { createClient } from "@/lib/supabase/server";

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

export async function payCommissionEntry(entryId: string) {
  const profile = await requireFinanceAccess();
  const entry = await requireCommissionEntry(entryId);
  const status = entry.status as import("@/lib/dashboard/commission-constants").CommissionEntryStatus;

  if (!canPayCommissionEntry(status)) {
    throw new Error("Provision kann nicht ausbezahlt werden");
  }

  const nextStatus = nextCommissionEntryStatus(status, "pay");
  if (!nextStatus) throw new Error("Ungültiger Statuswechsel");

  const supabase = await createClient();
  const paidAt = new Date().toISOString();
  const payouts: {
    commission_entry_id: string;
    profile_id: string;
    amount_cents: number;
    paid_at: string;
    created_by: string;
  }[] = [];

  if (entry.setter_id && Number(entry.setter_commission_cents) > 0) {
    payouts.push({
      commission_entry_id: entryId,
      profile_id: entry.setter_id as string,
      amount_cents: Number(entry.setter_commission_cents),
      paid_at: paidAt,
      created_by: profile.id,
    });
  }

  if (entry.closer_id && Number(entry.closer_commission_cents) > 0) {
    payouts.push({
      commission_entry_id: entryId,
      profile_id: entry.closer_id as string,
      amount_cents: Number(entry.closer_commission_cents),
      paid_at: paidAt,
      created_by: profile.id,
    });
  }

  if (payouts.length === 0) {
    throw new Error("Keine Auszahlungsbeträge vorhanden");
  }

  const { error: payoutError } = await supabase
    .from("commission_payouts")
    .insert(payouts);

  if (payoutError) throw new Error(payoutError.message);

  const { error } = await supabase
    .from("commission_entries")
    .update({
      status: nextStatus,
      paid_at: paidAt,
      updated_at: paidAt,
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
