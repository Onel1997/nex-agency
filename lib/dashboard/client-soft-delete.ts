export function isClientSoftDeleteSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("deleted_at") ||
    (normalized.includes("column") && normalized.includes("deleted"))
  );
}

export const CLIENT_SOFT_DELETE_MIGRATION_HINT =
  "Migration 20260616140000_client_soft_delete.sql fehlt. Bitte `supabase db push` ausführen.";

export function buildClientSoftDeleteUpdate(
  deletedAt: Date = new Date(),
): { deleted_at: string; is_archived: true } {
  return {
    deleted_at: deletedAt.toISOString(),
    is_archived: true,
  };
}

export function isClientActive(input: {
  is_archived?: boolean | null;
  deleted_at?: string | null;
}): boolean {
  return !input.is_archived && !input.deleted_at;
}
