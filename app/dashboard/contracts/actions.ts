"use server";

import { revalidatePath } from "next/cache";
import { requireContractsAccess, getProfile } from "@/lib/auth/session";
import { logActivity } from "@/lib/dashboard/activity";
import {
  CONTRACT_DOCUMENTS_BUCKET,
  validateContractDocumentFile,
} from "@/lib/dashboard/contract-documents";
import {
  buildContractLifecycleUpdate,
  canDeleteContract,
  canPerformContractLifecycleAction,
  getContractLifecycleActivityAction,
  getContractLifecycleActivityMessage,
  type ContractLifecycleAction,
} from "@/lib/dashboard/contract-lifecycle";
import {
  contractInputToDbPayload,
  generateAndStoreContractPdf,
  parseContractFormData,
  validateContractInput,
} from "@/lib/dashboard/contracts";
import type { ContractStatus } from "@/lib/dashboard/contract-constants";
import { createClient } from "@/lib/supabase/server";

function revalidateContracts(profileId?: string) {
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/team");
  if (profileId) {
    revalidatePath(`/dashboard/team/${profileId}`);
  }
}

async function resolveFreelancerProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("freelancer_profiles")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: inserted } = await supabase
    .from("freelancer_profiles")
    .insert({ profile_id: profileId })
    .select("id")
    .single();

  return (inserted?.id as string | null) ?? null;
}

