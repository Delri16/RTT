-- 38-add-shared-routines.sql
-- Compartir una rutina al feed de los grupos del usuario (como un reporte o un PR).
--
-- shared_routines guarda un SNAPSHOT de la rutina (nombre, emoji, descripción y
-- ejercicios en jsonb) al momento de compartir, uno por cada grupo del usuario,
-- agrupados por share_id para deduplicar en el feed del autor. Guardar snapshot
-- (y no un FK a routines) evita que el post se rompa o cambie si después editás
-- o borrás la rutina original.
--
-- Otros miembros pueden verla en el inicio y "agregarla como propia" (se copia a
-- su tabla routines con createRoutine y desde ahí la editan normal).
--
-- RLS: mismo patrón permisivo "Public access" que el resto de la app (ver 37).

CREATE TABLE IF NOT EXISTS shared_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL,
  username TEXT NOT NULL,
  group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  routine_id UUID,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '💪',
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shared_routines_group_idx ON shared_routines (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shared_routines_share_idx ON shared_routines (share_id);

ALTER TABLE shared_routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access" ON shared_routines;
CREATE POLICY "Public access" ON shared_routines FOR ALL TO public USING (true) WITH CHECK (true);
