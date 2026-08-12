-- Coach Note: "動作表現" (exercise performance) view on the client detail
-- page — for each exercise a client has ever done, the most recent
-- occurrence's sets, so a coach can see "what did they lift last time"
-- without hunting through the session-by-session history. Needs a
-- window-function join PostgREST can't express, hence a SQL function.
-- security invoker: no elevated access — RLS on workout_sessions/
-- workout_exercises/workout_sets applies exactly as it would to an ad-hoc
-- client query, so a client_id from another org just returns zero rows.

begin;

create or replace function public.get_client_exercise_performance(target_client_id uuid)
returns table (
  exercise_id uuid,
  exercise_name_zh_tw varchar,
  exercise_name_en varchar,
  last_session_id uuid,
  last_session_date date,
  last_started_at timestamptz,
  last_session_status varchar,
  sets jsonb
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with client_sessions as (
    select ws.id, ws.session_date, ws.started_at, ws.status
    from public.workout_sessions ws
    where ws.client_id = target_client_id
      and ws.status <> 'cancelled'
      and ws.deleted_at is null
  ),
  ranked_occurrences as (
    select
      we.exercise_id,
      we.id as workout_exercise_id,
      cs.id as session_id,
      cs.session_date,
      cs.started_at,
      cs.status,
      row_number() over (
        partition by we.exercise_id
        order by cs.session_date desc, cs.started_at desc
      ) as rn
    from public.workout_exercises we
    join client_sessions cs on cs.id = we.workout_session_id
    where we.deleted_at is null
  )
  select
    e.id as exercise_id,
    e.name_zh_tw as exercise_name_zh_tw,
    e.name_en as exercise_name_en,
    ro.session_id as last_session_id,
    ro.session_date as last_session_date,
    ro.started_at as last_started_at,
    ro.status as last_session_status,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
          'set_number', s.set_number,
          'weight_value', s.weight_value,
          'weight_unit', s.weight_unit,
          'reps', s.reps,
          'is_completed', s.is_completed
        ) order by s.set_number)
       from public.workout_sets s
       where s.workout_exercise_id = ro.workout_exercise_id
         and s.deleted_at is null),
      '[]'::jsonb
    ) as sets
  from ranked_occurrences ro
  join public.exercises e on e.id = ro.exercise_id
  where ro.rn = 1
  order by ro.session_date desc, ro.started_at desc, e.name_zh_tw;
$$;

comment on function public.get_client_exercise_performance(uuid) is
  'Per-exercise latest-occurrence sets for one client, most recent first. security invoker: RLS on workout_sessions/workout_exercises/workout_sets is the only access control, no elevation.';

grant execute on function public.get_client_exercise_performance(uuid) to authenticated;

commit;
