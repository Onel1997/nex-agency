#!/usr/bin/env node
/**
 * Raw DB diagnostic for setter attribution E2E.
 * Usage: node scripts/diagnose-setter-attribution.mjs [leadId|clientId]
 */
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

function fmt(row) {
  return JSON.stringify(row, null, 2);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const arg = process.argv[2];

async function profileLabel(id) {
  if (!id) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, agency_role, role")
    .eq("id", id)
    .maybeSingle();
  if (!data) return `${id} (profile not found)`;
  return `${data.full_name || data.email} [${data.agency_role || data.role}] (${id})`;
}

async function diagnoseLead(lead) {
  const { data: client } = await supabase
    .from("clients")
    .select("id, lead_id, setter_id, closer_id, company_name, acquired_by")
    .eq("lead_id", lead.id)
    .maybeSingle();

  console.log("\n=== LEAD (raw DB) ===");
  console.log(fmt({
    id: lead.id,
    status: lead.status,
    created_by: lead.created_by,
    acquired_by: lead.acquired_by,
    setter_id: lead.setter_id,
    closer_id: lead.closer_id,
    converted_to_client: lead.converted_to_client,
  }));

  console.log("\n=== LEAD profiles ===");
  console.log("created_by:", await profileLabel(lead.created_by));
  console.log("setter_id:", await profileLabel(lead.setter_id));
  console.log("closer_id:", await profileLabel(lead.closer_id));

  if (client) {
    console.log("\n=== CLIENT (raw DB) — Vertragsmodul source ===");
    console.log("NOTE: clients table has NO created_by column");
    console.log(fmt({
      id: client.id,
      lead_id: client.lead_id,
      setter_id: client.setter_id,
      closer_id: client.closer_id,
      acquired_by: client.acquired_by,
    }));
    console.log("\n=== CLIENT profiles ===");
    console.log("setter_id:", await profileLabel(client.setter_id));
    console.log("closer_id:", await profileLabel(client.closer_id));

    const { data: setterProfile } = client.setter_id
      ? await supabase
          .from("profiles")
          .select("id, full_name, email, setter_commission_rate, agency_role")
          .eq("id", client.setter_id)
          .maybeSingle()
      : { data: null };

    console.log("\n=== FINANCE / UI resolution simulation ===");
    const resolvedSetterId =
      client.setter_id ?? lead.setter_id ?? null;
    const resolvedCloserId = client.closer_id ?? lead.closer_id ?? null;
    console.log("resolvedSetterId (sync fallback chain):", resolvedSetterId);
    console.log("resolvedCloserId:", resolvedCloserId);
    console.log("setter profile join:", setterProfile);
    console.log(
      "UI would show setter name:",
      setterProfile?.full_name?.trim() ||
        setterProfile?.email?.split("@")[0] ||
        (resolvedSetterId ? "— (id present, no name)" : "Nicht zugewiesen"),
    );
  } else {
    console.log("\n=== CLIENT ===");
    console.log("No client row linked to this lead yet.");
  }

  console.log("\n=== CONTRACT table (public.contracts) ===");
  console.log(
    "NOTE: This table is for TEAM employment contracts (profile_id), NOT client deals.",
  );
  console.log("No client_id / setter_id / closer_id on public.contracts for this flow.");

  const { data: activities } = await supabase
    .from("activities")
    .select("action, metadata, created_at")
    .eq("entity_type", "lead")
    .eq("entity_id", lead.id)
    .order("created_at", { ascending: true });

  if (activities?.length) {
    console.log("\n=== LEAD activity timeline (status transitions) ===");
    for (const a of activities) {
      if (
        a.action === "lead_created" ||
        a.action === "lead_status_changed" ||
        a.action === "lead_claimed" ||
        a.action === "lead_converted"
      ) {
        console.log(`- ${a.created_at} ${a.action}`, a.metadata);
      }
    }
  }
}

async function main() {
  if (arg) {
    let lead = null;
    const { data: byLead } = await supabase
      .from("leads")
      .select(
        "id, status, created_by, acquired_by, setter_id, closer_id, converted_to_client, company_name, created_at",
      )
      .eq("id", arg)
      .maybeSingle();
    if (byLead) lead = byLead;
    else {
      const { data: client } = await supabase
        .from("clients")
        .select("lead_id")
        .eq("id", arg)
        .maybeSingle();
      if (client?.lead_id) {
        const { data } = await supabase
          .from("leads")
          .select(
            "id, status, created_by, acquired_by, setter_id, closer_id, converted_to_client, company_name, created_at",
          )
          .eq("id", client.lead_id)
          .maybeSingle();
        lead = data;
      }
    }
    if (!lead) {
      console.error("No lead found for id:", arg);
      process.exit(1);
    }
    console.log(`Diagnosing: ${lead.company_name} (${lead.id})`);
    await diagnoseLead(lead);
    return;
  }

  console.log("=== Recent leads in setter→closer workflow ===\n");
  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "id, company_name, status, created_by, acquired_by, setter_id, closer_id, converted_to_client, created_at",
    )
    .in("status", ["scheduled", "qualified", "proposal", "won"])
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (!leads?.length) {
    console.log("No leads found in workflow statuses.");
    return;
  }

  for (const lead of leads) {
    const flags = [
      lead.setter_id ? "setter✓" : "setter✗",
      lead.closer_id ? "closer✓" : "closer✗",
      lead.converted_to_client ? "client✓" : "client✗",
    ].join(" ");
    console.log(
      `${lead.created_at} | ${lead.status.padEnd(10)} | ${flags} | ${lead.company_name} | ${lead.id}`,
    );
  }

  const wonConverted = leads.find((l) => l.status === "won" && l.converted_to_client);
  const target = wonConverted ?? leads.find((l) => l.status === "won") ?? leads[0];
  console.log(`\n--- Full diagnosis for: ${target.company_name} ---`);
  await diagnoseLead(target);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
