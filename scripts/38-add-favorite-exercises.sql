-- 38-add-favorite-exercises.sql
-- Ejercicios favoritos: permite marcar ejercicios del catálogo estático
-- (public/ejercicios.json) para verlos en la tab "Favoritos" de Mi Rutina y
-- registrar series sueltas (peso/reps) sin necesidad de armar una rutina.
--
-- username es la PK de negocio (no auth.uid()). Mismo patrón de RLS que el
-- resto de la app: policy permisiva "Public access" porque se opera con la
-- anon key. Correr a mano contra el proyecto real.

CREATE TABLE IF NOT EXISTS favorite_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (username, exercise_id)
);

CREATE INDEX IF NOT EXISTS favorite_exercises_user_idx ON favorite_exercises (username, created_at DESC);

ALTER TABLE favorite_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access" ON favorite_exercises;
CREATE POLICY "Public access" ON favorite_exercises FOR ALL TO public USING (true) WITH CHECK (true);
