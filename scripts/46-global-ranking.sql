-- 46 - Ranking global entre grupos.
--
-- Los puntos de cada grupo NO se tocan: los sigue definiendo cada admin en
-- group_activities.points / points_per_minute y los sigue calculando logActivity.
-- Esto agrega una SEGUNDA escala, paralela e independiente:
--
--   activity_relations.global_points = cuánto suma UNA sesión de ese deporte
--   en el ranking global, igual para todos los grupos.
--
-- Así "Gym" a 100 puntos en un grupo y "Gimnasio" a 50 en otro pesan lo mismo
-- en la tabla global (100), y el ranking entre grupos deja de ser comparar
-- peras con manzanas.
--
-- Gimnasio = 100 es el techo de la escala (pedido explícito). Nada supera 100.

-- ---------------------------------------------------------------------------
-- 1. Columnas nuevas en activity_relations
-- ---------------------------------------------------------------------------

ALTER TABLE activity_relations
  ADD COLUMN IF NOT EXISTS global_points integer NOT NULL DEFAULT 0,
  -- Id del deporte en lib/sport-icons.ts (SPORT_ICONS[].id). Es el puente que
  -- permite que user_activities.sport_icon (lo que la persona elige al registrar
  -- una actividad genérica "Otros") resuelva a una relación y por lo tanto sume
  -- en el ranking global.
  ADD COLUMN IF NOT EXISTS sport_key text,
  -- Categoría de lib/sport-icons.ts (SportCategory), para agrupar en el selector.
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE activity_relations
  DROP CONSTRAINT IF EXISTS activity_relations_global_points_check;
ALTER TABLE activity_relations
  ADD CONSTRAINT activity_relations_global_points_check
  CHECK (global_points >= 0 AND global_points <= 100);

-- sport_key es único cuando está seteado: es la clave de resolución desde
-- user_activities.sport_icon.
CREATE UNIQUE INDEX IF NOT EXISTS activity_relations_sport_key_uniq
  ON activity_relations (sport_key)
  WHERE sport_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Las 16 relaciones que ya existían: puntaje, sport_key, categoría.
--    Se actualizan por id porque group_activities.relation_id ya las referencia.
--    Dos tenían nombre de ícono de lucide ('timer', 'rotate-cw') en vez de emoji.
-- ---------------------------------------------------------------------------

UPDATE activity_relations SET global_points = 100, sport_key = 'gym',       category = 'gimnasio'    WHERE id = 1;  -- Gimnasio
UPDATE activity_relations SET global_points =  85, sport_key = 'running',   category = 'aire-libre'  WHERE id = 2;  -- Running
UPDATE activity_relations SET global_points =  85, sport_key = 'futbol',    category = 'pelota'      WHERE id = 3;  -- Fútbol 11
UPDATE activity_relations SET global_points =  75, sport_key = NULL,        category = 'pelota'      WHERE id = 4;  -- Fútbol 5 (comparte emoji con F11; el sport_key canónico queda en F11)
UPDATE activity_relations SET global_points =  80, sport_key = 'basquet',   category = 'pelota'      WHERE id = 5;  -- Básquet
UPDATE activity_relations SET global_points =  70, sport_key = 'tenis',     category = 'raqueta'     WHERE id = 6;  -- Tenis
UPDATE activity_relations SET global_points =  90, sport_key = 'natacion',  category = 'agua'        WHERE id = 7;  -- Natación
UPDATE activity_relations SET global_points =  85, sport_key = 'ciclismo',  category = 'aire-libre'  WHERE id = 8;  -- Ciclismo
UPDATE activity_relations SET global_points =  50, sport_key = 'yoga',      category = 'gimnasio'    WHERE id = 9;  -- Yoga
UPDATE activity_relations SET global_points =  90, sport_key = 'crossfit',  category = 'gimnasio'    WHERE id = 10; -- Crossfit
UPDATE activity_relations SET global_points =  90, sport_key = 'boxeo',     category = 'combate',
       name = 'Boxeo'                                                                                WHERE id = 11; -- era "Boxing", único nombre en inglés
