-- 49: el deporte de una actividad con ícono fijo no se elige al registrar.
--
-- Hasta ahora el selector de deporte aparecía también en las actividades que ya
-- tenían deporte fijo (Gimnasio, Padel, ...), y alguna gente lo cambiaba: quedaron
-- registros de "Gimnasio" guardados como handball / ping-pong / bowling / tiro con
-- arco. Eso los hacía puntuar mal (o nada) en el ranking global y les impedía
-- replicarse en los otros grupos.
--
-- Desde ahora `logActivity` ignora el deporte elegido si la actividad tiene uno
-- fijo. Este script alinea los registros históricos con el ícono de su actividad.
--
-- Ya corrido en el proyecto real el 7/9/2026 (4 filas, todas de "Gimnasio").

UPDATE user_activities ua
SET sport_icon = ga.icon
FROM group_activities ga
WHERE ga.id = ua.activity_id
  AND ga.icon IS NOT NULL
  AND ua.sport_icon IS NOT NULL
  AND ua.sport_icon <> ga.icon;
