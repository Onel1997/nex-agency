import { createClient } from "@/lib/supabase/server";
import {
  canAccessKnowledgeCategory,
  canViewKnowledgeDocument,
  resolveKnowledgeRole,
  type KnowledgeCategorySlug,
  type KnowledgeContentType,
  type KnowledgeDocumentVisibility,
} from "./knowledge-access";
import type { Profile } from "@/lib/auth/types";

export const KNOWLEDGE_CENTER_BUCKET = "knowledge-center";

export const KNOWLEDGE_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export const KNOWLEDGE_MAX_FILE_SIZE = 50 * 1024 * 1024;

export interface KnowledgeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocument {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  visibility: KnowledgeDocumentVisibility;
  content_type: KnowledgeContentType;
  created_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  creator_name: string | null;
}

function formatMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

function filterCategoriesForProfile(
  categories: KnowledgeCategory[],
  profile: Profile,
): KnowledgeCategory[] {
  const role = resolveKnowledgeRole(profile);
  return categories.filter((category) =>
    canAccessKnowledgeCategory(role, category.slug),
  );
}

function filterDocumentsForProfile(
  documents: KnowledgeDocument[],
  categories: KnowledgeCategory[],
  profile: Profile,
): KnowledgeDocument[] {
  const role = resolveKnowledgeRole(profile);
  const accessibleCategoryIds = new Set(
    categories
      .filter((category) => canAccessKnowledgeCategory(role, category.slug))
      .map((category) => category.id),
  );

  return documents.filter(
    (document) =>
      accessibleCategoryIds.has(document.category_id) &&
      canViewKnowledgeDocument(role, document.visibility),
  );
}

export async function getKnowledgeCategories(
  profile: Profile,
): Promise<KnowledgeCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_categories")
    .select("id, name, slug, description, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return filterCategoriesForProfile((data ?? []) as KnowledgeCategory[], profile);
}

export async function getKnowledgeDocuments(
  profile: Profile,
  options?: { categoryId?: string; search?: string },
): Promise<KnowledgeDocument[]> {
  const categories = await getKnowledgeCategories(profile);
  const accessibleCategoryIds = categories.map((category) => category.id);

  if (accessibleCategoryIds.length === 0) return [];

  const supabase = await createClient();
  let query = supabase
    .from("knowledge_documents")
    .select(
      `
      id,
      category_id,
      title,
      description,
      file_url,
      file_name,
      file_size,
      mime_type,
      visibility,
      content_type,
      created_by,
      sort_order,
      created_at,
      updated_at,
      creator:profiles!knowledge_documents_created_by_fkey(full_name, email)
    `,
    )
    .in("category_id", accessibleCategoryIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (options?.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }

  const search = options?.search?.trim();
  if (search) {
    const escaped = search.replace(/[%_]/g, "\\$&");
    query = query.or(
      `title.ilike.%${escaped}%,description.ilike.%${escaped}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const documents = (data ?? []).map((row) => {
    const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator;
    return {
      id: row.id as string,
      category_id: row.category_id as string,
      title: row.title as string,
      description: row.description as string | null,
      file_url: row.file_url as string,
      file_name: row.file_name as string,
      file_size: row.file_size as number,
      mime_type: row.mime_type as string,
      visibility: row.visibility as KnowledgeDocumentVisibility,
      content_type: row.content_type as KnowledgeContentType,
      created_by: row.created_by as string | null,
      sort_order: row.sort_order as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      creator_name: formatMemberName(
        creator as { full_name: string | null; email: string } | null,
      ),
    };
  });

  return filterDocumentsForProfile(documents, categories, profile);
}

export async function getKnowledgeDocumentById(
  profile: Profile,
  documentId: string,
): Promise<KnowledgeDocument | null> {
  const documents = await getKnowledgeDocuments(profile);
  return documents.find((document) => document.id === documentId) ?? null;
}

export function slugifyCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isValidKnowledgeCategorySlug(
  slug: string,
): slug is KnowledgeCategorySlug {
  return [
    "sales",
    "onboarding",
    "sops",
    "vertraege",
    "projekte",
    "marketing",
    "operations",
  ].includes(slug);
}