UPDATE activity_relations SET global_points =  60, sport_key = 'pilates',   category = 'gimnasio',
       icon = '🧘‍♀️'                                                                                  WHERE id = 12; -- tenía icon='timer'
UPDATE activity_relations SET global_points =  85, sport_key = 'spinning',  category = 'gimnasio',
       icon = '🚲'                                                                                   WHERE id = 13; -- tenía icon='rotate-cw'
UPDATE activity_relations SET global_points =  50, sport_key = 'caminata',  category = 'aire-libre',
       icon = '🚶'                                                                                   WHERE id = 14; -- unifica con SPORT_ICONS
UPDATE activity_relations SET global_points =  85, sport_key = 'escalada',  category = 'aire-libre'  WHERE id = 15; -- Escalada
UPDATE activity_relations SET global_points =  60, sport_key = 'padel',     category = 'raqueta',
       icon = '🥎', description = 'Pádel en cancha de paletas'                                       WHERE id = 16; -- no tenía descripción

-- ---------------------------------------------------------------------------
-- 3. Las que faltaban. Se completan hasta cubrir los 56 deportes de
--    lib/sport-icons.ts, para que cualquier ícono elegido al registrar tenga
--    una relación (y por lo tanto puntaje global) detrás.
-- ---------------------------------------------------------------------------

INSERT INTO activity_relations (name, description, icon, sport_key, category, global_points) VALUES
  -- Con pelota
  ('Vóley',              'Vóley de cancha o de playa',              '🏐', 'voley',             'pelota',     70),
  ('Handball',           'Balonmano en cancha',                      '🤾', 'handball',          'pelota',     85),
  ('Rugby',              'Rugby en cualquiera de sus formatos',      '🏉', 'rugby',             'pelota',     90),
  ('Fútbol americano',   'Fútbol americano / flag',                  '🏈', 'futbol-americano',  'pelota',     80),
  ('Béisbol',            'Béisbol o softbol',                        '⚾', 'beisbol',           'pelota',     50),
  ('Hockey',             'Hockey sobre césped o piso',               '🏑', 'hockey',            'pelota',     80),
  ('Golf',               'Golf en cancha o driving range',           '⛳', 'golf',              'pelota',     40),
  ('Bowling',            'Bowling, bochas o bowls',                  '🎳', 'bowling',           'pelota',     40),
  -- Raqueta / paleta
  ('Ping pong',          'Tenis de mesa',                            '🏓', 'ping-pong',         'raqueta',    50),
  ('Bádminton',          'Bádminton individual o dobles',            '🏸', 'badminton',         'raqueta',    70),
  ('Squash',             'Squash en cancha cerrada',                 '🎾', 'squash',            'raqueta',    70),
  -- Agua
  ('Surf',               'Surf o bodyboard',                         '🏄', 'surf',              'agua',       70),
  ('Wakeboard',          'Wakeboard o esquí acuático',               '🚤', 'wakeboard',         'agua',       60),
  ('Kitesurf',           'Kitesurf o windsurf',                      '🪁', 'kitesurf',          'agua',       80),
  ('Kayak',              'Kayak, canotaje o stand up paddle',        '🛶', 'kayak',             'agua',       70),
  ('Remo',               'Remo en agua o ergómetro',                 '🚣', 'remo',              'agua',       90),
  ('Waterpolo',          'Polo acuático',                            '🤽', 'waterpolo',         'agua',       85),
  ('Buceo',              'Buceo, snorkel o apnea',                   '🤿', 'buceo',             'agua',       60),
  ('Vela',               'Navegación a vela',                        '⛵', 'vela',              'agua',       50),
  -- Aire libre
  ('Trekking',           'Senderismo o montaña',                     '🥾', 'trekking',          'aire-libre', 80),
  ('Mountain bike',      'Bicicleta de montaña',                     '🚵', 'mountain-bike',     'aire-libre', 85),
  ('Patín',              'Rollers o patinaje',                       '🛼', 'patin',             'aire-libre', 70),
  ('Skate',              'Skate o monopatín',                        '🛹', 'skate',             'aire-libre', 60),
  ('Equitación',         'Equitación e hípica',                      '🏇', 'equitacion',        'aire-libre', 60),
  ('Parapente',          'Parapente o paracaidismo',                 '🪂', 'parapente',         'aire-libre', 40),
  -- Gimnasio / fitness
  ('Funcional',          'Entrenamiento funcional o HIIT',           '💪', 'funcional',         'gimnasio',   90),
  ('Cardio',             'Cinta, elíptico o aeróbico',               '❤️‍🔥', 'cardio',            'gimnasio',   80),
  ('Baile',              'Baile, zumba o ritmos',                    '💃', 'baile',             'gimnasio',   60),
  -- Combate
  ('Artes marciales',    'Karate, judo, taekwondo, jiu jitsu',       '🥋', 'artes-marciales',   'combate',    85),
  ('Lucha',              'Lucha, wrestling o grappling',             '🤼', 'lucha',             'combate',    85),
  ('Esgrima',            'Esgrima con florete, espada o sable',      '🤺', 'esgrima',           'combate',    70),
  -- Invierno
  ('Ski',                'Esquí en nieve',                           '🎿', 'ski',               'invierno',   70),
  ('Snowboard',          'Snowboard en nieve',                       '🏂', 'snowboard',         'invierno',   70),
  ('Patinaje sobre hielo','Patinaje artístico o de velocidad',       '⛸️', 'patinaje-hielo',    'invierno',   60),
  ('Hockey sobre hielo', 'Hockey sobre hielo',                       '🏒', 'hockey-hielo',      'invierno',   80),
  -- Otros
  ('Tiro con arco',      'Arquería',                                 '🏹', 'tiro-con-arco',     'otros',      40),
  ('Pesca',              'Pesca deportiva',                          '🎣', 'pesca',             'otros',      30),
  ('Automovilismo',      'Karting, automovilismo o motociclismo',    '🏎️', 'automovilismo',     'otros',      30),
  ('Otro deporte',       'Cualquier otro deporte no listado',        '🏆', 'otro-deporte',      'otros',      50)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Backfill: las actividades de grupo que hoy no tienen relación.
