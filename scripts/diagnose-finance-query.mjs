#!/usr/bin/env node
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

const CLIENT_REVENUE_SELECT_WITH_CONTRACT = `
  id,
  company_name,
  responsible_member_id,
  setter_id,
  closer_id,
  acquired_by,
  monthly_revenue_cents,
  monthly_retainer_cents,
  setup_fee_cents,
  contract_start_date,
  contract_status,
  auto_invoice_enabled,
  total_revenue_cents,
  commission_status,
  commission_total_cents,
  commission_paid_cents,
  commission_outstanding_cents,
  assigned_freelancer_id,
  freelancer_commission_rate,
  freelancer_payout_cents,
  freelancer_paid_cents,
  freelancer_outstanding_cents,
  freelancer_payout_status,
  currency,
  responsible_member:profiles!clients_responsible_member_id_fkey(full_name, email, commission_rate),
  assigned_freelancer:profiles!clients_assigned_freelancer_id_fkey(full_name, email),
  setter:profiles!clients_setter_id_fkey(full_name, email, setter_commission_rate, agency_role),
  closer:profiles!clients_closer_id_fkey(full_name, email, closer_commission_rate, agency_role),
  lead:leads!clients_lead_id_fkey(
    owner_id,
    setter_id,
    created_by,
    setter:profiles!leads_setter_id_fkey(full_name, email, setter_commission_rate, agency_role),
    creator:profiles!leads_created_by_fkey(full_name, email, setter_commission_rate, agency_role)
  )
`;

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const clientId = process.argv[2] || "afd03c42-4f2c-4f0d-96e3-14f65bf57987";

async function main() {
  console.log("=== Exact finance query (CLIENT_REVENUE_SELECT_WITH_CONTRACT) ===\n");
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_REVENUE_SELECT_WITH_CONTRACT)
    .eq("id", clientId)
    .single();

  if (error) {
    console.error("QUERY FAILED:", error.message);
    console.error("Code:", error.code);
    console.error("Details:", error.details);
    console.error("Hint:", error.hint);
    return;
  }

  console.log("Top-level setter_id:", data.setter_id);
  console.log("Top-level closer_id:", data.closer_id);
  console.log("acquired_by:", data.acquired_by);
  console.log("setter join:", data.setter);
  console.log("closer join:", data.closer);
  console.log("lead embed:", data.lead);

  const { data: migrations } = await supabase
    .from("schema_migrations")
    .select("version")
    .like("version", "%attribution%");

  console.log("\n=== Attribution-related migrations in DB ===");
  console.log(migrations?.map((m) => m.version) ?? "schema_migrations not readable");
}

main();
