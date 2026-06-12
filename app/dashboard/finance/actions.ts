"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceAccess } from "@/lib/auth/session";
import {
  applyCommissionPayout,
  isCommissionPayoutsSchemaMissingError,
  isCommissionSchemaMissingError,
} from "@/lib/dashboard/commission";
import {
  applyFreelancerPayout,
  isClientFreelancerPayoutsSchemaMissingError,
  isClientFreelancerSchemaMissingError,
} from "@/lib/dashboard/client-freelancer-payout";
import { createFreelancerProfileInvoiceForPayout } from "@/lib/dashboard/freelancer-profile-invoices";
import { syncClientTotalRevenue } from "@/lib/dashboard/client-revenue-sync";
import {
  COMMISSION_STATUSES,
  type CommissionStatus,
} from "@/lib/dashboard/constants";
import { parseEuroToCents } from "@/lib/dashboard/format";
import { getProfile } from "@/lib/auth/session";
import { logClientActivity } from "@/lib/dashboard/client-activities";
import { formatCents } from "@/lib/dashboard/format";
import { createClient } from "@/lib/supabase/server";
import {
  parseClientContractFormData,
  saveClientContractData,
} from "@/lib/dashboard/client-contract-save";

function revalidateFinance(clientId?: string) {
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/performance");
  revalidatePath("/dashboard");
  if (clientId) {
    revalidatePath(`/dashboard/clients/${clientId}`);
  }
}

function actorName(profile: { full_name: string | null; email: string }) {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

export async function updateClientRevenue(
  clientId: string,
  formData: FormData,
) {
  await requireFinanceAccess();

  const input = parseClientContractFormData(formData);
  const supabase = await createClient();

  const { setupInvoice } = await saveClientContractData(
    supabase,
    clientId,
    input,
    (await getProfile())?.id,
  );

  const profile = await getProfile();
  if (profile) {
    await logClientActivity({
      clientId,
      actorId: profile.id,
      activityType: "contract_changed",
      description: `${actorName(profile)} hat Vertragsdaten geändert`,
    });

    if (setupInvoice) {
      await logClientActivity({
        clientId,
        actorId: profile.id,
        activityType: "invoice_created",
        description: `${actorName(profile)} hat Setup-Rechnung ${setupInvoice.invoiceNumber} beim Speichern des Vertrags erstellt`,
        metadata: {
          invoice_number: setupInvoice.invoiceNumber,
          source: "contract_save",
        },
      });
    }
  }

  revalidateFinance(clientId);
}

export async function payCommission(clientId: string, formData: FormData) {
  await requireFinanceAccess();

  const payoutCents = parseEuroToCents(
    String(formData.get("payout_amount") ?? ""),
  );
  if (payoutCents == null || payoutCents <= 0) {
    throw new Error("Bitte einen gültigen Auszahlungsbetrag eingeben");
  }

  const supabase = await createClient();
  let clientResult = await supabase
    .from("clients")
    .select(
      "commission_total_cents, commission_paid_cents, commission_outstanding_cents",
    )
    .eq("id", clientId)
    .single();

  if (
    clientResult.error &&
    isCommissionSchemaMissingError(clientResult.error.message)
  ) {
    throw new Error(
      "Provisionsauszahlungen sind erst nach Anwenden der Phase-7-Migration verfügbar.",
    );
  }

  if (clientResult.error) throw new Error(clientResult.error.message);

  const client = clientResult.data;
  const payout = applyCommissionPayout({
    totalCents: (client.commission_total_cents as number) ?? 0,
    paidCents: (client.commission_paid_cents as number) ?? 0,
    payoutCents,
  });

  const payoutDate = new Date().toISOString();
  const payoutUpdate = {
    commission_paid_cents: payout.commission_paid_cents,
    commission_outstanding_cents: payout.commission_outstanding_cents,
    commission_status: payout.commission_status,
    last_commission_payout_at: payoutDate,
  };

  let { error } = await supabase
    .from("clients")
    .update(payoutUpdate)
    .eq("id", clientId);

  if (
    error &&
    error.message.toLowerCase().includes("last_commission_payout_at")
  ) {
    const { last_commission_payout_at: _, ...withoutPayoutTimestamp } =
      payoutUpdate;
    ({ error } = await supabase
      .from("clients")
      .update(withoutPayoutTimestamp)
      .eq("id", clientId));
  }

  if (error) throw new Error(error.message);

  const { error: payoutInsertError } = await supabase
    .from("client_commission_payouts")
    .insert({
      client_id: clientId,
      amount_cents: payoutCents,
      payout_date: payoutDate,
    });

  if (payoutInsertError) {
    if (isCommissionPayoutsSchemaMissingError(payoutInsertError.message)) {
      throw new Error(
        "Auszahlungshistorie ist erst nach Anwenden der Migration client_commission_payouts verfügbar.",
      );
    }
    throw new Error(payoutInsertError.message);
  }

  const profile = await getProfile();
  if (profile) {
    await logClientActivity({
      clientId,
      actorId: profile.id,
      activityType: "commission_paid",
      description: `${actorName(profile)} hat Provision von ${formatCents(payoutCents)} ausgezahlt`,
      metadata: { amount_cents: payoutCents },
    });
  }

  revalidateFinance(clientId);
}

export async function updateCommissionStatus(
  clientId: string,
  status: CommissionStatus,
) {
  await requireFinanceAccess();

  if (!COMMISSION_STATUSES.includes(status)) {
    throw new Error("Ungültiger Provisionsstatus");
  }

  const supabase = await createClient();
  let clientResult = await supabase
    .from("clients")
    .select("commission_total_cents, commission_paid_cents")
    .eq("id", clientId)
    .single();

  if (
    clientResult.error &&
    isCommissionSchemaMissingError(clientResult.error.message)
  ) {
    const { error } = await supabase
      .from("clients")
      .update({ commission_status: status })
      .eq("id", clientId);
    if (error) throw new Error(error.message);
    revalidateFinance();
    return;
  }

  if (clientResult.error) throw new Error(clientResult.error.message);

  const { error } = await supabase
    .from("clients")
    .update({ commission_status: status })
    .eq("id", clientId);

  if (error) throw new Error(error.message);
  revalidateFinance();
}

export async function updateMemberCommissionRate(
  memberId: string,
  rate: number,
) {
  await requireFinanceAccess();

  if (rate < 0 || rate > 100) {
    throw new Error("Provisionssatz muss zwischen 0 und 100 liegen");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ commission_rate: rate })
    .eq("id", memberId);

  if (error) throw new Error(error.message);

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id")
    .eq("responsible_member_id", memberId);

  if (clientsError) throw new Error(clientsError.message);

  for (const client of clients ?? []) {
    await syncClientTotalRevenue(supabase, client.id);
  }

  revalidateFinance();
}

