-- ---------------------------------------------------------------------------
-- El reporte de peso pasa a ser cada 14 días (dos semanas exactas) en vez de
-- cada 15, así siempre cae el mismo día de la semana que el reporte anterior.
--
-- Redefine las funciones que tenían el 15 hardcodeado:
--   * notify_pending_reports()  (script 40, la que dispara pg_cron)
--   * user_needs_report() / days_until_next_report()  (script 04)
-- El equivalente en la app es REPORT_INTERVAL_DAYS en lib/date-utils.ts,
-- usado por getUserReportStatus en lib/actions.ts.
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
    ) <= (CURRENT_DATE - INTERVAL '14 days')
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

CREATE OR REPLACE FUNCTION user_needs_report(p_username TEXT, p_group_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    last_report_date DATE;
    days_since_report INTEGER;
BEGIN
    SELECT report_date INTO last_report_date
    FROM bi_weekly_reports
    WHERE username = p_username AND group_id = p_group_id
    ORDER BY report_date DESC
    LIMIT 1;

    IF last_report_date IS NULL THEN
        RETURN TRUE; -- No reports yet, needs first report
    END IF;

    days_since_report := CURRENT_DATE - last_report_date;

    RETURN days_since_report >= 14;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION days_until_next_report(p_username TEXT, p_group_id UUID)
RETURNS INTEGER AS $$
DECLARE
    last_report_date DATE;
    days_since_report INTEGER;
BEGIN
    SELECT report_date INTO last_report_date
    FROM bi_weekly_reports
    WHERE username = p_username AND group_id = p_group_id
    ORDER BY report_date DESC
    LIMIT 1;

    IF last_report_date IS NULL THEN
        RETURN 0; -- No reports yet, can report now
    END IF;

    days_since_report := CURRENT_DATE - last_report_date;

    IF days_since_report >= 14 THEN
        RETURN 0; -- Can report now
    ELSE
        RETURN 14 - days_since_report; -- Days remaining
    END IF;
END;
$$ LANGUAGE plpgsql;
