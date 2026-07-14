-- 37-add-routines.sql
-- Sección "Mi Rutina": rutinas personales, registro de series (peso/reps) y
-- récords personales (PR) que se pueden compartir al feed.
--
-- Tablas nuevas:
--   routines      -> rutinas armadas por el usuario. Los ejercicios se guardan
--                    en jsonb (array de {exercise_id, name, target_sets,
--                    target_reps, notes}); el catálogo real es estático
--                    (public/ejercicios.json), acá solo referenciamos id+nombre.
--   workout_sets  -> cada serie registrada en un entrenamiento (peso + reps).
--                    is_pr marca si esa serie superó el récord de ese ejercicio.
--   shared_prs    -> PRs compartidos al feed. Se inserta una fila por cada grupo
--                    del usuario (igual que un reporte), agrupadas por share_id
--                    para deduplicar en el feed del autor.
--
-- username es la PK de negocio en todo el proyecto (no auth.uid()). Este proyecto
-- Supabase tiene RLS habilitado en TODAS las tablas del schema public, pero cada
-- tabla de datos de usuario lleva una policy permisiva "Public access"
-- (FOR ALL TO public USING (true)) porque toda la app opera con la anon key.
-- Sin esa policy, RLS habilitado + 0 policies = deny all y los INSERT del cliente
-- fallan con "violates row-level security policy". Por eso al final replicamos ese
-- patrón en las 3 tablas nuevas (idempotente).
-- Correr a mano contra el proyecto real (este entorno no aplica migraciones solo).

CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '💪',
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS routines_username_idx ON routines (username);

CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  routine_id UUID REFERENCES routines (id) ON DELETE SET NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 0,
  reps INT NOT NULL DEFAULT 0,
  is_pr BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_sets_user_ex_idx ON workout_sets (username, exercise_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shared_prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL,
  username TEXT NOT NULL,
  group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  reps INT NOT NULL,
  prev_weight NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shared_prs_group_idx ON shared_prs (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shared_prs_share_idx ON shared_prs (share_id);

-- RLS: mismo patrón que el resto de la app (policy permisiva "Public access").
-- Idempotente: DROP IF EXISTS + CREATE.
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_prs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access" ON routines;
CREATE POLICY "Public access" ON routines FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON workout_sets;
CREATE POLICY "Public access" ON workout_sets FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON shared_prs;
CREATE POLICY "Public access" ON shared_prs FOR ALL TO public USING (true) WITH CHECK (true);
