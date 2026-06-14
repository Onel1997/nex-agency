"use client";

import {
  createKnowledgeCategory,
  deleteKnowledgeCategory,
  deleteKnowledgeDocument,
  getKnowledgeDocumentSignedUrl,
  updateKnowledgeCategory,
  updateKnowledgeDocument,
  uploadKnowledgeDocument,
} from "@/app/dashboard/knowledge/actions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Modal } from "@/components/dashboard/Modal";
import {
  getFileTypeLabel,
  isPdfDocument,
  KNOWLEDGE_VISIBILITY_OPTIONS,
} from "@/lib/dashboard/knowledge-access";
import type {
  KnowledgeCategory,
  KnowledgeDocument,
} from "@/lib/dashboard/knowledge-center";
import { formatDate, formatFileSize } from "@/lib/dashboard/format";
import {
  BookOpen,
  Download,
  Eye,
  FileText,
  FolderPlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

interface KnowledgeCenterPageClientProps {
  categories: KnowledgeCategory[];
  documents: KnowledgeDocument[];
  selectedCategoryId: string | null;
  initialSearch: string;
  canManage: boolean;
}

export function KnowledgeCenterPageClient({
  categories,
  documents,
  selectedCategoryId,
  initialSearch,
  canManage,
}: KnowledgeCenterPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerDocument, setViewerDocument] = useState<KnowledgeDocument | null>(
    null,
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<KnowledgeDocument | null>(
    null,
  );
  const [editingCategory, setEditingCategory] = useState<KnowledgeCategory | null>(
    null,
  );

  const updateFilters = useCallback(
    (next: { category?: string | null; q?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.category === null || next.category === undefined) {
        params.delete("category");
      } else if (next.category) {
        params.set("category", next.category);
      }
      if (next.q === undefined) {
        // keep current
      } else if (next.q) {
        params.set("q", next.q);
      } else {
        params.delete("q");
      }
      const query = params.toString();
      router.push(query ? `/dashboard/knowledge?${query}` : "/dashboard/knowledge");
    },
    [router, searchParams],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: search.trim(), category: selectedCategoryId });
  };

  const handleView = async (document: KnowledgeDocument) => {
    setError(null);
    try {
      const url = await getKnowledgeDocumentSignedUrl(document.id);
      if (isPdfDocument(document.mime_type, document.file_name)) {
        setViewerUrl(url);
        setViewerTitle(document.title);
        setViewerDocument(document);
      } else {
        window.open(url, "_blank");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ansehen fehlgeschlagen");
    }
  };

  const handleDownload = async (documentId: string) => {
    setError(null);
    try {
      const url = await getKnowledgeDocumentSignedUrl(documentId, { download: true });
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download fehlgeschlagen");
    }
  };

  const handleDeleteDocument = (documentId: string) => {
    if (!window.confirm("Dokument wirklich löschen?")) return;
    startTransition(async () => {
      setError(null);
      try {
        await deleteKnowledgeDocument(documentId);
        setSuccess("Dokument gelöscht");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
      }
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (
      !window.confirm(
        "Kategorie und alle zugehörigen Dokumente wirklich löschen?",
      )
    ) {
      return;
    }
    startTransition(async () => {
      setError(null);
      try {
        await deleteKnowledgeCategory(categoryId);
        setSuccess("Kategorie gelöscht");
        if (selectedCategoryId === categoryId) {
          updateFilters({ category: null, q: search });
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
      }
    });
  };

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Knowledge Center"
        description="Interne Akademie, Dokumentenablage und SOP-Bibliothek für NexAgency."
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(true)}
                className="dashboard-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
              >
                <FolderPlus className="h-4 w-4" />
                Kategorie
              </button>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="dashboard-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Upload className="h-4 w-4" />
                Dokument hochladen
              </button>
            </div>
          ) : undefined
        }
      />

      <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Dokument suchen…"
          className="dashboard-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
        />
      </form>

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-500/20">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="glass-card rounded-2xl p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-soft">
            Kategorien
          </h2>
          <nav className="space-y-1">
            <Link
              href="/dashboard/knowledge"
              onClick={(e) => {
                e.preventDefault();
                updateFilters({ category: null, q: search });
              }}
              className={`block rounded-xl px-3 py-2 text-sm transition-colors ${
                !selectedCategoryId
                  ? "bg-violet-500/15 text-foreground ring-1 ring-violet-500/25"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              Alle Bereiche
            </Link>
            {categories.map((category) => (
              <div key={category.id} className="group flex items-center gap-1">
                <Link
                  href={`/dashboard/knowledge?category=${category.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    updateFilters({ category: category.id, q: search });
                  }}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm transition-colors ${
                    selectedCategoryId === category.id
                      ? "bg-violet-500/15 text-foreground ring-1 ring-violet-500/25"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {category.name}
                </Link>
                {canManage && (
                  <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setEditingCategory(category)}
                      className="dashboard-icon-btn rounded-lg p-1.5 text-muted"
                      aria-label={`${category.name} bearbeiten`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="dashboard-icon-btn rounded-lg p-1.5 text-red-300"
                      aria-label={`${category.name} löschen`}
                      disabled={pending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">
              {selectedCategory ? selectedCategory.name : "Alle Dokumente"}
            </h2>
            <span className="text-sm text-muted">
              {documents.length} {documents.length === 1 ? "Dokument" : "Dokumente"}
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="glass-card rounded-2xl">
              <EmptyState
                icon={BookOpen}
                title="Keine Dokumente"
                description={
                  selectedCategory
                    ? `In „${selectedCategory.name}" sind noch keine Dokumente vorhanden.`
                    : "Es wurden keine Dokumente gefunden."
                }
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {documents.map((document) => (
                <article
                  key={document.id}
                  className="glass-card flex flex-col rounded-2xl p-5"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
                      <FileText className="h-5 w-5 text-violet-300" />
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingDocument(document)}
                          className="dashboard-icon-btn rounded-lg p-1.5 text-muted"
                          aria-label="Dokument bearbeiten"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(document.id)}
                          className="dashboard-icon-btn rounded-lg p-1.5 text-red-300"
                          aria-label="Dokument löschen"
                          disabled={pending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-medium text-foreground">{document.title}</h3>
                  {document.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {document.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-soft">
                    <span className="rounded-md bg-surface-hover px-2 py-0.5">
                      {getFileTypeLabel(document.mime_type, document.file_name)}
                    </span>
                    <span>{formatFileSize(document.file_size)}</span>
                    <span>{formatDate(document.created_at)}</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleView(document)}
                      className="dashboard-btn-secondary inline-flex flex-1 items-center justify-center gap-2 px-3 py-2 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {isPdfDocument(document.mime_type, document.file_name)
                        ? "Öffnen"
                        : "Ansehen"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(document.id)}
                      className="dashboard-btn-secondary inline-flex flex-1 items-center justify-center gap-2 px-3 py-2 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <PdfViewerModal
        open={!!viewerUrl}
        title={viewerTitle}
        url={viewerUrl}
        document={viewerDocument}
        onClose={() => {
          setViewerUrl(null);
          setViewerTitle("");
          setViewerDocument(null);
        }}
        onDownload={
          viewerDocument
            ? () => handleDownload(viewerDocument.id)
            : undefined
        }
      />

      {canManage && (
        <>
          <UploadDocumentModal
            open={uploadOpen}
            categories={categories}
            defaultCategoryId={selectedCategoryId ?? categories[0]?.id}
            onClose={() => setUploadOpen(false)}
            onSuccess={() => {
              setUploadOpen(false);
              setSuccess("Dokument hochgeladen");
              router.refresh();
            }}
            onError={setError}
          />

          <CategoryModal
            open={categoryModalOpen}
            onClose={() => setCategoryModalOpen(false)}
            onSuccess={() => {
              setCategoryModalOpen(false);
              setSuccess("Kategorie erstellt");
              router.refresh();
            }}
            onError={setError}
          />

          {editingDocument && (
            <EditDocumentModal
              document={editingDocument}
              categories={categories}
              onClose={() => setEditingDocument(null)}
              onSuccess={() => {
                setEditingDocument(null);
                setSuccess("Dokument aktualisiert");
                router.refresh();
              }}
              onError={setError}
            />
          )}

          {editingCategory && (
            <EditCategoryModal
              category={editingCategory}
              onClose={() => setEditingCategory(null)}
              onSuccess={() => {
                setEditingCategory(null);
                setSuccess("Kategorie aktualisiert");
                router.refresh();
              }}
              onError={setError}
            />
          )}
        </>
      )}
    </div>
  );
}

function PdfViewerModal({
  open,
  title,
  url,
  document,
  onClose,
  onDownload,
}: {
  open: boolean;
  title: string;
  url: string | null;
  document: KnowledgeDocument | null;
  onClose: () => void;
  onDownload?: () => void;
}) {
  if (!open || !url) return null;

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl ring-1 ring-border">
          <iframe
            src={url}
            title={title}
            className="h-[70vh] w-full bg-white"
          />
        </div>
        {document && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span>
              {getFileTypeLabel(document.mime_type, document.file_name)} ·{" "}
              {formatFileSize(document.file_size)} ·{" "}
              {formatDate(document.created_at)}
            </span>
            <div className="flex gap-2">
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  className="dashboard-btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="dashboard-btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs"
              >
                <X className="h-3.5 w-3.5" />
                Schließen
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function UploadDocumentModal({
  open,
  categories,
  defaultCategoryId,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean;
  categories: KnowledgeCategory[];
  defaultCategoryId?: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await uploadKnowledgeDocument(formData);
        onSuccess();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Dokument hochladen" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Kategorie">
          <select
            name="categoryId"
            defaultValue={defaultCategoryId}
            required
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Titel">
          <input
            name="title"
            required
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Beschreibung">
          <textarea
            name="description"
            rows={3}
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Sichtbarkeit">
          <select
            name="visibility"
            defaultValue="all"
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          >
            {KNOWLEDGE_VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Datei (PDF, DOCX, XLSX, PPTX — max. 50 MB)">
          <input
            name="file"
            type="file"
            required
            accept=".pdf,.docx,.xlsx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="dashboard-btn-secondary px-4 py-2 text-sm"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={pending}
            className="dashboard-btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {pending ? "Wird hochgeladen…" : "Hochladen"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditDocumentModal({
  document,
  categories,
  onClose,
  onSuccess,
  onError,
}: {
  document: KnowledgeDocument;
  categories: KnowledgeCategory[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateKnowledgeDocument(document.id, formData);
        onSuccess();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      }
    });
  };

  return (
    <Modal open onClose={onClose} title="Dokument bearbeiten" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Kategorie">
          <select
            name="categoryId"
            defaultValue={document.category_id}
            required
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Titel">
          <input
            name="title"
            defaultValue={document.title}
            required
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Beschreibung">
          <textarea
            name="description"
            defaultValue={document.description ?? ""}
            rows={3}
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Sichtbarkeit">
          <select
            name="visibility"
            defaultValue={document.visibility}
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          >
            {KNOWLEDGE_VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Sortierung">
          <input
            name="sortOrder"
            type="number"
            defaultValue={document.sort_order}
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>

        <p className="text-xs text-muted-soft">
          Datei: {document.file_name} ({formatFileSize(document.file_size)})
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="dashboard-btn-secondary px-4 py-2 text-sm"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={pending}
            className="dashboard-btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {pending ? "Wird gespeichert…" : "Speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CategoryModal({
  open,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createKnowledgeCategory(formData);
        onSuccess();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Erstellen fehlgeschlagen");
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Kategorie erstellen">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          <input
            name="name"
            required
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Beschreibung">
          <textarea
            name="description"
            rows={2}
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Sortierung">
          <input
            name="sortOrder"
            type="number"
            defaultValue={0}
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="dashboard-btn-secondary px-4 py-2 text-sm"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={pending}
            className="dashboard-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {pending ? "Wird erstellt…" : "Erstellen"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditCategoryModal({
  category,
  onClose,
  onSuccess,
  onError,
}: {
  category: KnowledgeCategory;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateKnowledgeCategory(category.id, formData);
        onSuccess();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      }
    });
  };

  return (
    <Modal open onClose={onClose} title="Kategorie bearbeiten">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          <input
            name="name"
            defaultValue={category.name}
            required
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Beschreibung">
          <textarea
            name="description"
            defaultValue={category.description ?? ""}
            rows={2}
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Sortierung">
          <input
            name="sortOrder"
            type="number"
            defaultValue={category.sort_order}
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>
        <p className="text-xs text-muted-soft">Slug: {category.slug}</p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="dashboard-btn-secondary px-4 py-2 text-sm"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={pending}
            className="dashboard-btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {pending ? "Wird gespeichert…" : "Speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
