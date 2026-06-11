"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceAccess } from "@/lib/auth/session";
import {
  COMMISSION_STATUSES,
  type CommissionStatus,
} from "@/lib/dashboard/constants";
import { computeTotalRevenueCents } from "@/lib/dashboard/finance";
import { parseEuroToCents } from "@/lib/dashboard/format";
import { createClient } from "@/lib/supabase/server";

function revalidateFinance() {
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/performance");
  revalidatePath("/dashboard");
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
  const totalRevenueInput = parseEuroToCents(
    String(formData.get("total_revenue") ?? ""),
  );

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("clients")
    .select("contract_value_cents, commission_status")
    .eq("id", clientId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const totalRevenueCents =
    totalRevenueInput ??
    computeTotalRevenueCents(
      setupFeeCents,
      monthlyRevenueCents,
      existing.contract_value_cents,
    );

  let commissionStatus = existing.commission_status as CommissionStatus;
  if (totalRevenueCents && totalRevenueCents > 0 && commissionStatus === "none") {
    commissionStatus = "pending";
  }
  if (!totalRevenueCents || totalRevenueCents <= 0) {
    commissionStatus = "none";
  }

  const { error } = await supabase
    .from("clients")
    .update({
      monthly_revenue_cents: monthlyRevenueCents,
      setup_fee_cents: setupFeeCents,
      total_revenue_cents: totalRevenueCents,
      commission_status: commissionStatus,
    })
    .eq("id", clientId);

  if (error) throw new Error(error.message);
  revalidateFinance();
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
  revalidateFinance();
}
