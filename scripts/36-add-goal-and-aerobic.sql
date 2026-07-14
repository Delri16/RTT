-- 36-add-goal-and-aerobic.sql
-- Objetivo de peso por usuario + composición aeróbica/anaeróbica por actividad.
--
-- Sistema de puntos dinámicos:
--   * profiles.goal: objetivo de peso del usuario ('lose' | 'gain' | 'maintain').
--     Default 'maintain' -> multiplicador neutro, nada cambia si no lo elige.
--   * group_activities.aerobic_pct: % aeróbico de la actividad (0..100).
--     El resto (100 - aerobic_pct) es anaeróbico/fuerza.
--     Default 50 = neutro -> las ~1091 actividades ya cargadas NO cambian de puntaje
--     hasta que un admin les configure el %.
--
-- La fórmula del multiplicador vive en lib/actions.ts (applyGoalMultiplier), con k = 0.15.
-- Correr a mano contra el proyecto real (este entorno no aplica migraciones solo).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS goal TEXT NOT NULL DEFAULT 'maintain';

-- CHECK idempotente: solo lo agrega si no existe todavía.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_goal_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_goal_check CHECK (goal IN ('lose', 'gain', 'maintain'));
  END IF;
END $$;

ALTER TABLE group_activities
  ADD COLUMN IF NOT EXISTS aerobic_pct INT NOT NULL DEFAULT 50;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_activities_aerobic_pct_check'
  ) THEN
    ALTER TABLE group_activities
      ADD CONSTRAINT group_activities_aerobic_pct_check CHECK (aerobic_pct BETWEEN 0 AND 100);
  END IF;
END $$;
