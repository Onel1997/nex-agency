import { createClient } from "@/lib/supabase/server";
import { getClientRevenueRecordById } from "@/lib/dashboard/finance";
import { resolveClientSetterId } from "@/lib/dashboard/lead-attribution";
import { CLIENT_REVENUE_SELECT_WITH_CONTRACT } from "@/lib/dashboard/retainer-data";

export interface AttributionWorkflowStage {
  stage: string;
  timestamp: string | null;
  note: string;
}

export interface SetterAttributionDiagnosis {
  generatedAt: string;
  workflowTimeline: AttributionWorkflowStage[];
  lead: {
    id: string | null;
    status: string | null;
    created_by: string | null;
    acquired_by: string | null;
    setter_id: string | null;
    closer_id: string | null;
    converted_to_client: boolean | null;
  } | null;
  client: {
    id: string | null;
    lead_id: string | null;
    created_by: null;
    created_by_note: string;
    setter_id: string | null;
    closer_id: string | null;
    acquired_by: string | null;
    responsible_member_id: string | null;
  } | null;
  contract: {
    note: string;
    id: string | null;
    client_id: string | null;
    setter_id: string | null;
    closer_id: string | null;
  };
  financeQuery: {
    querySucceeded: boolean;
    queryError: string | null;
    rawClientSetterId: string | null;
    rawClientCloserId: string | null;
    rawLeadSetterId: string | null;
    rawLeadCreatedBy: string | null;
    setterProfileJoin: Record<string, unknown> | null;
    closerProfileJoin: Record<string, unknown> | null;
    resolvedSetterId: string | null;
    resolvedCloserId: string | null;
  };
  uiOutput: {
    revenueRecordLoaded: boolean;
    revenueSetterId: string | null;
    revenueSetterName: string | null;
    revenueCloserId: string | null;
    revenueCloserName: string | null;
    salesAttributionSource: string;
  };
  checks: {
    setterIdStoredInLeadDb: boolean;
    setterIdStoredInClientDb: boolean;
    setterIdSurvivesScheduledTransition: string;
    setterIdSurvivesLeadToClientTransfer: string;
    setterIdSurvivesClientToContractTransfer: string;
    uiLoadsSetterFromField: string;
    attributionProfileRlsMigrationApplied: boolean;
  };
  lossPoint: string;
}

