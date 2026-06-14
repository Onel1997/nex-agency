"use server";

import { revalidatePath } from "next/cache";
import type { LeadFormData } from "@/components/dashboard/LeadForm";
import {
  canAssignLeadOwner,
  canConvertLeadToClient,
  canEditLeads,
  canMarkLeadWon,
  isSetter,
} from "@/lib/auth/permissions";
import { getAuthUser, getProfile } from "@/lib/auth/session";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/dashboard/constants";
import { logActivity } from "@/lib/dashboard/activity";
import { logClientActivity } from "@/lib/dashboard/client-activities";
import { parseEuroToCents } from "@/lib/dashboard/format";
import { createClient } from "@/lib/supabase/server";

function toDbPayload(
  data: LeadFormData,
  ownerId: string | null,
  estimatedValueCents: number | null,
) {
  return {
    company_name: data.company_name.trim(),
    contact_name: data.contact_name.trim() || null,
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
    website: data.website.trim() || null,
    status: data.status,
    acquired_by: data.acquired_by || null,
    notes: data.notes.trim() || null,
    owner_id: ownerId,
    estimated_value_cents: estimatedValueCents,
    currency: "EUR",
  };
}

function revalidateDashboard(clientId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/activities");
  if (clientId) {
    revalidatePath(`/dashboard/clients/${clientId}`);
  }
}

