-- Enhance bi_weekly_reports table
ALTER TABLE bi_weekly_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create a view to get the latest report for each user in each group
CREATE OR REPLACE VIEW latest_user_reports AS
SELECT DISTINCT ON (username, group_id) 
    *
FROM bi_weekly_reports
ORDER BY username, group_id, report_date DESC;

-- Create function to check if user needs to report (15 days since last report)
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
    
    RETURN days_since_report >= 15;
END;
$$ LANGUAGE plpgsql;

-- Create function to get days until next report
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
    
    IF days_since_report >= 15 THEN
        RETURN 0; -- Can report now
    ELSE
        RETURN 15 - days_since_report; -- Days remaining
    END IF;
END;
$$ LANGUAGE plpgsql;
