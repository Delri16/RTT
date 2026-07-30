-- 43-post-interaction-notifications-and-push.sql
-- Notificaciones por reacciones/comentarios en posts del feed + Web Push real.
--
-- 1. Agrega 2 tipos nuevos a `notifications`:
--      * post_reaction: alguien reaccionó con un emoji a tu reporte/rutina/PR.
--      * post_comment: alguien comentó tu reporte/rutina/PR.
--    Las inserta lib/actions.ts (setPostReaction / addPostComment), no un
--    trigger: el mismo code path server-side también dispara el Web Push.
--
-- 2. Crea `push_subscriptions`: una fila por dispositivo suscripto a Web Push
--    (endpoint + claves p256dh/auth que devuelve pushManager.subscribe()).
--    Un mismo usuario puede tener varias (teléfono + compu). El endpoint es
--    único: si otro usuario se loguea en el mismo dispositivo, el upsert le
--    transfiere la suscripción.
--
-- Correr a mano contra el proyecto real.

-- ---------------------------------------------------------------------------
-- 1. Ampliar los CHECK constraints de `notifications`.
-- ---------------------------------------------------------------------------

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'activity_tag', 'activity_request', 'group_invite',
    'rank_overtake_weekly', 'rank_overtake_general',
    'rank_lead_weekly', 'rank_lead_general',
    'report_available',
    'post_reaction', 'post_comment'
  ));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS has_related_entity;
ALTER TABLE notifications ADD CONSTRAINT has_related_entity CHECK (
  activity_tag_id IS NOT NULL OR
  activity_request_id IS NOT NULL OR
  notification_type IN (
    'group_invite',
    'rank_overtake_weekly', 'rank_overtake_general',
    'rank_lead_weekly', 'rank_lead_general',
    'report_available',
    'post_reaction', 'post_comment'
  )
);

-- ---------------------------------------------------------------------------
-- 2. Suscripciones Web Push.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES profiles(username) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_username_idx ON push_subscriptions (username);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access" ON push_subscriptions;
CREATE POLICY "Public access" ON push_subscriptions FOR ALL TO public USING (true) WITH CHECK (true);