export async function payFreelancerPayout(clientId: string, formData: FormData) {
  await requireFinanceAccess();

  const payoutCents = parseEuroToCents(
    String(formData.get("payout_amount") ?? ""),
  );
  if (payoutCents == null || payoutCents <= 0) {
    throw new Error("Bitte einen gültigen Auszahlungsbetrag eingeben");
  }

  const supabase = await createClient();
  let clientResult = await supabase
    .from("clients")
    .select(
      "assigned_freelancer_id, freelancer_payout_cents, freelancer_paid_cents, freelancer_outstanding_cents",
    )
    .eq("id", clientId)
    .single();

  if (
    clientResult.error &&
    isClientFreelancerSchemaMissingError(clientResult.error.message)
  ) {
    throw new Error(
      "Freelancer-Auszahlungen sind erst nach Anwenden der Phase-1-Migration verfügbar.",
    );
  }

  if (clientResult.error) throw new Error(clientResult.error.message);

  const client = clientResult.data;
  const freelancerId = client.assigned_freelancer_id as string | null;
  if (!freelancerId) {
    throw new Error("Kein Freelancer für diesen Kunden zugewiesen");
  }

  const payout = applyFreelancerPayout({
    totalCents: (client.freelancer_payout_cents as number) ?? 0,
    paidCents: (client.freelancer_paid_cents as number) ?? 0,
    payoutCents,
  });

  const paidAt = new Date().toISOString();
  const payoutUpdate = {
    freelancer_paid_cents: payout.freelancer_paid_cents,
    freelancer_outstanding_cents: payout.freelancer_outstanding_cents,
    freelancer_payout_status: payout.freelancer_payout_status,
  };

  const { error } = await supabase
    .from("clients")
    .update(payoutUpdate)
    .eq("id", clientId);

  if (error) throw new Error(error.message);

  const { data: payoutRow, error: payoutInsertError } = await supabase
    .from("client_freelancer_payouts")
    .insert({
      client_id: clientId,
      freelancer_id: freelancerId,
      amount_cents: payoutCents,
      paid_at: paidAt,
      status: "paid",
    })
    .select("id")
    .single();

  if (payoutInsertError) {
    if (isClientFreelancerPayoutsSchemaMissingError(payoutInsertError.message)) {
      throw new Error(
        "Auszahlungshistorie ist erst nach Anwenden der Migration client_freelancer_payouts verfügbar.",
      );
    }
    throw new Error(payoutInsertError.message);
  }

  if (payoutRow?.id) {
    await createFreelancerProfileInvoiceForPayout({
      profileId: freelancerId,
      clientId,
      payoutId: payoutRow.id as string,
      amountCents: payoutCents,
      paidAt,
    });
  }

  const profile = await getProfile();
  if (profile) {
    await logClientActivity({
      clientId,
      actorId: profile.id,
      activityType: "contract_changed",
      description: `${actorName(profile)} hat Freelancer-Auszahlung von ${formatCents(payoutCents)} verbucht`,
      metadata: { amount_cents: payoutCents, freelancer_id: freelancerId },
    });
  }

  revalidateFinance(clientId);
  revalidatePath("/dashboard/finance/freelancers");
  revalidatePath(`/dashboard/finance/freelancers/${freelancerId}`);
}