--    Se matchea por nombre normalizado (sin acentos ni mayúsculas).
--    Las genéricas ("Otros") quedan a propósito SIN relación: su deporte lo
--    elige la persona al registrar y se resuelve por user_activities.sport_icon.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rtt_normalize_name(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(translate(coalesce(txt, ''), 'áàäâãéèëêíìïîóòöôõúùüûñÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑ',
                                            'aaaaaeeeeiiiiooooouuuunAAAAAEEEEIIIIOOOOOUUUUN'));
$$;

UPDATE group_activities ga
SET relation_id = ar.id
FROM activity_relations ar
WHERE ga.relation_id IS NULL
  AND rtt_normalize_name(ga.name) = rtt_normalize_name(ar.name);

-- Alias frecuentes que no matchean literal ("Gym" -> Gimnasio, "Bici" -> Ciclismo...).
UPDATE group_activities ga
SET relation_id = ar.id
FROM activity_relations ar
WHERE ga.relation_id IS NULL
  AND ar.sport_key = CASE rtt_normalize_name(ga.name)
        WHEN 'gym'          THEN 'gym'
        WHEN 'gimnasio'     THEN 'gym'
        WHEN 'pesas'        THEN 'gym'
        WHEN 'musculacion'  THEN 'gym'
        WHEN 'fierros'      THEN 'gym'
        WHEN 'bici'         THEN 'ciclismo'
        WHEN 'bicicleta'    THEN 'ciclismo'
        WHEN 'correr'       THEN 'running'
        WHEN 'trote'        THEN 'running'
        WHEN 'nadar'        THEN 'natacion'
        WHEN 'natacion'     THEN 'natacion'
        WHEN 'futbol'       THEN 'futbol'
        WHEN 'futbol 5'     THEN 'futbol'
        WHEN 'f5'           THEN 'futbol'
        WHEN 'picadito'     THEN 'futbol'
        WHEN 'basket'       THEN 'basquet'
        WHEN 'basquetbol'   THEN 'basquet'
        WHEN 'paddle'       THEN 'padel'
        WHEN 'box'          THEN 'boxeo'
        WHEN 'caminar'      THEN 'caminata'
        WHEN 'hiit'         THEN 'funcional'
        ELSE NULL
      END;

-- "Fútbol 5" tiene relación propia (id 4) y gana sobre el alias genérico de fútbol.
UPDATE group_activities ga
SET relation_id = 4
WHERE rtt_normalize_name(ga.name) IN ('futbol 5', 'f5', 'futsal');

-- ---------------------------------------------------------------------------
-- 5. Índices para la query del ranking global.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS user_activities_completed_at_idx
  ON user_activities (completed_at DESC);
CREATE INDEX IF NOT EXISTS user_activities_username_completed_idx
  ON user_activities (username, completed_at DESC);
CREATE INDEX IF NOT EXISTS group_activities_relation_idx
  ON group_activities (relation_id);

-- ---------------------------------------------------------------------------
-- 6. RPC del ranking global.
--
--    Puntaje de cada registro = global_points de la relación que le corresponde,
--    resolviendo en este orden:
--      a) user_activities.sport_icon -> activity_relations.sport_key
--         (lo eligió la persona al registrar: es el dato más específico)
--      b) group_activities.relation_id
--      c) sin relación -> 0 (no suma al global)
--
--    Los reportes de peso insertan filas con activity_id NULL: quedan en 0, el
--    ranking global es solo de actividad física.
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
  SELECT
    ua.username,
    COALESCE(SUM(COALESCE(sr.global_points, gr.global_points, 0)), 0)::bigint AS global_points,
    COUNT(*) FILTER (WHERE COALESCE(sr.id, gr.id) IS NOT NULL)::bigint       AS activities,
    COUNT(DISTINCT COALESCE(sr.id, gr.id))::bigint                            AS sports,
    MAX(ua.completed_at)                                                      AS last_activity
  FROM user_activities ua
  LEFT JOIN group_activities ga ON ga.id = ua.activity_id
  LEFT JOIN activity_relations gr ON gr.id = ga.relation_id
  LEFT JOIN activity_relations sr ON sr.sport_key = ua.sport_icon
  WHERE ua.activity_id IS NOT NULL
    AND (since IS NULL OR ua.completed_at >= since)
    AND (until IS NULL OR ua.completed_at <= until)
  GROUP BY ua.username
  HAVING COALESCE(SUM(COALESCE(sr.global_points, gr.global_points, 0)), 0) > 0
  ORDER BY 2 DESC, 3 ASC;
