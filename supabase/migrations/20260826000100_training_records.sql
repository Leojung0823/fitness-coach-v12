-- Coach Note: the training-record screen — every exercise a client has done,
-- newest first, with the one number the coach actually asks for mid-session:
-- what did they lift last time, and is it more than the time before.
--
-- Supersedes get_client_exercise_performance, which returned only the latest
-- occurrence and therefore could not answer the second half of that question.
-- It also keyed on a single workout_exercises row, so an exercise the coach
-- added twice in one session showed only the second block's sets. Occurrences
-- here are grouped per session, which is what "上次" means to a coach.

begin;

-- The screen offers six buttons; the reference data has a two-level tree
-- (lats under back, quadriceps under legs, and so on) and no "arms" node at
-- all. Resolving that here keeps the mapping in one place instead of spread
-- across the client.
create or replace function public.muscle_filter_key(target_group_id uuid)
returns text
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with recursive chain as (
    select id, parent_id, code from public.muscle_groups where id = target_group_id
    union all
    select parent.id, parent.parent_id, parent.code
    from public.muscle_groups parent
    join chain child on child.parent_id = parent.id
  )
  select case
    when exists (select 1 from chain where code = 'chest') then 'chest'
    when exists (select 1 from chain where code = 'back') then 'back'
    when exists (select 1 from chain where code in ('legs', 'glutes')) then 'legs'
    when exists (select 1 from chain where code = 'shoulders') then 'shoulders'
    when exists (select 1 from chain where code in ('biceps', 'triceps')) then 'arms'
    when exists (select 1 from chain where code = 'core') then 'core'
    else 'other'
  end
$$;

comment on function public.muscle_filter_key(uuid) is
  'Maps a muscle group (at any depth) to one of the training screen filters: chest/back/legs/shoulders/arms/core/other.';

-- One row per exercise-in-a-session. "Top weight" is the heaviest completed
-- set, falling back to the heaviest logged set when the coach ticked nothing
-- off -- a drafted session still has to answer "what did they lift". Set count
-- follows the same rule, so the two numbers always describe the same sets.
create or replace function public.get_client_training_records(target_client_id uuid)
returns table (
  exercise_id uuid,
  exercise_name_zh_tw varchar,
  exercise_name_en varchar,
  muscle_filter_key text,
  last_session_id uuid,
  last_session_date date,
  top_weight numeric,
  weight_unit varchar,
  set_count integer,
  previous_session_date date,
  previous_top_weight numeric,
  weight_delta numeric
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with occurrences as (
    select
      we.exercise_id,
      ws.id as session_id,
      ws.session_date,
      ws.started_at,
      coalesce(
        max(sets.weight_value) filter (where sets.is_completed),
        max(sets.weight_value)
      ) as top_weight,
      case
        when count(*) filter (where sets.is_completed) > 0
          then count(*) filter (where sets.is_completed)
        else count(*)
      end as set_count,
      min(sets.weight_unit) as weight_unit
    from public.workout_sessions ws
    join public.workout_exercises we
      on we.workout_session_id = ws.id and we.deleted_at is null
    join public.workout_sets sets
      on sets.workout_exercise_id = we.id and sets.deleted_at is null
    where ws.client_id = target_client_id
      and ws.status <> 'cancelled'
      and ws.deleted_at is null
    group by we.exercise_id, ws.id, ws.session_date, ws.started_at
  ),
  ranked as (
    select occurrences.*,
      row_number() over (
        partition by exercise_id
        order by session_date desc, started_at desc
      ) as rn
    from occurrences
  )
  select
    exercise.id,
    exercise.name_zh_tw,
    exercise.name_en,
    public.muscle_filter_key(exercise.primary_muscle_group_id),
    latest.session_id,
    latest.session_date,
    latest.top_weight,
    latest.weight_unit,
    latest.set_count::integer,
    previous.session_date,
    previous.top_weight,
    -- Null, not zero, when there is nothing to compare against: "first time"
    -- and "no change" are different answers and the screen shows them
    -- differently.
    case
      when previous.top_weight is null then null
      else latest.top_weight - previous.top_weight
    end
  from ranked as latest
  left join ranked as previous
    on previous.exercise_id = latest.exercise_id and previous.rn = 2
  join public.exercises as exercise on exercise.id = latest.exercise_id
  where latest.rn = 1
  order by latest.session_date desc, latest.started_at desc, exercise.name_zh_tw;
$$;

comment on function public.get_client_training_records(uuid) is
  'Per-exercise latest session for one client with the previous session for comparison. Top weight = heaviest completed set, or heaviest logged set when none are completed. security invoker: RLS is the only access control.';

create or replace function public.get_client_exercise_history(
  target_client_id uuid,
  target_exercise_id uuid,
  max_occurrences integer default 20
)
returns table (
  session_id uuid,
  session_date date,
  top_weight numeric,
  weight_unit varchar,
  set_count integer,
  sets jsonb
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select
    ws.id,
    ws.session_date,
    coalesce(
      max(sets.weight_value) filter (where sets.is_completed),
      max(sets.weight_value)
    ),
    min(sets.weight_unit),
    (case
      when count(*) filter (where sets.is_completed) > 0
        then count(*) filter (where sets.is_completed)
      else count(*)
    end)::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'set_number', sets.set_number,
          'weight_value', sets.weight_value,
          'reps', sets.reps,
          'is_completed', sets.is_completed
        ) order by sets.set_number
      ),
      '[]'::jsonb
    )
  from public.workout_sessions ws
  join public.workout_exercises we
    on we.workout_session_id = ws.id and we.deleted_at is null
  join public.workout_sets sets
    on sets.workout_exercise_id = we.id and sets.deleted_at is null
  where ws.client_id = target_client_id
    and we.exercise_id = target_exercise_id
    and ws.status <> 'cancelled'
    and ws.deleted_at is null
  group by ws.id, ws.session_date, ws.started_at
  order by ws.session_date desc, ws.started_at desc
  limit greatest(1, least(coalesce(max_occurrences, 20), 100));
