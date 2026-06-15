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

function centsToEuros(cents) {
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { data: client, error } = await supabase
    .from("clients")
    .select(
      "id, company_name, setter_id, closer_id, setup_fee_cents, total_revenue_cents, commission_total_cents, commission_paid_cents, commission_outstanding_cents",
    )
    .eq("company_name", "Leon")
    .single();

  if (error || !client) {
    console.error("Leon client not found:", error?.message);
    process.exit(1);
  }

  const { data: entry } = await supabase
    .from("commission_entries")
    .select(
      "id, client_id, setter_id, closer_id, project_value_cents, setter_commission_cents, closer_commission_cents, status",
    )
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: payouts } = await supabase
    .from("commission_payouts")
    .select("profile_id, amount_cents")
    .eq("commission_entry_id", entry?.id ?? "00000000-0000-0000-0000-000000000000");

  const paidProfiles = new Set((payouts ?? []).map((p) => p.profile_id));

  let commissionPaidCents = 0;
  let commissionOutstandingCents = 0;

  if (entry && entry.status !== "cancelled") {
    if (entry.setter_id && entry.setter_commission_cents > 0) {
      if (paidProfiles.has(entry.setter_id)) {
        commissionPaidCents += entry.setter_commission_cents;
      } else if (entry.status === "pending" || entry.status === "approved") {
        commissionOutstandingCents += entry.setter_commission_cents;
      }
    }
    if (entry.closer_id && entry.closer_commission_cents > 0) {
      if (paidProfiles.has(entry.closer_id)) {
        commissionPaidCents += entry.closer_commission_cents;
      } else if (entry.status === "pending" || entry.status === "approved") {
        commissionOutstandingCents += entry.closer_commission_cents;
      }
    }
  }

  const performance = {
    totalRevenueCents: entry?.project_value_cents ?? client.setup_fee_cents ?? 0,
    setterPaidCents: paidProfiles.has(client.setter_id)
      ? entry?.setter_commission_cents ?? 0
      : 0,
    closerPaidCents: paidProfiles.has(client.closer_id)
      ? entry?.closer_commission_cents ?? 0
      : 0,
    outstandingCommissionsCents: commissionOutstandingCents,
    paidCommissionsCents: commissionPaidCents,
  };

  const finance = {
    totalRevenueCents: client.total_revenue_cents ?? client.setup_fee_cents ?? 0,
    outstandingCommissionsCents: commissionOutstandingCents,
    paidCommissionsCents: commissionPaidCents,
    legacyOutstandingOnClient: client.commission_outstanding_cents,
  };

  console.log("=== Leon Finance + Performance Verification ===\n");
  console.log("Performance (entry-based):");
  console.log(`  Umsatz:              ${centsToEuros(performance.totalRevenueCents)}`);
  console.log(`  Setter bezahlt:      ${centsToEuros(performance.setterPaidCents)}`);
  console.log(`  Closer bezahlt:      ${centsToEuros(performance.closerPaidCents)}`);
  console.log(`  Offene Provisionen:  ${centsToEuros(performance.outstandingCommissionsCents)}`);
  console.log(`  Bezahlte Provisionen:${centsToEuros(performance.paidCommissionsCents)}`);

  console.log("\nFinanz-KPIs (entry-based, nach Phase 2):");
  console.log(`  Gesamtumsatz:         ${centsToEuros(finance.totalRevenueCents)}`);
  console.log(`  Offene Provisionen:  ${centsToEuros(finance.outstandingCommissionsCents)}`);
  console.log(`  Bezahlte Provisionen:${centsToEuros(finance.paidCommissionsCents)}`);
  console.log(
    `  Legacy clients.commission_outstanding_cents (unveraendert in DB): ${centsToEuros(finance.legacyOutstandingOnClient)}`,
  );

  const ok =
    performance.totalRevenueCents === 500_000 &&
    performance.setterPaidCents === 100_000 &&
    performance.closerPaidCents === 100_000 &&
    performance.outstandingCommissionsCents === 0 &&
    finance.outstandingCommissionsCents === 0 &&
    finance.paidCommissionsCents === performance.paidCommissionsCents;

  console.log(ok ? "\nPASS" : "\nFAIL");
  process.exit(ok ? 0 : 1);
}

main();
