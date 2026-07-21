-- 40-notification-triggers.sql
-- Notificaciones automáticas de ranking + reporte pendiente.
--
-- Agrega 5 tipos nuevos a `notifications` (además de los ya existentes
-- 'activity_tag' | 'activity_request' | 'group_invite', ver
-- scripts/19-create-activity-tags-system.sql):
--   * rank_overtake_general / rank_overtake_weekly: a alguien lo pasaste en el
--     ranking general o semanal de un grupo -> se le notifica a ESA persona.
--   * rank_lead_general / rank_lead_weekly: pasaste a liderar el ranking
--     general o semanal de un grupo -> te notifica a VOS (motivacional).
--   * report_available: te toca subir el reporte quincenal de un grupo.
--
-- Los 4 de ranking se disparan con un trigger AFTER INSERT en user_activities
-- (cubre logActivity y logRelatedActivity, que insertan ahí sea cual sea el
-- flujo). report_available corre por un cron diario (requiere la extensión
-- pg_cron - Database > Extensions en el dashboard de Supabase).
--
-- Correr a mano contra el proyecto real (este entorno no aplica migraciones solo).

-- ---------------------------------------------------------------------------
-- 1. Ampliar los CHECK constraints de `notifications` para los tipos nuevos.
-- ---------------------------------------------------------------------------

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'activity_tag', 'activity_request', 'group_invite',
    'rank_overtake_weekly', 'rank_overtake_general',
    'rank_lead_weekly', 'rank_lead_general',
    'report_available'
  ));

-- has_related_entity exigía activity_tag_id/activity_request_id salvo para
-- group_invite; los tipos nuevos tampoco tienen una entidad relacionada.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS has_related_entity;
ALTER TABLE notifications ADD CONSTRAINT has_related_entity CHECK (
  activity_tag_id IS NOT NULL OR
  activity_request_id IS NOT NULL OR
  notification_type IN (
    'group_invite',
    'rank_overtake_weekly', 'rank_overtake_general',
    'rank_lead_weekly', 'rank_lead_general',
    'report_available'
  )
);

-- ---------------------------------------------------------------------------
-- 2. Trigger: te pasaron de puesto / pasaste a liderar (general y semanal).
--
-- "Semana" = lunes 00:00 a domingo 23:59:59 en hora Argentina (UTC-3), igual
-- criterio que getGroupRankingByWeek en lib/actions.ts.
--
-- Se compara el total de cada rival ANTES vs DESPUÉS de sumar esta actividad:
-- si un rival quedó estrictamente entre el "antes" y el "después" del actor,
-- lo acaba de pasar. Si el actor queda en (o encima) del máximo de sus rivales
-- y antes no lo estaba, pasó a liderar.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_rank_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_group_name TEXT;
  v_after_general NUMERIC;
  v_before_general NUMERIC;
  v_week_start TIMESTAMPTZ;
  v_week_end TIMESTAMPTZ;
  v_after_weekly NUMERIC;
  v_before_weekly NUMERIC;
  v_max_other_general NUMERIC;
  v_max_other_weekly NUMERIC;
