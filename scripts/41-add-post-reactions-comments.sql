-- 41-add-post-reactions-comments.sql
-- Reacciones con emoji + comentarios sobre los posts del feed.
--
-- Aplica SOLO a reportes de peso, rutinas compartidas y PRs compartidos
-- (post_type 'report' | 'routine' | 'pr'). Las actividades sueltas quedan afuera
-- a propósito: son demasiadas y ensucian el feed.
--
-- post_id no es un FK: cada tipo de post vive en una tabla distinta y además
-- rutinas/PRs se identifican por su `share_id` (una fila por grupo, agrupadas),
-- no por el id de fila. Por eso la clave lógica es (post_type, post_id).
--
-- Todo es público: cualquier miembro ve las reacciones y comentarios de todos,
-- igual que el resto del feed. RLS con el mismo patrón permisivo "Public access".

CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type TEXT NOT NULL CHECK (post_type IN ('report', 'routine', 'pr')),
  post_id TEXT NOT NULL,
  username TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Una reacción por emoji por persona por post (toggle: insert / delete).
  UNIQUE (post_type, post_id, username, emoji)
);

CREATE INDEX IF NOT EXISTS post_reactions_post_idx ON post_reactions (post_type, post_id);

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access" ON post_reactions;
CREATE POLICY "Public access" ON post_reactions FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type TEXT NOT NULL CHECK (post_type IN ('report', 'routine', 'pr')),
  post_id TEXT NOT NULL,
  username TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_comments_post_idx ON post_comments (post_type, post_id, created_at);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access" ON post_comments;
CREATE POLICY "Public access" ON post_comments FOR ALL TO public USING (true) WITH CHECK (true);