function actorName(profile: { full_name: string | null; email: string }) {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

async function resolveOwnerId(
  data: LeadFormData,
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>,
) {
  if (canAssignLeadOwner(profile)) {
    return data.owner_id || profile.id;
  }
  return profile.id;
}

export async function createLead(data: LeadFormData) {
  const user = await getAuthUser();
  const profile = await getProfile();
  if (!user || !profile) throw new Error("Nicht angemeldet");
  if (!canEditLeads(profile)) {
    throw new Error("Keine Berechtigung, Leads zu erstellen");
  }

  const ownerId = await resolveOwnerId(data, profile);
  const estimatedValueCents = parseEuroToCents(data.estimated_value);
  const setterId = isSetter(profile) ? ownerId : null;
  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("leads")
    .insert({
      ...toDbPayload(data, ownerId, estimatedValueCents),
      created_by: profile.id,
      setter_id: setterId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logActivity({
    actorId: profile.id,
    action: "lead_created",
    entityType: "lead",
    entityId: created.id,
    metadata: { company_name: data.company_name.trim() },
    message: `${actorName(profile)} hat Lead ${data.company_name.trim()} erstellt`,
  });

  revalidateDashboard();
}

export async function updateLead(id: string, data: LeadFormData) {
  const user = await getAuthUser();
  const profile = await getProfile();
  if (!user || !profile) throw new Error("Nicht angemeldet");
  if (!canEditLeads(profile)) {
    throw new Error("Keine Berechtigung, Leads zu bearbeiten");
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("owner_id, company_name, status")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const ownerId = canAssignLeadOwner(profile)
    ? data.owner_id || existing?.owner_id || profile.id
    : existing?.owner_id ?? profile.id;

  const previousOwnerId = existing?.owner_id ?? null;
  const estimatedValueCents = parseEuroToCents(data.estimated_value);

  const { error } = await supabase
    .from("leads")
    .update(toDbPayload(data, ownerId, estimatedValueCents))
    .eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity({
    actorId: profile.id,
    action: "lead_updated",
    entityType: "lead",
    entityId: id,
    metadata: { company_name: data.company_name.trim() },
    message: `${actorName(profile)} hat Lead ${data.company_name.trim()} bearbeitet`,
  });

  if (ownerId !== previousOwnerId) {
    await logActivity({
      actorId: profile.id,
      action: "lead_assigned",
      entityType: "lead",
      entityId: id,
      metadata: {
        company_name: data.company_name.trim(),
        owner_id: ownerId,
        previous_owner_id: previousOwnerId,
      },
      message: `${actorName(profile)} hat Lead ${data.company_name.trim()} neu zugewiesen`,
    });
  }

  revalidateDashboard();
}

export async function deleteLead(id: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("company_name")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity({
    actorId: profile.id,
    action: "lead_deleted",
    entityType: "lead",
    entityId: id,
    metadata: { company_name: existing.company_name },
    message: `${actorName(profile)} hat Lead ${existing.company_name} gelöscht`,
  });

  revalidateDashboard();
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");
  if (status === "won" && !canMarkLeadWon(profile)) {
    throw new Error("Keine Berechtigung, Leads als gewonnen zu markieren");
  }
  if (!canEditLeads(profile)) {
    throw new Error("Keine Berechtigung, Lead-Status zu ändern");
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("company_name, status")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const updatePayload: Record<string, unknown> = { status };
  if (status === "won") {
    updatePayload.closer_id = profile.id;
  }

  const { error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (existing.status !== status) {
    await logActivity({
      actorId: profile.id,
      action: "lead_status_changed",
      entityType: "lead",
      entityId: id,
      metadata: {
        company_name: existing.company_name,
        from: existing.status,
        to: status,
      },
      message: `${actorName(profile)} hat Status von ${existing.company_name} auf ${LEAD_STATUS_LABELS[status]} geändert`,
    });

    if (status === "won") {
      const { data: linkedClient } = await supabase
        .from("clients")
        .select("id")
        .eq("lead_id", id)
        .maybeSingle();

      if (linkedClient) {
        await logClientActivity({
          clientId: linkedClient.id,
          actorId: profile.id,
          activityType: "lead_won",
          description: `Lead „${existing.company_name}" gewonnen`,
        });
      }
    }
  }

  revalidateDashboard();
}

export async function convertLeadToClient(leadId: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");
  if (!canConvertLeadToClient(profile)) {
    throw new Error("Keine Berechtigung, Leads in Kunden umzuwandeln");
  }

  const supabase = await createClient();
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select(
      "company_name, contact_name, phone, email, website, status, acquired_by, notes, owner_id, estimated_value_cents, currency, converted_to_client, setter_id, closer_id",
    )
    .eq("id", leadId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (lead.status !== "won") {
    throw new Error("Nur gewonnene Leads können in Kunden umgewandelt werden");
  }
  if (lead.converted_to_client) {
    throw new Error("Lead wurde bereits in einen Kunden umgewandelt");
  }

  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (existingClient) {
    const { error: flagError } = await supabase
      .from("leads")
      .update({ converted_to_client: true })
      .eq("id", leadId);

    if (flagError) throw new Error(flagError.message);
    revalidateDashboard();
    return;
  }

  const { data: client, error: insertError } = await supabase
    .from("clients")
    .insert({
      lead_id: leadId,
      company_name: lead.company_name,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      responsible_member_id: lead.owner_id,
      acquired_by: lead.acquired_by,
      notes: lead.notes,
      lead_estimated_value_cents: lead.estimated_value_cents,
      currency: lead.currency ?? "EUR",
      setter_id: lead.setter_id,
      closer_id: lead.closer_id ?? profile.id,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("leads")
    .update({ converted_to_client: true })
    .eq("id", leadId);

  if (updateError) throw new Error(updateError.message);

  await logActivity({
    actorId: profile.id,
    action: "lead_converted",
    entityType: "client",
    entityId: client.id,
    metadata: {
      lead_id: leadId,
      company_name: lead.company_name,
    },
    message: `${actorName(profile)} hat Lead ${lead.company_name} in einen Kunden umgewandelt`,
  });

  await logClientActivity({
    clientId: client.id,
    actorId: profile.id,
    activityType: "client_created",
    description: `${actorName(profile)} hat Kunde „${lead.company_name}" erstellt`,
    metadata: { lead_id: leadId },
  });

  await logClientActivity({
    clientId: client.id,
    actorId: profile.id,
    activityType: "lead_won",
    description: `Lead „${lead.company_name}" gewonnen`,
    metadata: { lead_id: leadId },
  });

  revalidateDashboard(client.id);
}