BEGIN
  IF NEW.points_earned IS NULL OR NEW.points_earned <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_group_name FROM groups WHERE id = NEW.group_id;

  SELECT COALESCE(SUM(points_earned), 0) INTO v_after_general
  FROM user_activities
  WHERE group_id = NEW.group_id AND username = NEW.username;
  v_before_general := v_after_general - NEW.points_earned;

  v_week_start := date_trunc('week', NEW.completed_at AT TIME ZONE 'America/Argentina/Buenos_Aires')
                    AT TIME ZONE 'America/Argentina/Buenos_Aires';
  v_week_end := v_week_start + INTERVAL '7 days' - INTERVAL '1 second';

  SELECT COALESCE(SUM(points_earned), 0) INTO v_after_weekly
  FROM user_activities
  WHERE group_id = NEW.group_id AND username = NEW.username
    AND completed_at BETWEEN v_week_start AND v_week_end;
  v_before_weekly := v_after_weekly - NEW.points_earned;

  -- A quién pasaste (ranking general).
  INSERT INTO notifications (user_username, group_id, notification_type, title, message)
  SELECT gm.username, NEW.group_id, 'rank_overtake_general',
    'Te pasaron en el ranking',
    NEW.username || ' te pasó en el ranking general de "' || COALESCE(v_group_name, 'tu grupo') || '"'
  FROM group_members gm
  WHERE gm.group_id = NEW.group_id AND gm.username <> NEW.username
    AND EXISTS (
      SELECT 1 FROM (
        SELECT COALESCE(SUM(points_earned), 0) AS total
        FROM user_activities WHERE group_id = NEW.group_id AND username = gm.username
      ) t WHERE t.total > v_before_general AND t.total < v_after_general
    );

  -- A quién pasaste (ranking semanal).
  INSERT INTO notifications (user_username, group_id, notification_type, title, message)
  SELECT gm.username, NEW.group_id, 'rank_overtake_weekly',
    'Te pasaron en el ranking semanal',
    NEW.username || ' te pasó en el ranking semanal de "' || COALESCE(v_group_name, 'tu grupo') || '"'
  FROM group_members gm
  WHERE gm.group_id = NEW.group_id AND gm.username <> NEW.username
    AND EXISTS (
      SELECT 1 FROM (
        SELECT COALESCE(SUM(points_earned), 0) AS total
        FROM user_activities
        WHERE group_id = NEW.group_id AND username = gm.username
          AND completed_at BETWEEN v_week_start AND v_week_end
      ) t WHERE t.total > v_before_weekly AND t.total < v_after_weekly
    );

  -- Pasaste a liderar el general.
  SELECT COALESCE(MAX(total), 0) INTO v_max_other_general FROM (
    SELECT SUM(points_earned) AS total FROM user_activities
    WHERE group_id = NEW.group_id AND username <> NEW.username
    GROUP BY username
  ) t;

  IF v_max_other_general > 0 AND v_before_general < v_max_other_general AND v_after_general >= v_max_other_general THEN
    INSERT INTO notifications (user_username, group_id, notification_type, title, message)
    VALUES (
      NEW.username, NEW.group_id, 'rank_lead_general', '¡Estás liderando!',
      'Pasaste al primer puesto del ranking general de "' || COALESCE(v_group_name, 'tu grupo') || '"'
    );
  END IF;

  -- Pasaste a liderar la semana.
  SELECT COALESCE(MAX(total), 0) INTO v_max_other_weekly FROM (
    SELECT SUM(points_earned) AS total FROM user_activities
    WHERE group_id = NEW.group_id AND username <> NEW.username
      AND completed_at BETWEEN v_week_start AND v_week_end
    GROUP BY username
  ) t;

  IF v_max_other_weekly > 0 AND v_before_weekly < v_max_other_weekly AND v_after_weekly >= v_max_other_weekly THEN
    INSERT INTO notifications (user_username, group_id, notification_type, title, message)
    VALUES (
      NEW.username, NEW.group_id, 'rank_lead_weekly', '¡Estás liderando la semana!',
      'Pasaste al primer puesto del ranking semanal de "' || COALESCE(v_group_name, 'tu grupo') || '"'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_rank_changes ON user_activities;
CREATE TRIGGER trg_notify_rank_changes
  AFTER INSERT ON user_activities
  FOR EACH ROW
  EXECUTE FUNCTION notify_rank_changes();

-- ---------------------------------------------------------------------------
-- 3. Reporte quincenal disponible.
--
-- Mismo criterio que getUserReportStatus en lib/actions.ts: falta reporte si
-- nunca subió uno o pasaron >= 15 días desde el último. Para no re-notificar
-- cada corrida del cron, solo inserta si no hay ya una notificación
-- 'report_available' creada después del último reporte (o desde que se unió
-- al grupo, si nunca reportó).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_pending_reports()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notifications (user_username, group_id, notification_type, title, message)
  SELECT gm.username, gm.group_id, 'report_available',
    'Reporte disponible',
    'Ya podés subir tu reporte quincenal en "' || g.name || '"'
  FROM group_members gm
  JOIN groups g ON g.id = gm.group_id
  WHERE (
    NOT EXISTS (
      SELECT 1 FROM bi_weekly_reports br
      WHERE br.username = gm.username AND br.group_id = gm.group_id
    )
    OR (
      SELECT MAX(br.report_date) FROM bi_weekly_reports br
      WHERE br.username = gm.username AND br.group_id = gm.group_id
    ) <= (CURRENT_DATE - INTERVAL '15 days')
  )
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.user_username = gm.username
      AND n.group_id = gm.group_id
      AND n.notification_type = 'report_available'
      AND n.created_at > COALESCE(
        (SELECT MAX(br2.report_date)::timestamptz
           FROM bi_weekly_reports br2
           WHERE br2.username = gm.username AND br2.group_id = gm.group_id),
        gm.joined_at
      )
  );
END;
$$;

-- Programa el chequeo diario a las 12:00 UTC (~09:00 Argentina) si pg_cron
-- está habilitado. Si no lo está, correr notify_pending_reports() a mano o
-- desde algún otro scheduler hasta habilitar la extensión.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    DELETE FROM cron.job WHERE jobname = 'notify-pending-reports-daily';
    PERFORM cron.schedule('notify-pending-reports-daily', '0 12 * * *', 'SELECT notify_pending_reports();');
  END IF;
END $$;