$$;

comment on function public.get_client_exercise_history(uuid, uuid, integer) is
  'Every session in which one client did one exercise, newest first, with each set. security invoker.';

-- Logging from the training screen: one call, one round trip, all or nothing.
-- The coach is standing next to the client with a phone in one hand, so this
-- takes the three numbers on the sheet and does the rest -- find or open the
-- day's session, append the exercise, write the sets as completed.
create or replace function public.quick_log_exercise(
  target_client_id uuid,
  target_exercise_id uuid,
  p_weight numeric,
  p_set_count integer,
  p_reps integer default null,
  p_session_date date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_session_id uuid;
  v_workout_exercise_id uuid;
  v_sort_order integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  if p_set_count is null or p_set_count < 1 or p_set_count > 20
     or p_weight is null or p_weight < 0 or p_weight > 9999
     or (p_reps is not null and (p_reps < 1 or p_reps > 200))
     or p_session_date is null
     or p_session_date > current_date + 1
     or p_session_date < current_date - 365 then
    raise exception using errcode = '22023', message = 'invalid_quick_log_input';
  end if;

  -- RLS decides whether this client is visible at all; a client from another
  -- organisation simply is not found.
  select organization_id into v_org_id
  from public.clients
  where id = target_client_id and deleted_at is null;
  if v_org_id is null then
    raise exception using errcode = 'P0002', message = 'client_not_found';
  end if;

  if not exists (
    select 1 from public.exercises
    where id = target_exercise_id
      and deleted_at is null
      and is_active
      and (is_system or organization_id = v_org_id)
  ) then
    raise exception using errcode = 'P0002', message = 'exercise_not_available';
  end if;

  -- Reuse the day's session rather than opening a second one: a coach logging
  -- three exercises during one hour is recording one session, and splitting it
  -- would double the client's session count.
  select id into v_session_id
  from public.workout_sessions
  where client_id = target_client_id
    and session_date = p_session_date
    and status <> 'cancelled'
    and deleted_at is null
  order by (status = 'draft') desc, started_at desc
  limit 1;

  if v_session_id is null then
    insert into public.workout_sessions (organization_id, client_id, coach_user_id, session_date, status)
    values (v_org_id, target_client_id, v_user_id, p_session_date, 'draft')
    returning id into v_session_id;
  end if;

  select coalesce(max(sort_order), 0) + 1 into v_sort_order
  from public.workout_exercises
  where workout_session_id = v_session_id and deleted_at is null;

  insert into public.workout_exercises (workout_session_id, exercise_id, sort_order)
  values (v_session_id, target_exercise_id, v_sort_order)
  returning id into v_workout_exercise_id;

  insert into public.workout_sets (workout_exercise_id, set_number, weight_value, reps, is_completed, completed_at)
  select v_workout_exercise_id, set_number, p_weight, p_reps, true, now()
  from generate_series(1, p_set_count) as set_number;

  return v_session_id;
end;
$$;

comment on function public.quick_log_exercise(uuid, uuid, numeric, integer, integer, date) is
  'Logs N identical completed sets of one exercise for one client, reusing that day''s session or opening one. security invoker: every write goes through the caller''s RLS.';

-- Superseded: nothing calls it now that the screen needs the previous session
-- too, and leaving a second, subtly different answer to "what did they lift
-- last time" in the schema is how the two drift apart.
drop function if exists public.get_client_exercise_performance(uuid);

grant execute on function public.muscle_filter_key(uuid) to authenticated;
grant execute on function public.get_client_training_records(uuid) to authenticated;
grant execute on function public.get_client_exercise_history(uuid, uuid, integer) to authenticated;
grant execute on function public.quick_log_exercise(uuid, uuid, numeric, integer, integer, date) to authenticated;

commit;
