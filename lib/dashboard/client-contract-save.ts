import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommissionStatus, ContractStatus } from "./constants";
import {
  COMMISSION_STATUSES,
  CONTRACT_STATUSES,
} from "./constants";
import { parseEuroToCents } from "./format";
import { resolveRetainerAmountCents } from "./billing-cycle";
import { hasActiveRetainer } from "./retainer";
import {
  createSetupInvoiceForClient,
  type CreateSetupInvoiceResult,
} from "./invoice-contract-actions";
import { purgeRetainerPayments, syncClientTotalRevenue } from "./client-revenue-sync";

export interface SaveClientContractInput {
  monthlyRevenueCents: number | null;
  setupFeeCents: number | null;
  contractStartDate: string | null;
  contractStatus: ContractStatus;
  autoInvoiceEnabled: boolean;
  commissionStatus: CommissionStatus;
  createSetupInvoice?: boolean;
}

export interface SaveClientContractResult {
  setupInvoice: CreateSetupInvoiceResult | null;
}

function validateContractStatus(value: string): ContractStatus {
  if (CONTRACT_STATUSES.includes(value as ContractStatus)) {
    return value as ContractStatus;
  }
  throw new Error("Ungültiger Vertragsstatus");
}

function validateCommissionStatus(value: string): CommissionStatus {
  if (COMMISSION_STATUSES.includes(value as CommissionStatus)) {
    return value as CommissionStatus;
  }
  throw new Error("Ungültiger Provisionsstatus");
}

export async function saveClientContractData(
  supabase: SupabaseClient,
  clientId: string,
  input: SaveClientContractInput,
  profileId?: string | null,
): Promise<SaveClientContractResult> {
  const updatePayload: Record<string, unknown> = {
    monthly_revenue_cents: input.monthlyRevenueCents,
    monthly_retainer_cents: input.monthlyRevenueCents,
    setup_fee_cents: input.setupFeeCents,
    contract_status: input.contractStatus,
    auto_invoice_enabled: input.autoInvoiceEnabled,
    commission_status: input.commissionStatus,
  };

  if (input.contractStartDate) {
    updatePayload.contract_start_date = input.contractStartDate;
  }

  if (
    input.autoInvoiceEnabled &&
    resolveRetainerAmountCents({
      monthly_retainer_cents: input.monthlyRevenueCents,
      monthly_revenue_cents: input.monthlyRevenueCents,
    }) > 0
  ) {
    const { data: existing } = await supabase
      .from("clients")
      .select("next_invoice_date")
      .eq("id", clientId)
      .maybeSingle();

    if (!existing?.next_invoice_date) {
      updatePayload.next_invoice_date = new Date().toISOString().slice(0, 10);
    }
  }

  let { error } = await supabase
    .from("clients")
    .update(updatePayload)
    .eq("id", clientId);

  if (error && error.message.toLowerCase().includes("contract_status")) {
    const { contract_status: _, auto_invoice_enabled: __, ...withoutStatus } =
      updatePayload;
    ({ error } = await supabase
      .from("clients")
      .update(withoutStatus)
      .eq("id", clientId));
  }

  if (error && error.message.toLowerCase().includes("contract_start_date")) {
    ({ error } = await supabase
      .from("clients")
      .update({
        monthly_revenue_cents: input.monthlyRevenueCents,
        monthly_retainer_cents: input.monthlyRevenueCents,
        setup_fee_cents: input.setupFeeCents,
        commission_status: input.commissionStatus,
      })
      .eq("id", clientId));
  }

  if (error) throw new Error(error.message);

  if (!hasActiveRetainer(input.monthlyRevenueCents)) {
    await purgeRetainerPayments(supabase, clientId);
  }

  await syncClientTotalRevenue(supabase, clientId);

  let setupInvoice: CreateSetupInvoiceResult | null = null;
  if (
    input.createSetupInvoice &&
    input.setupFeeCents != null &&
    input.setupFeeCents > 0 &&
    profileId
  ) {
    setupInvoice = await createSetupInvoiceForClient(supabase, {
      clientId,
      profileId,
    });
  }

  return { setupInvoice };
}

export function parseClientContractFormData(formData: FormData): SaveClientContractInput {
  const monthlyRevenueCents = parseEuroToCents(
    String(formData.get("monthly_revenue") ?? ""),
  );
  const setupFeeCents = parseEuroToCents(String(formData.get("setup_fee") ?? ""));
  const contractStartDate = String(formData.get("contract_start_date") ?? "").trim();
  const createSetupInvoice =
    String(formData.get("create_setup_invoice") ?? "") === "on";

  return {
    monthlyRevenueCents,
    setupFeeCents,
    contractStartDate: contractStartDate || null,
    contractStatus: validateContractStatus(
      String(formData.get("contract_status") ?? "draft"),
    ),
    autoInvoiceEnabled: String(formData.get("auto_invoice_enabled") ?? "") === "on",
    commissionStatus: validateCommissionStatus(
      String(formData.get("commission_status") ?? "none"),
    ),
    createSetupInvoice,
  };
}
