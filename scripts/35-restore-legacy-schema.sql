-- Restores the legacy (v1, username-based) schema as canonical.
--
-- Context: the DB was left mid-migration. The original tables were renamed to
-- *_legacy_v1 and empty "v2" tables were created under the original names
-- (groups / group_members / profiles / notifications). The app code still queries
-- the original names, so it was hitting the empty v2 tables — no groups, no members.
-- All real data (1091 activities, rodeos, reports) FKs to the legacy tables.
--
-- The two clusters share no foreign keys, so swapping names is safe: FKs follow
-- tables by identity, not by name. This moves the legacy data back under the
-- canonical names and parks the abandoned v2 tables as *_v2_unused.
--
-- Wrapped in a transaction: any error rolls the whole thing back with no damage.

begin;

-- 1) Park the empty v2 tables out of the way.
alter table groups         rename to groups_v2_unused;
alter table group_members  rename to group_members_v2_unused;
alter table notifications  rename to notifications_v2_unused;
alter table profiles       rename to profiles_v2_unused;

-- 2) Promote the legacy tables (with the real data) to the canonical names.
alter table groups_legacy_v1        rename to groups;
alter table group_members_legacy_v1 rename to group_members;
alter table notifications_legacy_v1 rename to notifications;
alter table profiles_legacy_v1      rename to profiles;

-- 3) Bring the email/OTP auth columns onto the now-canonical profiles table
--    (migrations 33/34 had added them to the v2 profiles table instead).
alter table profiles add column if not exists email text;
alter table profiles add column if not exists auth_user_id uuid;

-- Carry over any auth link that was recorded on the v2 profiles row (e.g. Santi),
-- then backfill auth_user_id from auth.users by matching email.
update profiles p
   set email = coalesce(p.email, v.email)
  from profiles_v2_unused v
 where lower(p.username) = lower(v.username) and v.email is not null;

update profiles p
   set auth_user_id = u.id
  from auth.users u
 where p.email is not null
   and lower(p.email) = lower(u.email)
   and p.auth_user_id is null;

-- 3b) Remove empty ghost profiles that only differ from a real one by casing
--     ("toro" vs "Toro", "Nico torotis" vs "Nico Torotis"). Verified beforehand:
--     these have zero activities, memberships, reports, or any FK references.
--     They would otherwise block the case-insensitive unique index below.
delete from profiles
 where username in ('toro', 'Nico torotis');

-- 4) Recreate the case-insensitive unique indexes (they were created on the v2
--    profiles table by migrations 33/34; drop those names and rebuild here).
drop index if exists profiles_email_unique_idx;
drop index if exists profiles_auth_user_id_unique_idx;
drop index if exists profiles_username_lower_unique_idx;

create unique index profiles_email_unique_idx on profiles (lower(email)) where email is not null;
create unique index profiles_auth_user_id_unique_idx on profiles (auth_user_id) where auth_user_id is not null;
create unique index profiles_username_lower_unique_idx on profiles (lower(username));

commit;
