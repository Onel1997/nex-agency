"use server";

import { revalidatePath } from "next/cache";
import { requireContractsAccess } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/session";
import {
  CONTRACT_DOCUMENTS_BUCKET,
  validateContractDocumentFile,
} from "@/lib/dashboard/contract-documents";
import {
  contractInputToDbPayload,
  generateAndStoreContractPdf,
  parseContractFormData,
  validateContractInput,
} from "@/lib/dashboard/contracts";
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
      signed_at: input.status === "active" ? new Date().toISOString() : null,
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
  const payload = contractInputToDbPayload(input);
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
  await requireContractsAccess();

  const supabase = await createClient();
  const { data: contract, error: fetchError } = await supabase
    .from("contracts")
    .select("profile_id, pdf_url, contract_number")
    .eq("id", contractId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  if (contract.pdf_url && !String(contract.pdf_url).startsWith("/api/")) {
    await supabase.storage.from("contract-pdfs").remove([contract.pdf_url as string]);
  }

  const { error } = await supabase.from("contracts").delete().eq("id", contractId);
  if (error) throw new Error(error.message);

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
