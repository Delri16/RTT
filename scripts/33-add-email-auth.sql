-- Adds email-based login on top of the existing username system.
-- Auth itself (sending/verifying the 6-digit code) is handled by Supabase Auth's
-- built-in email OTP (auth.users), using the project's configured SMTP.
-- This script only links our `profiles` table to that auth identity.

alter table profiles add column if not exists email text;
alter table profiles add column if not exists auth_user_id uuid references auth.users(id);

-- One email per profile, one profile per auth user. Case-insensitive on email.
create unique index if not exists profiles_email_unique_idx on profiles (lower(email)) where email is not null;
create unique index if not exists profiles_auth_user_id_unique_idx on profiles (auth_user_id) where auth_user_id is not null;