export async function createContract(formData: FormData) {
  await requireContractsAccess();

  const input = parseContractFormData(formData);
  const validationError = validateContractInput(input);
  if (validationError) throw new Error(validationError);

  const supabase = await createClient();
  const { data: contractNumber, error: numberError } = await supabase.rpc(
    "next_contract_number",
  );

  if (numberError) throw new Error(numberError.message);

  const payload = contractInputToDbPayload(input);
  const freelancerProfileId =
    input.contractCategory === "freelancer"
      ? await resolveFreelancerProfileId(supabase, input.profileId)
      : null;

  const { data: contract, error: insertError } = await supabase
    .from("contracts")
    .insert({
      ...payload,
      contract_number: contractNumber as string,
      freelancer_profile_id: freelancerProfileId,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  await generateAndStoreContractPdf(contract.id as string);
  revalidateContracts(input.profileId);
}

export async function updateContract(contractId: string, formData: FormData) {
  await requireContractsAccess();

  const input = parseContractFormData(formData);
  const validationError = validateContractInput(input);
  if (validationError) throw new Error(validationError);

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("contracts")
    .select("status")
    .eq("id", contractId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  if ((existing.status as ContractStatus) !== "draft") {
    throw new Error("Nur Entwürfe können bearbeitet werden");
  }

  const payload = contractInputToDbPayload(input, {
    preserveStatus: existing.status as ContractStatus,
  });
  const freelancerProfileId =
    input.contractCategory === "freelancer"
      ? await resolveFreelancerProfileId(supabase, input.profileId)
      : null;

  const { error } = await supabase
    .from("contracts")
    .update({
      ...payload,
      freelancer_profile_id: freelancerProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId);

  if (error) throw new Error(error.message);

  await generateAndStoreContractPdf(contractId);
  revalidateContracts(input.profileId);
}

export async function deleteContract(contractId: string) {
  const actor = await requireContractsAccess();

  const supabase = await createClient();
  const { data: contract, error: fetchError } = await supabase
    .from("contracts")
    .select("profile_id, pdf_url, contract_number, status")
    .eq("id", contractId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const status = contract.status as ContractStatus;
  if (!canDeleteContract(status)) {
    throw new Error("Dieser Vertrag kann im aktuellen Status nicht gelöscht werden.");
  }

  const { data: documents, error: documentsError } = await supabase
    .from("contract_documents")
    .select("storage_path")
    .eq("contract_id", contractId);

  if (documentsError) throw new Error(documentsError.message);

  const documentPaths = (documents ?? [])
    .map((document) => document.storage_path as string)
    .filter(Boolean);

  if (documentPaths.length > 0) {
    await supabase.storage.from(CONTRACT_DOCUMENTS_BUCKET).remove(documentPaths);
  }

  const { error: deleteDocumentsError } = await supabase
    .from("contract_documents")
    .delete()
    .eq("contract_id", contractId);

  if (deleteDocumentsError) throw new Error(deleteDocumentsError.message);

  const { error: deleteActivityError } = await supabase
    .from("activity_logs")
    .delete()
    .eq("entity_type", "contract")
    .eq("entity_id", contractId);

  if (deleteActivityError) throw new Error(deleteActivityError.message);

  if (contract.pdf_url && !String(contract.pdf_url).startsWith("/api/")) {
    await supabase.storage.from("contract-pdfs").remove([contract.pdf_url as string]);
  }

  const { error } = await supabase.from("contracts").delete().eq("id", contractId);
  if (error) throw new Error(error.message);

  await logActivity({
    actorId: actor.id,
    action: "contract_deleted",
    entityType: "contract",
    entityId: contractId,
    metadata: {
      contract_number: contract.contract_number,
      status: contract.status,
    },
    message: `Vertrag ${contract.contract_number as string} wurde gelöscht`,
  });

  revalidateContracts(contract.profile_id as string);
}

export async function regenerateContractPdf(contractId: string) {
  await requireContractsAccess();
  const pdfUrl = await generateAndStoreContractPdf(contractId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("contracts")
    .select("profile_id")
    .eq("id", contractId)
    .single();

  revalidateContracts(data?.profile_id as string | undefined);
  return pdfUrl;
}

export async function uploadContractDocument(contractId: string, formData: FormData) {
  const profile = await requireContractsAccess();
  const file = formData.get("file");

  if (!(file instanceof File)) throw new Error("Keine Datei ausgewählt");

  const validationError = validateContractDocumentFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = await createClient();
  const fileId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-()+\s]/g, "_").slice(0, 180);
  const storagePath = `${contractId}/${fileId}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(CONTRACT_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data: inserted, error: insertError } = await supabase
    .from("contract_documents")
    .insert({
      contract_id: contractId,
      uploaded_by: profile.id,
      file_name: file.name,
      storage_path: storagePath,
      file_size_bytes: file.size,
      mime_type: file.type || "application/octet-stream",
    })
    .select("id")
    .single();

  if (insertError) {
    await supabase.storage.from(CONTRACT_DOCUMENTS_BUCKET).remove([storagePath]);
    throw new Error(insertError.message);
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("profile_id")
    .eq("id", contractId)
    .single();

  revalidateContracts(contract?.profile_id as string | undefined);
  return inserted.id as string;
}

export async function deleteContractDocument(documentId: string) {
  await requireContractsAccess();

  const supabase = await createClient();
  const { data: document, error: fetchError } = await supabase
    .from("contract_documents")
    .select("storage_path, contract_id, contract:contracts(profile_id)")
    .eq("id", documentId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  await supabase.storage
    .from(CONTRACT_DOCUMENTS_BUCKET)
    .remove([document.storage_path as string]);

  const { error } = await supabase
    .from("contract_documents")
    .delete()
    .eq("id", documentId);

  if (error) throw new Error(error.message);

  const contract = Array.isArray(document.contract)
    ? document.contract[0]
    : document.contract;

  revalidateContracts((contract as { profile_id: string } | null)?.profile_id);
}

export async function getContractDocumentDownloadUrl(documentId: string) {
  await requireContractsAccess();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (error) throw new Error(error.message);

  const { data: signed, error: signError } = await supabase.storage
    .from(CONTRACT_DOCUMENTS_BUCKET)
    .createSignedUrl(data.storage_path as string, 60);

  if (signError) throw new Error(signError.message);
  return signed.signedUrl;
}

export async function fetchContractDetails(contractId: string) {
  await requireContractsAccess();
  const { getContractWithDetails } = await import("@/lib/dashboard/contracts");
  const contract = await getContractWithDetails(contractId);
  if (!contract) throw new Error("Vertrag nicht gefunden");
  return contract;
}

export async function transitionContract(
  contractId: string,
  action: ContractLifecycleAction,
) {
  const actor = await requireContractsAccess();
  const supabase = await createClient();

  const { data: contract, error: fetchError } = await supabase
    .from("contracts")
    .select(
      "id, profile_id, contract_number, status, signed_by_agency, signed_by_partner",
    )
    .eq("id", contractId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const currentStatus = contract.status as ContractStatus;
  const lifecycleState = {
    status: currentStatus,
    signed_by_agency: Boolean(contract.signed_by_agency),
    signed_by_partner: Boolean(contract.signed_by_partner),
  };

  if (!canPerformContractLifecycleAction(lifecycleState, action)) {
    throw new Error("Diese Aktion ist im aktuellen Status nicht möglich");
  }

  const now = new Date().toISOString();
  const update = buildContractLifecycleUpdate(lifecycleState, action, now);

  const { error: updateError } = await supabase
    .from("contracts")
    .update({
      ...update,
      updated_at: now,
    })
    .eq("id", contractId);

  if (updateError) throw new Error(updateError.message);

  await logActivity({
    actorId: actor.id,
    action: getContractLifecycleActivityAction(action),
    entityType: "contract",
    entityId: contractId,
    metadata: {
      contract_number: contract.contract_number,
      previous_status: currentStatus,
      new_status: update.status,
      action,
    },
    message: getContractLifecycleActivityMessage(
      action,
      contract.contract_number as string,
    ),
  });

  if (action === "send" || action === "sign" || action === "activate" || action === "terminate" || action === "archive") {
    await generateAndStoreContractPdf(contractId);
  }

  revalidateContracts(contract.profile_id as string);
  return update.status;
}
