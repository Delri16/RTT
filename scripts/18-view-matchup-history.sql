-- Corregir nombres de columnas a player_a_username y player_b_username
-- Script para ver y gestionar el historial de enfrentamientos
-- Este script te permite ver quién jugó contra quién y cuántas veces

-- Ver todo el historial de enfrentamientos de un grupo
-- Reemplaza 'TU_GROUP_ID' con el ID de tu grupo
SELECT 
  player_a_username,
  player_b_username,
  times_played,
  created_at,
  updated_at
FROM groups_rodeo_matchup_history
WHERE group_id = '51670323-4731-4b07-a7aa-0786ab89daa2'
ORDER BY times_played DESC, player_a_username, player_b_username;

-- Ver el estado de BYEs (fechas libres) por jugador
SELECT 
    player_username,
    bye_count,
    wins,
    losses,
    draws,
    proteins,
    creatines
FROM groups_rodeo_standings
WHERE group_id = '51670323-4731-4b07-a7aa-0786ab89daa2'
ORDER BY bye_count ASC, player_username;

-- Si necesitas resetear el historial completamente (empezar de cero):
-- DELETE FROM groups_rodeo_matchup_history WHERE group_id = '51670323-4731-4b07-a7aa-0786ab89daa2';

-- Si necesitas ajustar un enfrentamiento específico manualmente:
-- UPDATE groups_rodeo_matchup_history 
-- SET times_played = 0
-- WHERE group_id = '51670323-4731-4b07-a7aa-0786ab89daa2'
-- AND ((player_a_username = 'Tomi 🦍' AND player_b_username = 'Toro') OR (player_a_username = 'Toro' AND player_b_username = 'Tomi 🦍'));
