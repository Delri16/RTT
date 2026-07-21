-- 39-add-goal-updated-at.sql
-- Trackea la última vez que cada usuario cambió su objetivo de peso (profiles.goal),
-- para poder limitar el cambio a 1 vez por mes (lib/actions.ts -> updateProfile).
--
-- Correr a mano contra el proyecto real (este entorno no aplica migraciones solo).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS goal_updated_at TIMESTAMPTZ;
