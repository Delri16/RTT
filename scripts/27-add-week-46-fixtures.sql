-- Add missing Week 46 fixtures to rodeo history
-- Group ID: 51670323-4731-4b07-a7aa-0786ab89daa2

-- Week 46: 9/11/2025 - 16/11/2025

-- Nico Torotis (700) vs Tomi (625) - Nico Torotis wins
INSERT INTO groups_rodeo_history (
  group_id,
  player_a_username,
  player_b_username,
  player_a_points,
  player_b_points,
  winner_username,
  week_number,
  week_start,
  week_end,
  closed_at,
  is_bye
) VALUES (
  '51670323-4731-4b07-a7aa-0786ab89daa2',
  'Nico Torotis',
  'Tomi',
  700,
  625,
  'Nico Torotis',
  46,
  '2025-11-09'::timestamp,
  '2025-11-16'::timestamp,
  '2025-11-17'::timestamp,
  false
)
ON CONFLICT DO NOTHING;

-- Santi (558) vs ALISTAR (360) - Santi wins
INSERT INTO groups_rodeo_history (
  group_id,
  player_a_username,
  player_b_username,
  player_a_points,
  player_b_points,
  winner_username,
  week_number,
  week_start,
  week_end,
  closed_at,
  is_bye
) VALUES (
  '51670323-4731-4b07-a7aa-0786ab89daa2',
  'Santi',
  'ALISTAR',
  558,
  360,
  'Santi',
  46,
  '2025-11-09'::timestamp,
  '2025-11-16'::timestamp,
  '2025-11-17'::timestamp,
  false
)
ON CONFLICT DO NOTHING;

-- Beast-noy (120) vs Toro (0) - Beast-noy wins
INSERT INTO groups_rodeo_history (
  group_id,
  player_a_username,
  player_b_username,
  player_a_points,
  player_b_points,
  winner_username,
  week_number,
  week_start,
  week_end,
  closed_at,
  is_bye
) VALUES (
  '51670323-4731-4b07-a7aa-0786ab89daa2',
  'Beast-noy',
  'Toro',
  120,
  0,
  'Beast-noy',
  46,
  '2025-11-09'::timestamp,
  '2025-11-16'::timestamp,
  '2025-11-17'::timestamp,
  false
)
ON CONFLICT DO NOTHING;

-- ruso (549) vs 84 (0) - ruso wins
INSERT INTO groups_rodeo_history (
  group_id,
  player_a_username,
  player_b_username,
  player_a_points,
  player_b_points,
  winner_username,
  week_number,
  week_start,
  week_end,
  closed_at,
  is_bye
) VALUES (
  '51670323-4731-4b07-a7aa-0786ab89daa2',
  'ruso',
  '84',
  549,
  0,
  'ruso',
  46,
  '2025-11-09'::timestamp,
  '2025-11-16'::timestamp,
  '2025-11-17'::timestamp,
  false
)
ON CONFLICT DO NOTHING;
