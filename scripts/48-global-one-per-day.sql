-- 48 - Ranking global: un solo deporte por día, y el deporte manda.
--
-- Tres cambios sobre el script 46, todos en la MISMA dirección:
--
-- 1. **Un registro por persona, deporte y día.** Si hacés gimnasio dos veces el
--    mismo día, en la general suma una sola vez. Esto además resuelve solo el
--    doble conteo de la réplica entre grupos: logActivity inserta una fila por
--    cada grupo del usuario que tenga esa actividad relacionada, y antes las
--    sumaba todas.
--
-- 2. **El deporte elegido al registrar es la fuente de verdad.** sport_icon pasa
--    a ser obligatorio del lado de la app, así que se resuelve primero por
--    sport_key y recién después por group_activities.relation_id (que queda como
--    fallback para los ~260 registros históricos, anteriores a esta regla).
--
-- 3. Cuando un mismo día hay dos filas del mismo deporte con puntajes distintos
--    (grupos con actividades configuradas distinto), se toma el MAYOR.
--
-- Los puntos de cada grupo siguen sin tocarse: esto es solo la tabla general.

-- ---------------------------------------------------------------------------
-- Vista base: cada registro con su relación y su día en hora Argentina.
-- La comparten las tres funciones para no repetir el triple LEFT JOIN.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW global_activity_days AS
SELECT
  ua.username,
  (ua.completed_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS day,
  COALESCE(sr.id, gr.id)                        AS relation_id,
  COALESCE(sr.global_points, gr.global_points)  AS points,
  ua.completed_at
FROM user_activities ua
LEFT JOIN group_activities ga  ON ga.id = ua.activity_id
LEFT JOIN activity_relations gr ON gr.id = ga.relation_id
-- sport_icon guarda un id de SPORT_ICONS (lib/sport-icons.ts); sport_key es el
-- puente con activity_relations. Va primero: es lo que la persona eligió.
LEFT JOIN activity_relations sr ON sr.sport_key = ua.sport_icon
WHERE ua.activity_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Ranking global
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_global_ranking(
  since timestamptz DEFAULT NULL,
  until timestamptz DEFAULT NULL
)
RETURNS TABLE (
  username text,
  global_points bigint,
  activities bigint,
  sports bigint,
  last_activity timestamptz
)
LANGUAGE sql
STABLE
AS $$
  WITH deduped AS (
    SELECT
      d.username,
      d.day,
      d.relation_id,
      MAX(d.points)       AS points,
      MAX(d.completed_at) AS completed_at
    FROM global_activity_days d
    WHERE d.relation_id IS NOT NULL
      AND d.points > 0
      AND (since IS NULL OR d.completed_at >= since)
      AND (until IS NULL OR d.completed_at <= until)
    GROUP BY d.username, d.day, d.relation_id
  )
  SELECT
    x.username,
    SUM(x.points)::bigint                  AS global_points,
    COUNT(*)::bigint                       AS activities,
    COUNT(DISTINCT x.relation_id)::bigint  AS sports,
    MAX(x.completed_at)                    AS last_activity
  FROM deduped x
  GROUP BY x.username
  HAVING SUM(x.points) > 0
  ORDER BY 2 DESC, 3 ASC;
$$;

-- ---------------------------------------------------------------------------
-- Desglose por deporte de una persona (mismo criterio de deduplicación)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_global_sport_breakdown(
  target_username text,
  since timestamptz DEFAULT NULL
)
RETURNS TABLE (
  relation_id integer,
  relation_name text,
  icon text,
  unit_points integer,
  activities bigint,
  total_points bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH deduped AS (
    SELECT d.day, d.relation_id, MAX(d.points) AS points
    FROM global_activity_days d
    WHERE d.username = target_username
      AND d.relation_id IS NOT NULL
      AND d.points > 0
      AND (since IS NULL OR d.completed_at >= since)
    GROUP BY d.day, d.relation_id
  )
  SELECT
    rel.id                    AS relation_id,
    rel.name::text            AS relation_name,
    rel.icon::text            AS icon,
    rel.global_points         AS unit_points,
    COUNT(*)::bigint          AS activities,
    SUM(x.points)::bigint     AS total_points
  FROM deduped x
  JOIN activity_relations rel ON rel.id = x.relation_id
  GROUP BY rel.id, rel.name, rel.icon, rel.global_points
  ORDER BY 6 DESC;
$$;

-- ---------------------------------------------------------------------------
-- Resolver un sport_key a su relación. La usa logActivity para saber en qué
-- otros grupos replicar el registro según el deporte ELEGIDO, y no solo según
-- la relación fija de la actividad de origen.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_relation_by_sport_key(p_sport_key text)
RETURNS TABLE (id integer, name text, global_points integer)
LANGUAGE sql
STABLE
AS $$
  SELECT ar.id, ar.name::text, ar.global_points
  FROM activity_relations ar
  WHERE ar.sport_key = p_sport_key
  LIMIT 1;
$$;

GRANT SELECT ON global_activity_days TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_global_ranking(timestamptz, timestamptz)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_global_sport_breakdown(text, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_relation_by_sport_key(text)               TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Arreglos de datos que acompañan el cambio (ya aplicados en producción).
-- ---------------------------------------------------------------------------

-- 1. Restaurar la relación de "Gimnasio" (Road To Rio 2027), la actividad más
--    usada de la app. La había perdido porque updateGroupActivity escribía
--    `relation_id: null` cuando el form no mandaba el campo, y el formulario de
--    edición (components/activity-manager.tsx) nunca lo mandaba. Se arregla de
--    raíz con resolveRelationId() en lib/actions.ts, que ahora deriva la
--    relación del deporte y, si no hay, preserva la que estaba.
UPDATE group_activities SET relation_id = 1
WHERE name = 'Gimnasio' AND relation_id IS NULL;

-- 2. Completar el emoji de deporte de las actividades que ya tenían relación.
--    Sin esto, al registrar habría que elegir el deporte a mano todas las veces,
--    porque la precarga del selector se apoya en group_activities.icon.
UPDATE group_activities ga
SET icon = ar.sport_key
FROM activity_relations ar
WHERE ga.relation_id = ar.id
  AND ga.icon IS NULL
  AND ar.sport_key IS NOT NULL;

-- 3. Unificar "Fútbol 5" (id 4) contra "Fútbol 11" (id 3, sport_key 'futbol').
--    El catálogo de deportes tiene un solo "Fútbol", así que mantener dos
--    relaciones futboleras reintroduce justo la desincronización que este
--    cambio elimina. La relación 4 queda sin uso pero no se borra (historial).
UPDATE group_activities SET relation_id = 3, icon = 'futbol'
WHERE relation_id = 4;
