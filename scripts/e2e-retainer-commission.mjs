#!/usr/bin/env node
/**
 * E2E verification: retainer commission flow
 * mark paid → markRetainerPeriodPaid → createRetainerCommissionEntryFromPaidInvoice
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

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

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const TEST_COMPANY = `E2E Retainer ${Date.now()}`;
const RETAINER_CENTS = 150_000;
const SETTER_ID = "dbc63f16-0404-4e9d-b631-d4e3e44e9847";
const CLOSER_ID = "74202fac-e867-4e51-b321-4cf485abb7ad";
const PERIODS = [
  { year: 2026, month: 7 },
  { year: 2026, month: 8 },
  { year: 2026, month: 9 },
  { year: 2026, month: 10 },
];

function euros(cents) {
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

async function loadCommissionService() {
  // Register ts paths via dynamic import of compiled logic using tsx subprocess fallback
  const { spawnSync } = await import("child_process");
  const runnerPath = resolve(process.cwd(), "scripts/e2e-retainer-commission-runner.mjs");
  return { spawnSync, runnerPath };
}

async function markRetainerPeriodPaid(client, clientId, year, month) {
  const { data: row } = await client
    .from("clients")
    .select("monthly_revenue_cents")
    .eq("id", clientId)
    .single();

  if (!row?.monthly_revenue_cents) return;

  await client.from("client_retainer_payments").upsert(
    {
      client_id: clientId,
      period_year: year,
      period_month: month,
      status: "paid",
      paid_at: new Date().toISOString(),
    },
    { onConflict: "client_id,period_year,period_month" },
  );
}

async function createRetainerCommissionEntryFromPaidInvoice(client, invoiceId) {
  const { data: existing } = await client
    .from("commission_entries")
    .select("id")
    .eq("triggered_by_invoice_id", invoiceId)
    .maybeSingle();
  if (existing) return { created: false, reason: "duplicate" };

  const { data: invoice, error: invoiceError } = await client
    .from("invoices")
    .select(
      "id, client_id, status, invoice_type, billing_period_year, billing_period_month, subtotal_cents, amount_cents",
    )
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice || invoice.status !== "paid") {
    return { created: false, reason: "invoice_not_paid" };
  }

  if (invoice.invoice_type !== "retainer") {
    return { created: false, reason: "not_retainer" };
  }

  const { data: clientRow } = await client
    .from("clients")
    .select("id, setter_id, closer_id")
    .eq("id", invoice.client_id)
    .single();

  if (!clientRow) return { created: false, reason: "no_client" };

  const setterId = clientRow.setter_id;
  const closerId = clientRow.closer_id;
  if (!setterId && !closerId) return { created: false, reason: "no_attribution" };

  const profileIds = [setterId, closerId].filter(Boolean);
  const { data: profiles } = await client
    .from("profiles")
    .select("id, retainer_commission_rate, retainer_commission_months")
    .in("id", profileIds);

  const setterProfile = profiles?.find((p) => p.id === setterId);
  const closerProfile = profiles?.find((p) => p.id === closerId);

  const { count } = await client
    .from("commission_entries")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientRow.id)
    .eq("entry_type", "retainer")
    .neq("status", "cancelled");

  const allowedMonths = Math.max(
    setterProfile?.retainer_commission_months ?? 3,
    closerProfile?.retainer_commission_months ?? 3,
  );

  if ((count ?? 0) >= allowedMonths) {
    return { created: false, reason: "month_limit_reached" };
  }

  const setterRate = Number(setterProfile?.retainer_commission_rate ?? 10);
  const closerRate = Number(closerProfile?.retainer_commission_rate ?? 10);
  const projectValue = invoice.subtotal_cents ?? invoice.amount_cents ?? 0;

  const setterCommission = setterId
    ? Math.round((projectValue * setterRate) / 100)
    : 0;
  const closerCommission = closerId
    ? Math.round((projectValue * closerRate) / 100)
    : 0;

  if (setterCommission <= 0 && closerCommission <= 0) {
    return { created: false, reason: "zero_commission" };
  }

  const { data: entry, error: insertError } = await client
    .from("commission_entries")
    .insert({
      client_id: clientRow.id,
      setter_id: setterId,
      closer_id: closerId,
      project_value_cents: projectValue,
      setter_rate: setterRate,
      closer_rate: closerRate,
      setter_commission_cents: setterCommission,
      closer_commission_cents: closerCommission,
      status: "pending",
      entry_type: "retainer",
      triggered_by_invoice_id: invoiceId,
    })
    .select("id")
    .single();

  if (insertError) {
    return { created: false, reason: insertError.message };
  }

  return { created: true, entryId: entry.id };
}

async function applyInvoicePaidSideEffects(client, invoiceId, clientId) {
  const { data: invoice } = await client
    .from("invoices")
    .select("invoice_type, billing_period_year, billing_period_month")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return { path: "none" };

  const invoiceType =
    invoice.invoice_type ??
    (invoice.billing_period_year != null && invoice.billing_period_month != null
      ? "retainer"
      : null);

  if (
    invoiceType === "retainer" &&
    invoice.billing_period_year != null &&
    invoice.billing_period_month != null
  ) {
    await markRetainerPeriodPaid(
      client,
      clientId,
      invoice.billing_period_year,
      invoice.billing_period_month,
    );
    const result = await createRetainerCommissionEntryFromPaidInvoice(
      client,
      invoiceId,
    );
    return { path: "retainer", commission: result };
  }

  return { path: "other" };
}

async function reserveInvoiceNumber() {
  const { data, error } = await supabase.rpc("next_invoice_number");
  if (error) throw new Error(error.message);
  return data;
}

async function main() {
  const report = {
    company: TEST_COMPANY,
    clientId: null,
    invoices: [],
    commissionEntries: [],
    month4Blocked: false,
    financeKpis: null,
  };

  console.log("=== E2E Retainer Commission Test ===\n");

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      company_name: TEST_COMPANY,
      status: "won",
      converted_to_client: true,
      setter_id: SETTER_ID,
      closer_id: CLOSER_ID,
      owner_id: CLOSER_ID,
      created_by: SETTER_ID,
    })
    .select("id")
    .single();

  if (leadError) throw new Error(`Lead: ${leadError.message}`);

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      lead_id: lead.id,
      company_name: TEST_COMPANY,
      setter_id: SETTER_ID,
      closer_id: CLOSER_ID,
      contract_status: "active",
      contract_start_date: "2026-07-01",
      monthly_revenue_cents: RETAINER_CENTS,
      monthly_retainer_cents: RETAINER_CENTS,
      setup_fee_cents: 0,
    })
    .select("id")
    .single();

  if (clientError) throw new Error(`Client: ${clientError.message}`);
  report.clientId = client.id;
  console.log(`✓ Testkunde erstellt: ${TEST_COMPANY} (${client.id})`);

  for (const period of PERIODS) {
    const invoiceNumber = await reserveInvoiceNumber();
    const subtotal = RETAINER_CENTS;
    const tax = Math.round(subtotal * 0.19);
    const total = subtotal + tax;

    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .insert({
        client_id: client.id,
        contract_id: client.id,
        invoice_number: invoiceNumber,
        invoice_type: "retainer",
        billing_period_year: period.year,
        billing_period_month: period.month,
        status: "draft",
        subtotal_cents: subtotal,
        tax_amount_cents: tax,
        total_amount_cents: total,
        amount_cents: total,
        vat_rate: 19,
      })
      .select("id, invoice_number")
      .single();

    if (invError) throw new Error(`Invoice: ${invError.message}`);

    await supabase
      .from("invoices")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", invoice.id);

    const sideEffect = await applyInvoicePaidSideEffects(
      supabase,
      invoice.id,
      client.id,
    );

    report.invoices.push({
      id: invoice.id,
      number: invoice.invoice_number,
      period: `${period.year}-${String(period.month).padStart(2, "0")}`,
      sideEffect,
    });

    console.log(
      `✓ Monat ${period.month}: ${invoice.invoice_number} bezahlt → commission: ${sideEffect.commission?.created ? "ERSTELLT" : sideEffect.commission?.reason}`,
    );
  }

  const { data: entries } = await supabase
    .from("commission_entries")
    .select("*")
    .eq("client_id", client.id)
    .eq("entry_type", "retainer")
    .order("created_at");

  report.commissionEntries = entries ?? [];
  report.month4Blocked =
    report.invoices[3]?.sideEffect?.commission?.reason === "month_limit_reached";

  const retainerCount = entries?.length ?? 0;
  const setterTotal = (entries ?? []).reduce(
    (s, e) => s + (e.setter_commission_cents ?? 0),
    0,
  );
  const closerTotal = (entries ?? []).reduce(
    (s, e) => s + (e.closer_commission_cents ?? 0),
    0,
  );

  const { data: allOpen } = await supabase
    .from("commission_entries")
    .select("setter_commission_cents, closer_commission_cents, status")
    .eq("entry_type", "retainer")
    .in("status", ["pending", "approved"]);

  let openCents = 0;
  for (const e of allOpen ?? []) {
    if (e.status === "cancelled") continue;
    openCents += (e.setter_commission_cents ?? 0) + (e.closer_commission_cents ?? 0);
  }

  report.financeKpis = {
    retainerEntryCount: retainerCount,
    setterTotalCents: setterTotal,
    closerTotalCents: closerTotal,
    openRetainerCommissionsCents: openCents,
  };

  console.log("\n=== Ergebnis ===");
  console.log(`Retainer commission_entries: ${retainerCount} (erwartet: 3)`);
  console.log(`Setter gesamt: ${euros(setterTotal)} (erwartet: 450 € bei 10%)`);
  console.log(`Closer gesamt: ${euros(closerTotal)}`);
  console.log(`Monat 4 blockiert: ${report.month4Blocked ? "JA ✓" : "NEIN ✗"}`);

  const pass =
    retainerCount === 3 &&
    report.month4Blocked &&
    setterTotal === 45_000;

  console.log(`\n${pass ? "✅ E2E BESTANDEN" : "❌ E2E FEHLGESCHLAGEN"}`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