function readLeadEmbed(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function readProfileJoin(value: unknown): Record<string, unknown> | null {
  const profile = Array.isArray(value) ? value[0] : value;
  if (!profile || typeof profile !== "object") return null;
  return profile as Record<string, unknown>;
}

export async function getSetterAttributionDiagnosis(
  clientId: string,
): Promise<SetterAttributionDiagnosis | null> {
  const supabase = await createClient();

  const { data: clientRow, error: clientError } = await supabase
    .from("clients")
    .select("id, lead_id, setter_id, closer_id, acquired_by, responsible_member_id, company_name")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError || !clientRow) return null;

  const leadId = (clientRow.lead_id as string | null) ?? null;
  const { data: leadRow } = leadId
    ? await supabase
        .from("leads")
        .select(
          "id, status, created_by, acquired_by, setter_id, closer_id, converted_to_client",
        )
        .eq("id", leadId)
        .maybeSingle()
    : { data: null };

  const { data: leadActivities } = leadId
    ? await supabase
        .from("activity_logs")
        .select("action, metadata, created_at")
        .eq("entity_type", "lead")
        .eq("entity_id", leadId)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: clientActivities } = await supabase
    .from("activity_logs")
    .select("action, metadata, created_at")
    .eq("entity_type", "client")
    .eq("entity_id", clientId)
    .order("created_at", { ascending: true });

  const workflowTimeline: AttributionWorkflowStage[] = [];
  for (const entry of leadActivities ?? []) {
    if (entry.action === "lead_created") {
      workflowTimeline.push({
        stage: "Lead erstellt",
        timestamp: entry.created_at as string,
        note: "DB-Snapshot pro Stufe nicht historisiert — nur Aktivitätslog",
      });
    }
    if (entry.action === "lead_status_changed") {
      const meta = entry.metadata as { from?: string; to?: string };
      if (meta.to === "scheduled") {
        workflowTimeline.push({
          stage: "Terminiert",
          timestamp: entry.created_at as string,
          note: `Status ${meta.from ?? "?"} → scheduled`,
        });
      }
      if (meta.to === "won") {
        workflowTimeline.push({
          stage: "Gewonnen",
          timestamp: entry.created_at as string,
          note: `Status ${meta.from ?? "?"} → won`,
        });
      }
    }
    if (entry.action === "lead_claimed") {
      workflowTimeline.push({
        stage: "Übernommen (Closer)",
        timestamp: entry.created_at as string,
        note: "closer_id am Lead gesetzt",
      });
    }
  }
  for (const entry of clientActivities ?? []) {
    if (entry.action === "lead_converted") {
      workflowTimeline.push({
        stage: "Vertrag / Kunde",
        timestamp: entry.created_at as string,
        note: "Lead → Client Konvertierung",
      });
    }
  }

  const { data: financeRow, error: financeError } = await supabase
    .from("clients")
    .select(CLIENT_REVENUE_SELECT_WITH_CONTRACT)
    .eq("id", clientId)
    .maybeSingle();

  const leadEmbed = readLeadEmbed(financeRow?.lead) as {
    setter_id?: string | null;
    created_by?: string | null;
    owner_id?: string | null;
  } | null;

  const resolvedSetterId = financeRow
    ? await resolveClientSetterId(supabase, {
        clientSetterId: (financeRow.setter_id as string | null) ?? null,
        leadSetterId: leadEmbed?.setter_id ?? null,
        leadCreatedBy: leadEmbed?.created_by ?? null,
        leadOwnerId: leadEmbed?.owner_id ?? null,
      })
    : null;

  const revenue = await getClientRevenueRecordById(clientId);

  const setterProfileId =
    (leadRow?.setter_id as string | null) ??
    (clientRow.setter_id as string | null);
  const { error: rlsRpcError } = setterProfileId
    ? await supabase.rpc("can_read_attribution_profile", {
        p_profile_id: setterProfileId,
      })
    : { error: { message: "no setter profile id" } };
  const attributionProfileRlsMigrationApplied = !rlsRpcError;

  const setterIdStoredInLeadDb = Boolean(leadRow?.setter_id);
  const setterIdStoredInClientDb = Boolean(clientRow.setter_id);
  const setterProfileJoin = readProfileJoin(financeRow?.setter);
  const closerProfileJoin = readProfileJoin(financeRow?.closer);

  let lossPoint =
    "Kein Verlust in der Datenbank festgestellt — setter_id ist auf Lead und Client gespeichert.";

  if (!setterIdStoredInLeadDb) {
    lossPoint = "Verlust/Stufe LEAD: setter_id fehlt in leads.";
  } else if (!setterIdStoredInClientDb) {
    lossPoint = "Verlust bei Lead→Client: client.setter_id fehlt.";
  } else if (!financeRow?.setter_id) {
    lossPoint =
      "Verlust bei Finance-Query: clients.setter_id nicht in SELECT-Ergebnis (evtl. Legacy-Fallback).";
  } else if (!resolvedSetterId) {
    lossPoint = "Verlust bei Finance-Resolution: resolveClientSetterId liefert null.";
  } else if (!revenue?.setter_id) {
    lossPoint = "Verlust bei UI-Daten: getClientRevenueRecordById liefert kein setter_id.";
  } else if (!revenue.setter_name && revenue.setter_id) {
    lossPoint =
      "Anzeige-Problem: setter_id vorhanden, aber setter_name leer (Profil-Join/RLS oder acquired_by-Fallback).";
  } else if (!setterProfileJoin && !attributionProfileRlsMigrationApplied) {
    lossPoint =
      "Profil-Join blockiert: Migration attribution_profile_visibility fehlt in der DB (RLS).";
  }

  return {
    generatedAt: new Date().toISOString(),
    workflowTimeline,
    lead: leadRow
      ? {
          id: leadRow.id as string,
          status: leadRow.status as string,
          created_by: (leadRow.created_by as string | null) ?? null,
          acquired_by: (leadRow.acquired_by as string | null) ?? null,
          setter_id: (leadRow.setter_id as string | null) ?? null,
          closer_id: (leadRow.closer_id as string | null) ?? null,
          converted_to_client: Boolean(leadRow.converted_to_client),
        }
      : null,
    client: {
      id: clientRow.id as string,
      lead_id: leadId,
      created_by: null,
      created_by_note: "Spalte existiert nicht auf clients",
      setter_id: (clientRow.setter_id as string | null) ?? null,
      closer_id: (clientRow.closer_id as string | null) ?? null,
      acquired_by: (clientRow.acquired_by as string | null) ?? null,
      responsible_member_id: (clientRow.responsible_member_id as string | null) ?? null,
    },
    contract: {
      note:
        "Vertragsmodul nutzt clients (kein separates Deal-Contract). public.contracts = Team-Verträge.",
      id: clientRow.id as string,
      client_id: clientRow.id as string,
      setter_id: revenue?.setter_id ?? (clientRow.setter_id as string | null),
      closer_id: revenue?.closer_id ?? (clientRow.closer_id as string | null),
    },
    financeQuery: {
      querySucceeded: !financeError && Boolean(financeRow),
      queryError: financeError?.message ?? null,
      rawClientSetterId: (financeRow?.setter_id as string | null) ?? null,
      rawClientCloserId: (financeRow?.closer_id as string | null) ?? null,
      rawLeadSetterId: leadEmbed?.setter_id ?? null,
      rawLeadCreatedBy: leadEmbed?.created_by ?? null,
      setterProfileJoin,
      closerProfileJoin,
      resolvedSetterId,
      resolvedCloserId: (financeRow?.closer_id as string | null) ?? null,
    },
    uiOutput: {
      revenueRecordLoaded: Boolean(revenue),
      revenueSetterId: revenue?.setter_id ?? null,
      revenueSetterName: revenue?.setter_name ?? null,
      revenueCloserId: revenue?.closer_id ?? null,
      revenueCloserName: revenue?.closer_name ?? null,
      salesAttributionSource:
        "SalesAttributionPanel ← salesAttributionFromClientRevenue(revenue) ← getClientRevenueRecordById",
    },
    checks: {
      setterIdStoredInLeadDb,
      setterIdStoredInClientDb,
      setterIdSurvivesScheduledTransition: setterIdStoredInLeadDb
        ? "OK — aktueller leads.setter_id gesetzt (kein historisches Snapshot pro Status)"
        : "FEHLER — leads.setter_id null",
      setterIdSurvivesLeadToClientTransfer: setterIdStoredInClientDb
        ? "OK — clients.setter_id gesetzt"
        : "FEHLER — clients.setter_id null",
      setterIdSurvivesClientToContractTransfer:
        revenue?.setter_id || resolvedSetterId
          ? "OK — Finance/UI setter_id aufgelöst"
          : "FEHLER — Finance/UI setter_id null",
      uiLoadsSetterFromField:
        "revenue.setter_id + revenue.setter_name (nicht commission_entry, nicht closer_id)",
      attributionProfileRlsMigrationApplied: attributionProfileRlsMigrationApplied,
    },
    lossPoint,
  };
}