$$;

-- Desglose por deporte de una persona, para el detalle del ranking.
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
  SELECT
    rel.id                              AS relation_id,
    rel.name::text                      AS relation_name,
    rel.icon::text                      AS icon,
    rel.global_points                   AS unit_points,
    COUNT(*)::bigint                    AS activities,
    (COUNT(*) * rel.global_points)::bigint AS total_points
  FROM user_activities ua
  LEFT JOIN group_activities ga ON ga.id = ua.activity_id
  LEFT JOIN activity_relations gr ON gr.id = ga.relation_id
  LEFT JOIN activity_relations sr ON sr.sport_key = ua.sport_icon
  JOIN activity_relations rel ON rel.id = COALESCE(sr.id, gr.id)
  WHERE ua.username = target_username
    AND ua.activity_id IS NOT NULL
    AND rel.global_points > 0
    AND (since IS NULL OR ua.completed_at >= since)
  GROUP BY rel.id, rel.name, rel.icon, rel.global_points
  ORDER BY 6 DESC;
$$;

-- Días (en hora Argentina) con al menos una actividad, para calcular rachas.
CREATE OR REPLACE FUNCTION get_user_active_days(
  target_username text,
  since timestamptz DEFAULT NULL
)
RETURNS TABLE (day date, activities bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (ua.completed_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS day,
    COUNT(*)::bigint
  FROM user_activities ua
  WHERE ua.username = target_username
    AND ua.activity_id IS NOT NULL
    AND (since IS NULL OR ua.completed_at >= since)
  GROUP BY 1
  ORDER BY 1 DESC;
$$;

GRANT EXECUTE ON FUNCTION get_global_ranking(timestamptz, timestamptz)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_global_sport_breakdown(text, timestamptz)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_days(text, timestamptz)        TO anon, authenticated;
