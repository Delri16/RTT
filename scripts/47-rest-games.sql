-- 47 - Juegos de descanso (entre serie y serie).
--
-- Guarda el puntaje de cada partida. No toca nada de los puntos de actividad ni
-- del ranking global: es una tabla aparte, con su propio leaderboard semanal.
--
-- Hay UN juego por día, igual para todo el grupo (ver gameOfTheDay en
-- lib/rest-games.ts), así el resultado se puede comparar.

CREATE TABLE IF NOT EXISTS rest_game_scores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username   text NOT NULL,
  -- Día EN HORA ARGENTINA en que se jugó. Es la clave del "juego del día".
  day        date NOT NULL,
  game_key   text NOT NULL,
  score      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rest_game_scores_day_idx      ON rest_game_scores (day DESC);
CREATE INDEX IF NOT EXISTS rest_game_scores_username_idx ON rest_game_scores (username, day DESC);

-- La app entra con el anon key y estas tablas no tienen JWT con claims propios:
-- sin una policy permisiva, insertar/leer falla en silencio (mismo criterio que
-- el resto de las tablas del proyecto: "Public access").
ALTER TABLE rest_game_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access" ON rest_game_scores;
CREATE POLICY "Public access" ON rest_game_scores FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Leaderboard semanal.
--
-- Suma el MEJOR puntaje de cada día, no todas las partidas: así gana quien
-- juega bien varios días, y no quien repite la misma partida veinte veces en
-- una tarde.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_rest_game_leaderboard(
  since date DEFAULT NULL,
  limit_rows integer DEFAULT 20
)
RETURNS TABLE (
  username text,
  total_score bigint,
  days_played bigint,
  best_day integer
)
LANGUAGE sql
STABLE
AS $$
  WITH bests AS (
    SELECT s.username, s.day, MAX(s.score) AS best
    FROM rest_game_scores s
    WHERE since IS NULL OR s.day >= since
    GROUP BY s.username, s.day
  )
  SELECT
    b.username,
    SUM(b.best)::bigint   AS total_score,
    COUNT(*)::bigint      AS days_played,
    MAX(b.best)::integer  AS best_day
  FROM bests b
  GROUP BY b.username
  ORDER BY 2 DESC
  LIMIT limit_rows;
$$;

GRANT EXECUTE ON FUNCTION get_rest_game_leaderboard(date, integer) TO anon, authenticated;
