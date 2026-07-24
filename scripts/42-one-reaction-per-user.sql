-- 42-one-reaction-per-user.sql
-- Cambia la regla de reacciones: una sola por persona por post (antes se podía
-- marcar un emoji de cada tipo). Ahora elegir otro emoji reemplaza al anterior.
--
-- Correr DESPUÉS de 41-add-post-reactions-comments.sql.

-- 1. Deduplicar lo que ya exista: se queda la reacción más reciente de cada
--    persona en cada post, el resto se borra.
DELETE FROM post_reactions pr
WHERE EXISTS (
  SELECT 1 FROM post_reactions newer
  WHERE newer.post_type = pr.post_type
    AND newer.post_id = pr.post_id
    AND newer.username = pr.username
    AND (newer.created_at, newer.id) > (pr.created_at, pr.id)
);

-- 2. Reemplazar el UNIQUE viejo (incluía el emoji) por uno sin emoji.
ALTER TABLE post_reactions DROP CONSTRAINT IF EXISTS post_reactions_post_type_post_id_username_emoji_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_reactions_one_per_user'
  ) THEN
    ALTER TABLE post_reactions
      ADD CONSTRAINT post_reactions_one_per_user UNIQUE (post_type, post_id, username);
  END IF;
END $$;
