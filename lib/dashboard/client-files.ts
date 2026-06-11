import { createClient } from "@/lib/supabase/server";
import { isClientHubSchemaMissingError } from "./client-activities";
import type { ClientFile } from "./types";

const CLIENT_FILES_BUCKET = "client-files";

function formatMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

export async function getClientFiles(clientId: string): Promise<ClientFile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .select(
      `
      id,
      client_id,
      uploaded_by,
      file_name,
      storage_path,
      file_size_bytes,
      mime_type,
      created_at,
      uploader:profiles!client_files_uploaded_by_fkey(full_name, email)
    `,
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isClientHubSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const uploader = Array.isArray(row.uploader) ? row.uploader[0] : row.uploader;
    return {
      id: row.id as string,
      client_id: row.client_id as string,
      uploaded_by: row.uploaded_by as string,
      file_name: row.file_name as string,
      storage_path: row.storage_path as string,
      file_size_bytes: row.file_size_bytes as number,
      mime_type: row.mime_type as string,
      created_at: row.created_at as string,
      uploader_name: formatMemberName(
        uploader as { full_name: string | null; email: string } | null,
      ),
    };
  });
}

export async function getClientFileDownloadUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .createSignedUrl(storagePath, 60);

  if (error) {
    console.error("Signed URL failed:", error.message);
    return null;
  }

  return data.signedUrl;
}

export { CLIENT_FILES_BUCKET };
