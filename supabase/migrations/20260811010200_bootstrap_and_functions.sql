-- Coach Note V1: signup bootstrap RPC + workout completion RPC.

begin;

-- ---------------------------------------------------------------------------
-- bootstrap_coach_workspace: atomic, idempotent signup bootstrap (PRD §6.1).
-- Called once from the app right after Supabase Auth signup succeeds.
-- Safe to call again (e.g. after a network retry) — an existing active
-- membership just gets returned unchanged.
-- ---------------------------------------------------------------------------
-- Note: the RETURNS TABLE column names below are deliberately NOT named
-- organization_id/role — those names collide with real table columns as
-- implicit plpgsql variables inside the function body (e.g. inside an
-- `on conflict (organization_id, user_id)` clause), which raises an
-- "ambiguous column reference" error at call time.
create or replace function public.bootstrap_coach_workspace()
returns table (org_id uuid, org_name text, member_role text)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_display_name text;
  v_org_id uuid;
  v_role varchar;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'not authenticated';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user_id;
  v_display_name := coalesce(nullif(btrim(split_part(coalesce(v_email, ''), '@', 1)), ''), '教練');

  insert into public.profiles (id, display_name)
  values (v_user_id, v_display_name)
  on conflict (id) do nothing;

  -- Idempotent: if this user already has an active organization, return it.
  select m.organization_id, m.role
    into v_org_id, v_role
  from public.organization_members m
  where m.user_id = v_user_id
    and m.status = 'active'
  order by m.created_at asc
  limit 1;

  if v_org_id is not null then
    return query
      select o.id, o.name::text, v_role::text
      from public.organizations o
      where o.id = v_org_id;
    return;
  end if;

  insert into public.organizations (name, type, owner_user_id, status)
  values (v_display_name || ' 的教練工作室', 'individual', v_user_id, 'active')
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role, status, joined_at)
  values (v_org_id, v_user_id, 'owner', 'active', now())
  on conflict (organization_id, user_id) do nothing;

  return query
    select o.id, o.name::text, 'owner'::text
    from public.organizations o
    where o.id = v_org_id;
end;
$$;

comment on function public.bootstrap_coach_workspace() is
  'Atomic signup bootstrap: profile + organization + owner membership in one transaction. Idempotent (safe to call again).';

grant execute on function public.bootstrap_coach_workspace() to authenticated;

-- ---------------------------------------------------------------------------
-- complete_workout_session: recompute totals and mark a draft session
-- completed. Runs as the caller (RLS still enforced via
-- workout_sessions_update_org_member) — no elevated privilege needed.
-- Idempotent: completing an already-completed session is a no-op that
-- returns the existing row, so repeated clicks never double-write.
-- ---------------------------------------------------------------------------
create or replace function public.complete_workout_session(target_session_id uuid)
returns public.workout_sessions
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_session public.workout_sessions;
  v_total_exercises integer;
  v_total_sets integer;
begin
  select * into v_session
  from public.workout_sessions
  where id = target_session_id;

  if v_session.id is null then
    raise exception using errcode = 'P0002', message = 'workout session not found';
  end if;

  if v_session.status = 'completed' then
    return v_session;
  end if;

  select count(*) into v_total_exercises
  from public.workout_exercises we
  where we.workout_session_id = target_session_id
    and we.deleted_at is null;

  select count(*) into v_total_sets
  from public.workout_sets ws
  join public.workout_exercises we on we.id = ws.workout_exercise_id
  where we.workout_session_id = target_session_id
    and we.deleted_at is null
    and ws.deleted_at is null;

  update public.workout_sessions
  set status = 'completed',
      completed_at = now(),
      total_exercises = v_total_exercises,
      total_sets = v_total_sets
  where id = target_session_id
  returning * into v_session;

  return v_session;
end;
$$;

comment on function public.complete_workout_session(uuid) is
  'Marks a draft workout session completed, stamps completed_at, recomputes total_exercises/total_sets. Idempotent.';

grant execute on function public.complete_workout_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- record_exercise_usage: upsert the (organization, coach, exercise) usage
-- counter used to power "最近使用". Runs as caller; RLS on
-- exercise_usage_stats still applies (user_id must equal auth.uid()).
-- ---------------------------------------------------------------------------
create or replace function public.record_exercise_usage(target_organization_id uuid, target_exercise_id uuid)
returns public.exercise_usage_stats
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $$
declare
  v_row public.exercise_usage_stats;
begin
  insert into public.exercise_usage_stats (organization_id, user_id, exercise_id, usage_count, last_used_at)
  values (target_organization_id, auth.uid(), target_exercise_id, 1, now())
  on conflict (organization_id, user_id, exercise_id)
  do update set usage_count = public.exercise_usage_stats.usage_count + 1,
                last_used_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.record_exercise_usage(uuid, uuid) is
  'Upserts the usage counter for one (organization, coach, exercise). Called whenever an exercise is added to a session.';

grant execute on function public.record_exercise_usage(uuid, uuid) to authenticated;

commit;
