-- NexAgency Phase 3: Knowledge Center (internal academy, SOP library, document storage)

-- =============================================================================
-- Helper: role-based category access
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_can_access_knowledge_category(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_active_user()
    AND (
      public.is_management()
      OR (
        public.get_user_agency_role() = 'setter'
        AND p_slug IN ('sales', 'onboarding', 'sops')
      )
      OR (
        public.get_user_agency_role() = 'closer'
        AND p_slug IN ('sales', 'onboarding', 'sops', 'vertraege')
      )
      OR (
        public.get_user_agency_role() = 'project_manager'
        AND p_slug IN ('projekte', 'sops', 'operations')
      )
      OR (
        public.get_user_agency_role() = 'sales_manager'
        AND p_slug IN ('sales', 'onboarding', 'sops', 'vertraege', 'marketing')
      )
      OR (
        public.get_user_agency_role() = 'customer_success'
        AND p_slug IN ('onboarding', 'sops', 'projekte', 'operations')
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_knowledge_category(TEXT) TO authenticated;

-- =============================================================================
-- Helper: role-based document visibility
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_can_view_knowledge_document(p_visibility TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_active_user()
    AND (
      p_visibility = 'all'
      OR (p_visibility = 'owner_admin' AND public.is_management())
      OR (
        p_visibility = 'sales'
        AND public.get_user_agency_role() IN (
          'owner', 'admin', 'sales_manager', 'setter', 'closer'
        )
      )
      OR (
        p_visibility = 'setter'
        AND public.get_user_agency_role() IN ('owner', 'admin', 'setter')
      )
      OR (
        p_visibility = 'closer'
        AND public.get_user_agency_role() IN ('owner', 'admin', 'closer')
      )
      OR (
        p_visibility = 'project_manager'
        AND public.get_user_agency_role() IN ('owner', 'admin', 'project_manager')
      )
      OR (
        p_visibility = 'customer_success'
        AND public.get_user_agency_role() IN ('owner', 'admin', 'customer_success')
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_view_knowledge_document(TEXT) TO authenticated;

-- =============================================================================
-- knowledge_categories
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.knowledge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  slug TEXT NOT NULL UNIQUE CHECK (char_length(trim(slug)) > 0),
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_categories_sort_order_idx
  ON public.knowledge_categories (sort_order, name);

ALTER TABLE public.knowledge_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read accessible knowledge categories"
  ON public.knowledge_categories;
CREATE POLICY "Users can read accessible knowledge categories"
  ON public.knowledge_categories FOR SELECT
  TO authenticated
  USING (public.user_can_access_knowledge_category(slug));

DROP POLICY IF EXISTS "Management can insert knowledge categories"
  ON public.knowledge_categories;
CREATE POLICY "Management can insert knowledge categories"
  ON public.knowledge_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "Management can update knowledge categories"
  ON public.knowledge_categories;
CREATE POLICY "Management can update knowledge categories"
  ON public.knowledge_categories FOR UPDATE
  TO authenticated
  USING (public.is_management())
  WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "Management can delete knowledge categories"
  ON public.knowledge_categories;
CREATE POLICY "Management can delete knowledge categories"
  ON public.knowledge_categories FOR DELETE
  TO authenticated
  USING (public.is_management());

-- =============================================================================
-- knowledge_documents
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.knowledge_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size >= 0),
  mime_type TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (
    visibility IN (
      'all',
      'owner_admin',
      'sales',
      'setter',
      'closer',
      'project_manager',
      'customer_success'
    )
  ),
  content_type TEXT NOT NULL DEFAULT 'document' CHECK (
    content_type IN ('document', 'video', 'training', 'quiz', 'wiki')
  ),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_documents_category_id_idx
  ON public.knowledge_documents (category_id, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_documents_visibility_idx
  ON public.knowledge_documents (visibility);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read accessible knowledge documents"
  ON public.knowledge_documents;
CREATE POLICY "Users can read accessible knowledge documents"
  ON public.knowledge_documents FOR SELECT
  TO authenticated
  USING (
    public.user_can_view_knowledge_document(visibility)
    AND EXISTS (
      SELECT 1
      FROM public.knowledge_categories c
      WHERE c.id = category_id
        AND public.user_can_access_knowledge_category(c.slug)
    )
  );

DROP POLICY IF EXISTS "Management can insert knowledge documents"
  ON public.knowledge_documents;
CREATE POLICY "Management can insert knowledge documents"
  ON public.knowledge_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_management()
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

DROP POLICY IF EXISTS "Management can update knowledge documents"
  ON public.knowledge_documents;
CREATE POLICY "Management can update knowledge documents"
  ON public.knowledge_documents FOR UPDATE
  TO authenticated
  USING (public.is_management())
  WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "Management can delete knowledge documents"
  ON public.knowledge_documents;
CREATE POLICY "Management can delete knowledge documents"
  ON public.knowledge_documents FOR DELETE
  TO authenticated
  USING (public.is_management());

-- =============================================================================
-- Seed default categories
-- =============================================================================

INSERT INTO public.knowledge_categories (name, slug, description, sort_order)
VALUES
  ('Sales', 'sales', 'Vertriebsunterlagen und Playbooks', 10),
  ('Onboarding', 'onboarding', 'Einarbeitung und Erstschritte', 20),
  ('SOPs', 'sops', 'Standard Operating Procedures', 30),
  ('Verträge', 'vertraege', 'Vertragsvorlagen und rechtliche Dokumente', 40),
  ('Projekte', 'projekte', 'Projektmanagement und Kundenprojekte', 50),
  ('Marketing', 'marketing', 'Marketing-Materialien und Kampagnen', 60),
  ('Operations', 'operations', 'Interne Prozesse und Betrieb', 70)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- Storage bucket: knowledge-center
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-center',
  'knowledge-center',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can read knowledge center files in storage"
  ON storage.objects;
CREATE POLICY "Users can read knowledge center files in storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'knowledge-center'
    AND EXISTS (
      SELECT 1
      FROM public.knowledge_documents d
      WHERE d.file_url = name
        AND public.user_can_view_knowledge_document(d.visibility)
        AND EXISTS (
          SELECT 1
          FROM public.knowledge_categories c
          WHERE c.id = d.category_id
            AND public.user_can_access_knowledge_category(c.slug)
        )
    )
  );

DROP POLICY IF EXISTS "Management can upload knowledge center files"
  ON storage.objects;
CREATE POLICY "Management can upload knowledge center files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'knowledge-center'
    AND public.is_management()
  );

DROP POLICY IF EXISTS "Management can update knowledge center files"
  ON storage.objects;
CREATE POLICY "Management can update knowledge center files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'knowledge-center'
    AND public.is_management()
  )
  WITH CHECK (
    bucket_id = 'knowledge-center'
    AND public.is_management()
  );

DROP POLICY IF EXISTS "Management can delete knowledge center files"
  ON storage.objects;
CREATE POLICY "Management can delete knowledge center files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'knowledge-center'
    AND public.is_management()
  );

COMMENT ON TABLE public.knowledge_categories IS
  'Knowledge Center categories (Sales, SOPs, etc.). Extensible for videos, training, wiki.';
COMMENT ON TABLE public.knowledge_documents IS
  'Knowledge Center documents and future content types (video, training, quiz).';
COMMENT ON COLUMN public.knowledge_documents.content_type IS
  'Content type for future extensions: document, video, training, quiz, wiki.';
COMMENT ON COLUMN public.knowledge_documents.file_url IS
  'Storage path within the knowledge-center bucket.';
