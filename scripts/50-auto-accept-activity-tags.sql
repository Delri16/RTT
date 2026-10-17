-- ============================================================================
-- 50 — Etiquetas de actividad: se cargan directo, sin aceptar
-- ============================================================================
-- Antes: etiquetar a alguien creaba una fila `activity_tags` en 'pending' y el
-- etiquetado tenía que entrar a /activity-tags y aceptar para que se le
-- registrara la actividad. Ahora `logActivity` le registra la actividad al
-- etiquetado en el momento (con SUS puntos, según su objetivo) y guarda la
-- etiqueta directamente como 'accepted'. Al etiquetado le llega una
-- notificación nueva (`activity_auto_logged`) + push avisando que ya está
-- cargada, para que no la cargue dos veces.
--
-- Qué hace este script:
--   1. Suma el tipo `activity_auto_logged` a los CHECK de `notifications`.
--   2. El trigger de `activity_tags` distingue: si la etiqueta nace 'accepted'
--      manda la notificación nueva ("ya está cargada"); si nace 'pending'
--      (flujo viejo, por si queda algo) manda la de siempre.
--   3. RPC `create_accepted_activity_tags`, igual a `create_activity_tags`
--      pero insertando en 'accepted' con `responded_at`. Ignora duplicados
--      (misma actividad + mismo etiquetado) en vez de fallar.
-- ============================================================================

-- 1. Tipos de notificación --------------------------------------------------

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'activity_tag', 'activity_request', 'group_invite',
    'rank_overtake_weekly', 'rank_overtake_general',
    'rank_lead_weekly', 'rank_lead_general',
    'report_available',
    'post_reaction', 'post_comment',
    'activity_auto_logged'
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
    'post_reaction', 'post_comment',
    'activity_auto_logged'
  )
);

-- 2. Trigger: notificación según cómo nace la etiqueta -----------------------

CREATE OR REPLACE FUNCTION create_activity_tag_notification()
RETURNS TRIGGER AS $$
DECLARE
  activity_name TEXT;
  group_name TEXT;
BEGIN
  SELECT ga.name INTO activity_name
  FROM user_activities ua
  JOIN group_activities ga ON ua.activity_id = ga.id
  WHERE ua.id = NEW.activity_id;

  SELECT g.name INTO group_name FROM groups g WHERE g.id = NEW.group_id;

  IF NEW.status = 'accepted' THEN
    -- Flujo nuevo: la actividad ya quedó registrada para el etiquetado.
    INSERT INTO notifications (
      user_username, group_id, notification_type, activity_tag_id, title, message
    ) VALUES (
      NEW.tagged_user,
      NEW.group_id,
      'activity_auto_logged',
      NEW.id,
      'Te cargaron una actividad',
      NEW.tagged_by || ' registró "' || COALESCE(activity_name, 'una actividad') || '"'
        || COALESCE(' en ' || group_name, '')
        || ' y te etiquetó. Ya suma en tu cuenta: no la cargues de nuevo.'
    );
  ELSE
    -- Flujo viejo (pendiente de aceptar), se deja por compatibilidad.
    INSERT INTO notifications (
      user_username, group_id, notification_type, activity_tag_id, title, message
    ) VALUES (
      NEW.tagged_user,
      NEW.group_id,
      'activity_tag',
      NEW.id,
      'Nueva actividad compartida',
      NEW.tagged_by || ' te ha etiquetado en: ' || COALESCE(activity_name, 'una actividad')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- El trigger ya existe (script 19) y apunta a esta función; no hace falta recrearlo.

-- 3. RPC: etiquetas que nacen aceptadas ---------------------------------------

CREATE OR REPLACE FUNCTION create_accepted_activity_tags(
  p_activity_id UUID,
  p_group_id UUID,
  p_tagged_by TEXT,
  p_tagged_users TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tagged_user TEXT;
BEGIN
  FOREACH v_tagged_user IN ARRAY p_tagged_users
  LOOP
    INSERT INTO activity_tags (activity_id, group_id, tagged_by, tagged_user, status, responded_at)
    VALUES (p_activity_id, p_group_id, p_tagged_by, v_tagged_user, 'accepted', NOW())
    ON CONFLICT (activity_id, tagged_user) DO NOTHING;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION create_accepted_activity_tags(UUID, UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION create_accepted_activity_tags(UUID, UUID, TEXT, TEXT[]) TO anon;
