-- Check if there are any orphaned records
SELECT 'Checking for orphaned groups...' as status;

-- Show groups without valid creators
SELECT g.*, p.username 
FROM groups g 
LEFT JOIN profiles p ON g.created_by = p.username 
WHERE p.username IS NULL;

-- Show group_members without valid profiles
SELECT gm.*, p.username 
FROM group_members gm 
LEFT JOIN profiles p ON gm.username = p.username 
WHERE p.username IS NULL;

-- Clean up any orphaned records (be careful with this in production)
-- DELETE FROM groups WHERE created_by NOT IN (SELECT username FROM profiles);
-- DELETE FROM group_members WHERE username NOT IN (SELECT username FROM profiles);

-- Verify foreign key constraints are properly set
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('groups', 'group_members', 'group_activities', 'user_activities', 'bi_weekly_reports');
