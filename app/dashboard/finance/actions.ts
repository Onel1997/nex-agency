"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceAccess } from "@/lib/auth/session";
import {
  applyCommissionPayout,
  isCommissionPayoutsSchemaMissingError,
  isCommissionSchemaMissingError,
  syncCommissionAmounts,
} from "@/lib/dashboard/commission";
import {
  COMMISSION_STATUSES,
  type CommissionStatus,
} from "@/lib/dashboard/constants";
import { parseEuroToCents } from "@/lib/dashboard/format";
import { isRetainerSchemaMissingError } from "@/lib/dashboard/retainer-data";
import {
  buildRetainerStats,
  hasActiveRetainer,
  type RetainerPaymentRecord,
} from "@/lib/dashboard/retainer";
import { getProfile } from "@/lib/auth/session";
import { logClientActivity } from "@/lib/dashboard/client-activities";
import { formatCents } from "@/lib/dashboard/format";
import { createClient } from "@/lib/supabase/server";

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

async function purgeRetainerPayments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
) {
  const { error } = await supabase
    .from("client_retainer_payments")
    .delete()
    .eq("client_id", clientId);

  if (error && !isRetainerSchemaMissingError(error.message)) {
    throw new Error(error.message);
  }
}

async function getClientPayments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
): Promise<RetainerPaymentRecord[]> {
  const { data, error } = await supabase
    .from("client_retainer_payments")
    .select("period_year, period_month, status, paid_at")
    .eq("client_id", clientId);

  if (error) {
    if (isRetainerSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((payment) => ({
    period_year: payment.period_year as number,
    period_month: payment.period_month as number,
    status: payment.status as RetainerPaymentRecord["status"],
    paid_at: (payment.paid_at as string | null) ?? null,
  }));
}

async function fetchClientForCommissionSync(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
) {
  let clientResult = await supabase
    .from("clients")
    .select(
      `
      setup_fee_cents,
      monthly_revenue_cents,
      contract_start_date,
      commission_status,
      commission_total_cents,
      commission_paid_cents,
      responsible_member:profiles!clients_responsible_member_id_fkey(commission_rate)
    `,
    )
    .eq("id", clientId)
    .single();

  if (
    clientResult.error &&
    isCommissionSchemaMissingError(clientResult.error.message)
  ) {
    clientResult = await supabase
      .from("clients")
      .select(
        `
        setup_fee_cents,
        monthly_revenue_cents,
        contract_start_date,
        commission_status,
        responsible_member:profiles!clients_responsible_member_id_fkey(commission_rate)
      `,
      )
      .eq("id", clientId)
      .single();
  }

  if (
    clientResult.error &&
    isRetainerSchemaMissingError(clientResult.error.message)
  ) {
    clientResult = await supabase
      .from("clients")
      .select(
        `
        setup_fee_cents,
        monthly_revenue_cents,
        commission_status,
        commission_total_cents,
        commission_paid_cents,
        responsible_member:profiles!clients_responsible_member_id_fkey(commission_rate)
      `,
      )
      .eq("id", clientId)
      .single();

    if (
      clientResult.error &&
      isCommissionSchemaMissingError(clientResult.error.message)
    ) {
      clientResult = await supabase
        .from("clients")
        .select(
          `
          setup_fee_cents,
          monthly_revenue_cents,
          commission_status,
          responsible_member:profiles!clients_responsible_member_id_fkey(commission_rate)
        `,
        )
        .eq("id", clientId)
        .single();
    }
  }

  return clientResult;
}

async function syncClientTotalRevenue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
) {
  const clientResult = await fetchClientForCommissionSync(supabase, clientId);
  if (clientResult.error) throw new Error(clientResult.error.message);
  const client = clientResult.data;

  const member = Array.isArray(client.responsible_member)
    ? client.responsible_member[0]
    : client.responsible_member;
  const commissionRate =
    (member as { commission_rate: number } | null)?.commission_rate ?? 0;

  const payments = await getClientPayments(supabase, clientId);
  const retainerStats = buildRetainerStats({
    contract_start_date: (client.contract_start_date as string | null) ?? null,
    setup_fee_cents: (client.setup_fee_cents as number | null) ?? null,
    monthly_revenue_cents: (client.monthly_revenue_cents as number | null) ?? null,
    payments,
  });

  const setupFeeCents = (client.setup_fee_cents as number | null) ?? 0;
  const hasCommissionSchema = client.commission_total_cents !== undefined;

  const commissionSync = syncCommissionAmounts({
    setupFeeCents: client.setup_fee_cents as number | null,
    commissionRate,
    currentTotalCents: hasCommissionSchema
      ? ((client.commission_total_cents as number) ?? 0)
      : 0,
    currentPaidCents: hasCommissionSchema
      ? ((client.commission_paid_cents as number) ?? 0)
      : 0,
  });

  const updatePayload: Record<string, unknown> = {
    total_revenue_cents:
      retainerStats.total_revenue_cents > 0
        ? retainerStats.total_revenue_cents
        : null,
    commission_status: commissionSync.commission_status,
  };

  if (hasCommissionSchema) {
    updatePayload.commission_total_cents = commissionSync.commission_total_cents;
    updatePayload.commission_paid_cents = commissionSync.commission_paid_cents;
    updatePayload.commission_outstanding_cents =
      commissionSync.commission_outstanding_cents;
  } else if (setupFeeCents <= 0) {
    updatePayload.commission_status = "none";
  }

  const { error: updateError } = await supabase
    .from("clients")
    .update(updatePayload)
    .eq("id", clientId);

  if (updateError) throw new Error(updateError.message);
}

export async function updateClientRevenue(
  clientId: string,
  formData: FormData,
) {
  await requireFinanceAccess();

  const monthlyRevenueCents = parseEuroToCents(
    String(formData.get("monthly_revenue") ?? ""),
  );
  const setupFeeCents = parseEuroToCents(String(formData.get("setup_fee") ?? ""));
  const contractStartDate = String(formData.get("contract_start_date") ?? "").trim();

  const supabase = await createClient();
  const updatePayload: {
    monthly_revenue_cents: number | null;
    setup_fee_cents: number | null;
    contract_start_date?: string | null;
  } = {
    monthly_revenue_cents: monthlyRevenueCents,
    setup_fee_cents: setupFeeCents,
  };

  if (contractStartDate) {
    updatePayload.contract_start_date = contractStartDate;
  }

  let { error } = await supabase
    .from("clients")
    .update(updatePayload)
    .eq("id", clientId);

  if (error && isRetainerSchemaMissingError(error.message)) {
    ({ error } = await supabase
      .from("clients")
      .update({
        monthly_revenue_cents: monthlyRevenueCents,
        setup_fee_cents: setupFeeCents,
      })
      .eq("id", clientId));
  }

  if (error) throw new Error(error.message);

  if (!hasActiveRetainer(monthlyRevenueCents)) {
    await purgeRetainerPayments(supabase, clientId);
  }

  await syncClientTotalRevenue(supabase, clientId);

  const profile = await getProfile();
  if (profile) {
    await logClientActivity({
      clientId,
      actorId: profile.id,
      activityType: "contract_changed",
      description: `${actorName(profile)} hat Vertragsdaten geändert`,
    });
  }

  revalidateFinance(clientId);
}

export async function updateRetainerPaymentStatus(
  clientId: string,
  periodYear: number,
  periodMonth: number,
  status: "paid" | "open",
) {
  await requireFinanceAccess();

  const supabase = await createClient();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("monthly_revenue_cents")
    .eq("id", clientId)
    .single();

  if (clientError) throw new Error(clientError.message);
  if (!hasActiveRetainer(client.monthly_revenue_cents as number | null)) {
    throw new Error("Für Kunden ohne monatlichen Retainer gibt es keine Retainer-Zahlungen.");
  }

  const { error } = await supabase.from("client_retainer_payments").upsert(
    {
      client_id: clientId,
      period_year: periodYear,
      period_month: periodMonth,
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    },
    { onConflict: "client_id,period_year,period_month" },
  );

  if (error) {
    if (isRetainerSchemaMissingError(error.message)) {
      throw new Error(
        "Retainer-Zahlungen sind erst nach Anwenden der Datenbank-Migration verfügbar.",
      );
    }
    throw new Error(error.message);
  }

  await syncClientTotalRevenue(supabase, clientId);
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
