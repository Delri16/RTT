-- Íconos de deporte para las actividades (100% informativo: no toca puntos ni ranking).
--
-- 1) group_activities.icon: ícono fijo elegido al crear/editar la actividad del grupo
--    (ej: la actividad "Running" queda con 🏃). Ids del catálogo de lib/sport-icons.ts.
-- 2) user_activities.sport_icon: ícono elegido al REGISTRAR, solo para las actividades
--    genéricas cuyo nombre es "Otros"/"Otra"/etc. Ahí cada registro dice de qué deporte
--    se trató, y eso es lo que se ve en el feed de Inicio y en el calendario del grupo.
--
-- Ambas columnas son nullable: los ~1091 registros históricos quedan sin ícono y se
-- muestran igual que hasta ahora (la mancuerna genérica).

ALTER TABLE group_activities ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE user_activities ADD COLUMN IF NOT EXISTS sport_icon TEXT;

COMMENT ON COLUMN group_activities.icon IS
  'Id del ícono de deporte (lib/sport-icons.ts). Solo informativo.';
COMMENT ON COLUMN user_activities.sport_icon IS
  'Id del ícono de deporte elegido al registrar una actividad genérica "Otros" (lib/sport-icons.ts). Solo informativo.';

-- Nota: no hacen falta policies nuevas. Ambas tablas ya tienen policies permisivas
-- ("Public access"), que aplican a la fila entera, no por columna.
