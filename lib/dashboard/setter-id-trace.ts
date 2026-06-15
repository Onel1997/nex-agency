/**
 * Structured setter_id tracing for the Lead → Client → Contract → Commission flow.
 * Enable with SETTER_ID_TRACE=1 in .env.local
 */

export type SetterIdTraceStage =
  | "1_lead_created"
  | "2_appointment"
  | "3_closer_claimed"
  | "4_status_won"
  | "5_client_conversion"
  | "6_contract_open"
  | "7_contract_before_save"
  | "8_contract_after_save"
  | "9_commission_entry";

export interface SetterIdTracePayload {
  leadId?: string | null;
  clientId?: string | null;
  companyName?: string | null;
  leadSetterId?: string | null;
  clientSetterId?: string | null;
  closerId?: string | null;
  commissionEntrySetterId?: string | null;
  resolvedSetterId?: string | null;
  setterName?: string | null;
  source?: string;
  note?: string;
}

function isTraceEnabled(): boolean {
  return process.env.SETTER_ID_TRACE === "1";
}

export function traceSetterId(
  stage: SetterIdTraceStage,
  payload: SetterIdTracePayload,
): void {
  if (!isTraceEnabled()) return;

  console.log(
    `[setter-id-trace:${stage}]`,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        stage,
        ...payload,
      },
      null,
      2,
    ),
  );
}

export async function fetchLeadSetterSnapshot(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  leadId: string,
): Promise<{
  leadSetterId: string | null;
  closerId: string | null;
  companyName: string | null;
}> {
  const { data } = await supabase
    .from("leads")
    .select("setter_id, closer_id, company_name")
    .eq("id", leadId)
    .maybeSingle();

  return {
    leadSetterId: (data?.setter_id as string | null) ?? null,
    closerId: (data?.closer_id as string | null) ?? null,
    companyName: (data?.company_name as string | null) ?? null,
  };
}

export async function fetchClientSetterSnapshot(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  clientId: string,
): Promise<{
  clientSetterId: string | null;
  closerId: string | null;
  leadId: string | null;
  companyName: string | null;
}> {
  const { data } = await supabase
    .from("clients")
    .select("setter_id, closer_id, lead_id, company_name")
    .eq("id", clientId)
    .maybeSingle();

  return {
    clientSetterId: (data?.setter_id as string | null) ?? null,
    closerId: (data?.closer_id as string | null) ?? null,
    leadId: (data?.lead_id as string | null) ?? null,
    companyName: (data?.company_name as string | null) ?? null,
  };
}
