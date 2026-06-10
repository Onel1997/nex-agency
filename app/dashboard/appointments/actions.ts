"use server";

import { revalidatePath } from "next/cache";
import type { AppointmentFormData } from "@/components/dashboard/AppointmentForm";
import {
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/lib/dashboard/constants";
import { canAssignAppointments } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { logActivity } from "@/lib/dashboard/activity";
import { combineDateAndTime } from "@/lib/dashboard/calendar";
import { createClient } from "@/lib/supabase/server";

function revalidateAppointments() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/activities");
}

function actorName(profile: { full_name: string | null; email: string }) {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

function toDbPayload(data: AppointmentFormData, assignedUserId: string) {
  const startTime = combineDateAndTime(data.date, data.start_time);
  const endTime = combineDateAndTime(data.date, data.end_time);

  if (endTime <= startTime) {
    throw new Error("Endzeit muss nach der Startzeit liegen.");
  }

  return {
    title: data.title.trim(),
    description: data.description.trim() || null,
    lead_id: data.lead_id || null,
    assigned_user_id: assignedUserId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: data.status,
  };
}

async function resolveAssignedUserId(
  data: AppointmentFormData,
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>,
) {
  if (canAssignAppointments(profile)) {
    return data.assigned_user_id || profile.id;
  }
  return profile.id;
}

export async function createAppointment(data: AppointmentFormData) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const assignedUserId = await resolveAssignedUserId(data, profile);
  const supabase = await createClient();
  const payload = toDbPayload(data, assignedUserId);

  const { data: created, error } = await supabase
    .from("appointments")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logActivity({
    actorId: profile.id,
    action: "appointment_created",
    entityType: "appointment",
    entityId: created.id,
    metadata: { title: payload.title, status: payload.status },
    message: `${actorName(profile)} hat Termin „${payload.title}“ erstellt`,
  });

  revalidateAppointments();
}

export async function updateAppointment(id: string, data: AppointmentFormData) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("appointments")
    .select("title, status, assigned_user_id")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const assignedUserId = canAssignAppointments(profile)
    ? data.assigned_user_id || existing.assigned_user_id
    : existing.assigned_user_id;

  const payload = toDbPayload(data, assignedUserId);

  const { error } = await supabase
    .from("appointments")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity({
    actorId: profile.id,
    action: "appointment_updated",
    entityType: "appointment",
    entityId: id,
    metadata: { title: payload.title },
    message: `${actorName(profile)} hat Termin „${payload.title}“ bearbeitet`,
  });

  if (existing.status !== payload.status) {
    await logActivity({
      actorId: profile.id,
      action: "appointment_status_changed",
      entityType: "appointment",
      entityId: id,
      metadata: {
        title: payload.title,
        from: existing.status,
        to: payload.status,
      },
      message: `${actorName(profile)} hat Status von „${payload.title}“ auf ${APPOINTMENT_STATUS_LABELS[payload.status]} geändert`,
    });
  }

  revalidateAppointments();
}

export async function deleteAppointment(id: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("appointments")
    .select("title")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logActivity({
    actorId: profile.id,
    action: "appointment_deleted",
    entityType: "appointment",
    entityId: id,
    metadata: { title: existing.title },
    message: `${actorName(profile)} hat Termin „${existing.title}“ gelöscht`,
  });

  revalidateAppointments();
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("appointments")
    .select("title, status")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (existing.status === status) return;

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity({
    actorId: profile.id,
    action: "appointment_status_changed",
    entityType: "appointment",
    entityId: id,
    metadata: { title: existing.title, from: existing.status, to: status },
    message: `${actorName(profile)} hat Status von „${existing.title}“ auf ${APPOINTMENT_STATUS_LABELS[status]} geändert`,
  });

  revalidateAppointments();
}
