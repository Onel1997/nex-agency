"use server";

import { revalidatePath } from "next/cache";
import type { LeadFormData } from "@/components/dashboard/LeadForm";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/dashboard/constants";
import { getAuthUser, getProfile, isAdmin } from "@/lib/auth/session";
import { logActivity } from "@/lib/dashboard/activity";
import { createClient } from "@/lib/supabase/server";

function toDbPayload(data: LeadFormData, assignedTo: string | null) {
  return {
    company_name: data.company_name.trim(),
    contact_name: data.contact_name.trim() || null,
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
    website: data.website.trim() || null,
    status: data.status,
    acquired_by: data.acquired_by || null,
    notes: data.notes.trim() || null,
    assigned_to: assignedTo,
  };
}

function revalidateDashboard() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/activities");
}

function actorName(profile: { full_name: string | null; email: string }) {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

async function resolveAssignedTo(
  data: LeadFormData,
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>,
) {
  if (isAdmin(profile)) {
    return data.assigned_to || profile.id;
  }
  return profile.id;
}

export async function createLead(data: LeadFormData) {
  const user = await getAuthUser();
  const profile = await getProfile();
  if (!user || !profile) throw new Error("Nicht angemeldet");

  const assignedTo = await resolveAssignedTo(data, profile);
  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("leads")
    .insert(toDbPayload(data, assignedTo))
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

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("assigned_to, company_name, status")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const assignedTo = isAdmin(profile)
    ? data.assigned_to || existing?.assigned_to || profile.id
    : existing?.assigned_to ?? profile.id;

  const previousAssignee = existing?.assigned_to ?? null;

  const { error } = await supabase
    .from("leads")
    .update(toDbPayload(data, assignedTo))
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

  if (assignedTo !== previousAssignee) {
    await logActivity({
      actorId: profile.id,
      action: "lead_assigned",
      entityType: "lead",
      entityId: id,
      metadata: {
        company_name: data.company_name.trim(),
        assigned_to: assignedTo,
        previous_assigned_to: previousAssignee,
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

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("company_name, status")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("leads")
    .update({ status })
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
  }

  revalidateDashboard();
}
