-- Take away privileges nobody in this project ever granted.
--
-- Every table here is created by a migration, and every migration grants only
-- to `authenticated`. But a Supabase project ships with default privileges
-- that hand `anon` full DML on anything created in `public` afterwards, so the
-- hosted database ended up with SELECT/INSERT/UPDATE/DELETE for unauthenticated
-- callers on all fifteen tables.
--
-- RLS was still doing its job -- no policy grants anon anything, so rows stayed
-- invisible and writes were refused. The problem is that RLS was doing it
-- *alone*: one mistaken policy, and there was no second line. The repository's
-- own verification script has always asserted the stricter posture, which is
-- how this surfaced (it passed locally, where the tables predate the default,
-- and failed in CI against a freshly created database).
--
-- Nothing the application does runs as `anon`: sign-up and sign-in go through
-- GoTrue's own schema, and every RPC and query happens after a session exists.

begin;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- Future tables must not inherit it either, or the next migration silently
-- re-opens what this one closed.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

commit;
