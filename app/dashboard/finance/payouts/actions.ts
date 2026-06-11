"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceAccess } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/session";
import {
  FREELANCER_PAYOUT_STATUSES,
  type FreelancerPayoutStatus,
} from "@/lib/dashboard/constants";
import { parseEuroToCents } from "@/lib/dashboard/format";
import { isFreelancerSchemaMissingError } from "@/lib/dashboard/freelancers";
import { createClient } from "@/lib/supabase/server";

function revalidatePayoutPaths(freelancerId?: string) {
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/finance/payouts");
  revalidatePath("/dashboard/finance/freelancers");
  if (freelancerId) {
    revalidatePath(`/dashboard/finance/freelancers/${freelancerId}`);
  }
}

async function settleSubmittedInvoices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  freelancerId: string,
  payoutAmountCents: number,
  payoutId: string,
) {
  const { data: invoices, error } = await supabase
    .from("freelancer_invoices")
    .select("id, total_amount_cents")
    .eq("freelancer_id", freelancerId)
    .eq("status", "submitted")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  let remaining = payoutAmountCents;
  const now = new Date().toISOString();

  for (const invoice of invoices ?? []) {
    if (remaining <= 0) break;
    const amount = invoice.total_amount_cents as number;
    if (amount > remaining) continue;

    const { error: linkError } = await supabase
      .from("freelancer_payout_invoices")
      .insert({
        payout_id: payoutId,
        invoice_id: invoice.id as string,
      });

    if (linkError && !linkError.message.includes("freelancer_payout_invoices")) {
      throw new Error(linkError.message);
    }

    const { error: updateError } = await supabase
      .from("freelancer_invoices")
      .update({ status: "paid", paid_at: now })
      .eq("id", invoice.id as string);

    if (updateError) throw new Error(updateError.message);
    remaining -= amount;
  }
}

export async function createFreelancerPayout(formData: FormData) {
  await requireFinanceAccess();
  const profile = await getProfile();

  const freelancerId = String(formData.get("freelancer_id") ?? "").trim();
  if (!freelancerId) throw new Error("Freelancer ist erforderlich");

  const amountCents = parseEuroToCents(String(formData.get("amount") ?? ""));
  if (amountCents == null || amountCents <= 0) {
    throw new Error("Bitte einen gültigen Betrag eingeben");
  }

  const payoutDate = String(formData.get("payout_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const clientIds = formData.getAll("client_ids").map(String).filter(Boolean);

  const supabase = await createClient();
  const { data: payout, error } = await supabase
    .from("freelancer_payouts")
    .insert({
      freelancer_id: freelancerId,
      amount_cents: amountCents,
      payout_date: payoutDate || new Date().toISOString().slice(0, 10),
      status: "offen",
      notes,
      created_by: profile?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (isFreelancerSchemaMissingError(error.message)) {
      throw new Error(
        "Auszahlungen sind erst nach Anwenden der Phase-14-Migration verfügbar.",
      );
    }
    throw new Error(error.message);
  }

  if (clientIds.length > 0) {
    const { error: linkError } = await supabase.from("freelancer_payout_clients").insert(
      clientIds.map((clientId) => ({
        payout_id: payout.id as string,
        client_id: clientId,
      })),
    );
    if (linkError) throw new Error(linkError.message);
  }

  revalidatePayoutPaths(freelancerId);
}

export async function updateFreelancerPayoutStatus(
  payoutId: string,
  status: FreelancerPayoutStatus,
) {
  await requireFinanceAccess();

  if (!FREELANCER_PAYOUT_STATUSES.includes(status)) {
    throw new Error("Ungültiger Auszahlungsstatus");
  }

  const supabase = await createClient();
  const { data: payout, error: fetchError } = await supabase
    .from("freelancer_payouts")
    .select("freelancer_id, amount_cents, status")
    .eq("id", payoutId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const updatePayload: Record<string, unknown> = { status };
  if (status === "ausgezahlt" && payout.status !== "ausgezahlt") {
    await settleSubmittedInvoices(
      supabase,
      payout.freelancer_id as string,
      payout.amount_cents as number,
      payoutId,
    );

    await supabase
      .from("freelancers")
      .update({ last_payout_at: new Date().toISOString() })
      .eq("id", payout.freelancer_id as string);
  }

  const { error } = await supabase
    .from("freelancer_payouts")
    .update(updatePayload)
    .eq("id", payoutId);

  if (error) throw new Error(error.message);
  revalidatePayoutPaths(payout.freelancer_id as string);
}

export async function deleteFreelancerPayout(payoutId: string) {
  await requireFinanceAccess();

  const supabase = await createClient();
  const { data: payout, error: fetchError } = await supabase
    .from("freelancer_payouts")
    .select("freelancer_id, status")
    .eq("id", payoutId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (payout.status === "ausgezahlt") {
    throw new Error("Ausgezahlte Einträge können nicht gelöscht werden");
  }

  const { error } = await supabase
    .from("freelancer_payouts")
    .delete()
    .eq("id", payoutId);

  if (error) throw new Error(error.message);
  revalidatePayoutPaths(payout.freelancer_id as string);
}
