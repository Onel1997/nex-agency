import { createClient } from "@/lib/supabase/server";
import { CONTRACT_DOCUMENTS_BUCKET } from "./contract-constants";
import type { ContractDocumentRecord } from "./types";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function isContractDocumentsSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("contract_documents") ||
    normalized.includes("contract-documents")
  );
}

function formatMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

function mapDocumentRow(row: Record<string, unknown>): ContractDocumentRecord {
  const uploader = Array.isArray(row.uploader) ? row.uploader[0] : row.uploader;

  return {
    id: row.id as string,
    contract_id: row.contract_id as string,
    uploaded_by: (row.uploaded_by as string | null) ?? null,
    file_name: row.file_name as string,
    storage_path: row.storage_path as string,
    file_size_bytes: row.file_size_bytes as number,
    mime_type: row.mime_type as string,
    created_at: row.created_at as string,
    uploader_name: formatMemberName(
      uploader as { full_name: string | null; email: string } | null,
    ),
  };
}

export async function getContractDocuments(
  contractId: string,
): Promise<ContractDocumentRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_documents")
    .select(
      `
      id,
      contract_id,
      uploaded_by,
      file_name,
      storage_path,
      file_size_bytes,
      mime_type,
      created_at,
      uploader:profiles!contract_documents_uploaded_by_fkey(full_name, email)
    `,
    )
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isContractDocumentsSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapDocumentRow(row as Record<string, unknown>));
}

export async function getContractDocumentDownloadUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CONTRACT_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60);

  if (error) return null;
  return data.signedUrl;
}

export function validateContractDocumentFile(file: File): string | null {
  if (file.size <= 0) return "Datei ist leer";
  if (file.size > MAX_FILE_SIZE_BYTES) return "Datei darf maximal 10 MB groß sein";
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Dateityp nicht erlaubt (PDF, JPG, PNG, WEBP, DOC, DOCX)";
  }
  return null;
}

export { CONTRACT_DOCUMENTS_BUCKET, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES };
