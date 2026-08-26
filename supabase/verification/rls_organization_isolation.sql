-- RLS verification: cross-organization isolation.
-- Required by ARCHITECTURE.md §7 for every organization-scoped table.
--
-- Wrapped in a transaction that ALWAYS rolls back at the end, so this can be
-- re-run against a local database without leaving fixture data behind.
--
-- Run with:
--   docker exec -i supabase_db_fitness-coach-v12 psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/verification/rls_organization_isolation.sql
--
-- The script is piped in on stdin: `-f` would be resolved inside the
-- container, where the repository is not mounted.
--
-- Any RLS regression raises a `RLS FAILURE: ...` exception and aborts the
-- script with a non-zero exit code. No output besides NOTICEs means every
-- assertion passed.

begin;

-- ---------------------------------------------------------------------------
-- Fixtures: two organizations ("A" and "B"), one coach each, one client
-- each, and a draft workout session with one exercise and one set each.
-- Created as the `postgres` superuser, which bypasses RLS by design.
-- ---------------------------------------------------------------------------
do $$
declare
  v_user_a uuid := '11111111-1111-1111-1111-111111111111';
  v_user_b uuid := '22222222-2222-2222-2222-222222222222';
  v_org_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_org_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_client_a uuid := 'caaaaaaa-caaa-caaa-caaa-caaaaaaaaaaa';
  v_client_b uuid := 'cbbbbbbb-cbbb-cbbb-cbbb-cbbbbbbbbbbb';
  v_exercise_id uuid;
  v_session_a uuid := '5a555555-5a55-5a55-5a55-5a5555555555';
  v_session_b uuid := '5b555555-5b55-5b55-5b55-5b5555555555';
  v_workout_exercise_a uuid;
  v_workout_exercise_b uuid;
  v_custom_exercise_a uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  values
    (v_user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'verify-coach-a@example.test', 'x', now(), now()),
    (v_user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'verify-coach-b@example.test', 'x', now(), now());

  insert into public.profiles (id, display_name) values
    (v_user_a, 'Verify Coach A'),
    (v_user_b, 'Verify Coach B');

  insert into public.organizations (id, name, type, owner_user_id, status) values
    (v_org_a, 'Verify Org A', 'individual', v_user_a, 'active'),
    (v_org_b, 'Verify Org B', 'individual', v_user_b, 'active');

  insert into public.organization_members (organization_id, user_id, role, status) values
    (v_org_a, v_user_a, 'owner', 'active'),
    (v_org_b, v_user_b, 'owner', 'active');

  insert into public.clients (id, organization_id, full_name, status, created_by) values
    (v_client_a, v_org_a, 'Verify Client A', 'active', v_user_a),
    (v_client_b, v_org_b, 'Verify Client B', 'active', v_user_b);

  select id into v_exercise_id from public.exercises where is_system limit 1;

  insert into public.exercises (id, organization_id, name_zh_tw, is_system, is_active, created_by)
  values (extensions.gen_random_uuid(), v_org_a, 'Verify Org A Custom Exercise', false, true, v_user_a)
  returning id into v_custom_exercise_a;

  insert into public.workout_sessions (id, organization_id, client_id, coach_user_id, status) values
    (v_session_a, v_org_a, v_client_a, v_user_a, 'draft'),
    (v_session_b, v_org_b, v_client_b, v_user_b, 'draft');

  insert into public.workout_exercises (id, workout_session_id, exercise_id, sort_order)
  values (extensions.gen_random_uuid(), v_session_a, v_exercise_id, 1)
  returning id into v_workout_exercise_a;

  insert into public.workout_exercises (id, workout_session_id, exercise_id, sort_order)
  values (extensions.gen_random_uuid(), v_session_b, v_exercise_id, 1)
  returning id into v_workout_exercise_b;

  insert into public.workout_sets (workout_exercise_id, set_number, weight_value, reps, is_completed)
  values (v_workout_exercise_a, 1, 20.0, 10, false);

  insert into public.workout_sets (workout_exercise_id, set_number, weight_value, reps, is_completed)
  values (v_workout_exercise_b, 1, 20.0, 10, false);
end $$;

-- How many system exercises actually exist, read as the superuser with RLS
-- bypassed. The check below compares against this rather than a literal: the
-- property under test is "RLS hides none of them from an org member", which is
-- true whatever the seed happens to contain. A hard-coded number instead turns
-- every expansion of the exercise library into a failing security check --
-- which is exactly what happened when the seed grew from 60 to 460.
select set_config(
  'verify.system_exercise_count',
  (select count(*)::text from public.exercises where is_system),
  true
);

-- ---------------------------------------------------------------------------
-- Act as Coach B (authenticated, org B) and confirm org A data is invisible
-- and unwritable.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
  v_expected_system int;
begin
  -- Cross-org SELECT denial: clients
  select count(*) into v_count from public.clients where id = 'caaaaaaa-caaa-caaa-caaa-caaaaaaaaaaa';
  if v_count <> 0 then
    raise exception 'RLS FAILURE: org B coach could read org A client (count=%)', v_count;
  end if;

  -- Cross-org SELECT denial: workout_sessions
  select count(*) into v_count from public.workout_sessions where id = '5a555555-5a55-5a55-5a55-5a5555555555';
  if v_count <> 0 then
    raise exception 'RLS FAILURE: org B coach could read org A workout_sessions (count=%)', v_count;
  end if;

  -- Cross-org SELECT denial: workout_exercises (via denormalized organization_id)
  select count(*) into v_count from public.workout_exercises where workout_session_id = '5a555555-5a55-5a55-5a55-5a5555555555';
  if v_count <> 0 then
    raise exception 'RLS FAILURE: org B coach could read org A workout_exercises (count=%)', v_count;
  end if;

  -- Cross-org SELECT denial: workout_sets
  select count(*) into v_count
  from public.workout_sets ws
  join public.workout_exercises we on we.id = ws.workout_exercise_id
  where we.workout_session_id = '5a555555-5a55-5a55-5a55-5a5555555555';
  if v_count <> 0 then
    raise exception 'RLS FAILURE: org B coach could read org A workout_sets (count=%)', v_count;
  end if;

  -- Cross-org SELECT denial: another org's custom exercise is invisible
  select count(*) into v_count from public.exercises where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 0 then
    raise exception 'RLS FAILURE: org B coach could read org A custom exercises (count=%)', v_count;
  end if;

  -- System exercises must still be visible to every authenticated org member
  v_expected_system := current_setting('verify.system_exercise_count')::int;
  -- Guards against the check passing vacuously: with no seed at all, "sees
  -- every system exercise" would be trivially true and prove nothing.
  if v_expected_system < 1 then
    raise exception 'RLS FAILURE: no system exercises are seeded, so their visibility cannot be verified';
  end if;

  select count(*) into v_count from public.exercises where is_system;
  if v_count <> v_expected_system then
    raise exception 'RLS FAILURE: org B coach saw % of the % system exercises', v_count, v_expected_system;
  end if;
end $$;

-- Cross-org INSERT denial: org B coach tries to create a client inside org A.
do $$
declare
  v_inserted boolean := false;
begin
  begin
    insert into public.clients (organization_id, full_name, created_by)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Malicious Cross-Org Client', '22222222-2222-2222-2222-222222222222');
    v_inserted := true;
  exception
    when insufficient_privilege then
      v_inserted := false;
  end;
  if v_inserted then
    raise exception 'RLS FAILURE: org B coach could insert a client into org A';
  end if;
end $$;

-- Cross-org UPDATE denial: org B coach tries to edit org A's client.
do $$
declare
  v_count int;
begin
  update public.clients set note = 'hacked by org B' where id = 'caaaaaaa-caaa-caaa-caaa-caaaaaaaaaaa';
  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'RLS FAILURE: org B coach could update org A client (rows=%)', v_count;
  end if;
end $$;

-- Cross-org UPDATE denial: org B coach tries to complete org A's workout session.
do $$
declare
  v_count int;
begin
  update public.workout_sessions set status = 'completed' where id = '5a555555-5a55-5a55-5a55-5a5555555555';
  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'RLS FAILURE: org B coach could update org A workout_sessions (rows=%)', v_count;
  end if;
end $$;

-- Cross-org INSERT denial: org B coach tries to add a set onto org A's workout_exercise.
do $$
declare
  v_inserted boolean := false;
  v_org_a_workout_exercise uuid;
begin
  select id into v_org_a_workout_exercise
  from public.workout_exercises
  where workout_session_id = '5a555555-5a55-5a55-5a55-5a5555555555';
  -- Row is invisible under RLS, so the FK/subselect below finds nothing;
  -- fall back to a fixed id to still exercise the insert-time RLS check.
  begin
    insert into public.workout_sets (workout_exercise_id, set_number, weight_value, reps, is_completed)
    values (coalesce(v_org_a_workout_exercise, '00000000-0000-0000-0000-000000000000'), 99, 999, 99, false);
    v_inserted := true;
  exception
    when insufficient_privilege then
      v_inserted := false;
    when foreign_key_violation then
      v_inserted := false;
  end;
  if v_inserted then
    raise exception 'RLS FAILURE: org B coach could insert a workout_set into org A workout_exercise';
  end if;
