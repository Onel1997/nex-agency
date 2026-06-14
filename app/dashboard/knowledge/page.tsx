import { canManageKnowledgeCenter } from "@/lib/auth/permissions";
import { requireKnowledgeCenterAccess } from "@/lib/auth/session";
import {
  getKnowledgeCategories,
  getKnowledgeDocuments,
} from "@/lib/dashboard/knowledge-center";
import { KnowledgeCenterPageClient } from "@/components/dashboard/KnowledgeCenterPageClient";

interface KnowledgePageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function KnowledgePage({ searchParams }: KnowledgePageProps) {
  const profile = await requireKnowledgeCenterAccess();
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const selectedCategoryId = params.category?.trim() || null;

  let error: string | null = null;
  let categories = null;
  let documents = null;

  try {
    categories = await getKnowledgeCategories(profile);
    documents = await getKnowledgeDocuments(profile, {
      categoryId: selectedCategoryId ?? undefined,
      search: search || undefined,
    });
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Knowledge Center konnte nicht geladen werden";
  }

  if (error || !categories || !documents) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error ?? "Knowledge Center konnte nicht geladen werden"}
      </div>
    );
  }

  return (
    <KnowledgeCenterPageClient
      categories={categories}
      documents={documents}
      selectedCategoryId={selectedCategoryId}
      initialSearch={search}
      canManage={canManageKnowledgeCenter(profile)}
    />
  );
}
