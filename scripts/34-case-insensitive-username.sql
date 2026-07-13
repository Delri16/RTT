-- Enforces case-insensitive username uniqueness at the DB level (e.g. "Juan"
-- and "juan" can't both exist as separate profiles). The app already resolves
-- usernames case-insensitively (see lib/actions.ts), this is the safety net.
create unique index if not exists profiles_username_lower_unique_idx on profiles (lower(username));