end $$;

-- Cross-org denial through the training-record functions. They are security
-- invoker, so RLS is the whole boundary -- which is exactly why it has to be
-- asserted rather than assumed: an accidental `security definer` here would
-- hand every organisation's training history to anyone who knows a client id.
do $$
declare
  v_count int;
  v_logged boolean := false;
begin
  select count(*) into v_count
  from public.get_client_training_records('caaaaaaa-caaa-caaa-caaa-caaaaaaaaaaa');
  if v_count <> 0 then
    raise exception 'RLS FAILURE: org B coach read org A training records (count=%)', v_count;
  end if;

  select count(*) into v_count
  from public.get_client_exercise_history(
    'caaaaaaa-caaa-caaa-caaa-caaaaaaaaaaa',
    (select id from public.exercises where is_system limit 1)
  );
  if v_count <> 0 then
    raise exception 'RLS FAILURE: org B coach read org A exercise history (count=%)', v_count;
  end if;

  -- The write path matters more than the reads: this one opens sessions.
  begin
    perform public.quick_log_exercise(
      'caaaaaaa-caaa-caaa-caaa-caaaaaaaaaaa',
      (select id from public.exercises where is_system limit 1),
      60, 3
    );
    v_logged := true;
  exception
    when insufficient_privilege then v_logged := false;
    when no_data_found then v_logged := false;
    when foreign_key_violation then v_logged := false;
  end;
  if v_logged then
    raise exception 'RLS FAILURE: org B coach logged training onto org A client';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Positive control: Coach A (own org) must still be able to read and write
-- their own organization's data. If this fails, the policies above are too
-- strict, not just "safe".
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_count int;
  v_rows int;
begin
  select count(*) into v_count from public.clients where id = 'caaaaaaa-caaa-caaa-caaa-caaaaaaaaaaa';
  if v_count <> 1 then
    raise exception 'RLS FAILURE (over-restrictive): org A coach could not read their own client (count=%)', v_count;
  end if;

  update public.clients set note = 'legit update by owning org' where id = 'caaaaaaa-caaa-caaa-caaa-caaaaaaaaaaa';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'RLS FAILURE (over-restrictive): org A coach could not update their own client (rows=%)', v_rows;
  end if;

  select count(*) into v_count
  from public.workout_sets ws
  join public.workout_exercises we on we.id = ws.workout_exercise_id
  where we.workout_session_id = '5a555555-5a55-5a55-5a55-5a5555555555';
  if v_count <> 1 then
    raise exception 'RLS FAILURE (over-restrictive): org A coach could not read their own workout_sets (count=%)', v_count;
  end if;

  -- The owning coach must still get their own training records back, and
  -- quick logging must actually work for them.
  select count(*) into v_count
  from public.get_client_training_records('caaaaaaa-caaa-caaa-caaa-caaaaaaaaaaa');
  if v_count < 1 then
    raise exception 'RLS FAILURE (over-restrictive): org A coach saw no training records for their own client';
  end if;

  perform public.quick_log_exercise(
    'caaaaaaa-caaa-caaa-caaa-caaaaaaaaaaa',
    (select id from public.exercises where is_system limit 1),
    42.5, 3
  );
  if not exists (
    select 1
    from public.get_client_training_records('caaaaaaa-caaa-caaa-caaa-caaaaaaaaaaa')
    where top_weight = 42.5 and set_count = 3
  ) then
    raise exception 'RLS FAILURE (over-restrictive): a quick log by the owning coach did not come back';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Unauthenticated (anon) access must be refused outright — no jwt claims,
-- anon role. PRD §7.1: "未登入時不可存取 App 主要頁面".
-- ---------------------------------------------------------------------------
reset request.jwt.claims;
set local role anon;

do $$
declare
  v_denied boolean := false;
begin
  begin
    perform 1 from public.clients limit 1;
  exception
    when insufficient_privilege then
      v_denied := true;
  end;
  if not v_denied then
    raise exception 'RLS FAILURE: anon role could query public.clients without authentication';
  end if;
end $$;

reset role;

do $$
begin
  raise notice 'RLS verification passed: cross-organization isolation holds for clients, workout_sessions, workout_exercises, workout_sets, exercises, and the training-record functions; anon access is refused; own-org access still works.';
end $$;

rollback;
