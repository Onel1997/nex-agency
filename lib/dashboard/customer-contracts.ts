import { isManagement } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import {
  CONTRACT_STATUS_LABELS,
  type ContractStatus,
} from "./constants";
import { formatCents } from "./format";
import type { CustomerContractOverviewRecord } from "./types";
import { createClient } from "@/lib/supabase/server";

export async function getCustomerContractOverviews(): Promise<
  CustomerContractOverviewRecord[]
> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      `
      id,
      company_name,
      contract_status,
      contract_start_date,
      setup_fee_cents,
      monthly_revenue_cents,
      monthly_retainer_cents,
      billing_cycle,
      auto_invoice_enabled,
      created_at
    `,
    )
    .eq("is_archived", false)
    .is("deleted_at", null)
    .not("contract_start_date", "is", null)
    .order("contract_start_date", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    company_name: row.company_name as string,
    contract_status: (row.contract_status as string | null) ?? "draft",
    contract_status_label:
      CONTRACT_STATUS_LABELS[
        ((row.contract_status as ContractStatus | null) ?? "draft")
      ],
    contract_start_date: (row.contract_start_date as string | null) ?? null,
    setup_fee_cents: (row.setup_fee_cents as number | null) ?? null,
    monthly_revenue_cents:
      (row.monthly_revenue_cents as number | null) ??
      (row.monthly_retainer_cents as number | null) ??
      null,
    billing_cycle: (row.billing_cycle as string | null) ?? null,
    auto_invoice_enabled: Boolean(row.auto_invoice_enabled),
    setup_fee_label:
      row.setup_fee_cents != null ? formatCents(row.setup_fee_cents as number) : "—",
    monthly_revenue_label:
      row.monthly_revenue_cents != null || row.monthly_retainer_cents != null
        ? formatCents(
            ((row.monthly_revenue_cents as number | null) ??
              (row.monthly_retainer_cents as number | null) ??
              0) as number,
          )
        : "—",
    created_at: row.created_at as string,
  }));
}
