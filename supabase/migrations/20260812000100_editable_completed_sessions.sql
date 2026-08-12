-- Coach Note: completed workout sessions become editable, so
-- workout_sessions.total_exercises/total_sets can no longer be trusted as
-- "set once at completion" — they must stay correct any time an exercise
-- or set is added/removed, on a draft OR a completed session. A trigger is
-- the single place that guarantees this regardless of which UI path
-- mutated the data (workout page, add-exercise page, future paths).

begin;

create or replace function private.recompute_workout_session_totals(p_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  update public.workout_sessions ws
  set total_exercises = (
        select count(*)
        from public.workout_exercises we
        where we.workout_session_id = ws.id
          and we.deleted_at is null
      ),
      total_sets = (
        select count(*)
        from public.workout_sets s
        join public.workout_exercises we on we.id = s.workout_exercise_id
        where we.workout_session_id = ws.id
          and we.deleted_at is null
          and s.deleted_at is null
      )
  where ws.id = p_session_id;
end;
$$;

comment on function private.recompute_workout_session_totals(uuid) is
  'Recomputes workout_sessions.total_exercises/total_sets from live rows. Runs as invoker so it stays subject to the same workout_sessions RLS update policy as any other session write.';

create or replace function public.trg_sync_totals_from_workout_exercises()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if TG_OP = 'DELETE' then
    perform private.recompute_workout_session_totals(OLD.workout_session_id);
    return OLD;
  else
    perform private.recompute_workout_session_totals(NEW.workout_session_id);
    return NEW;
  end if;
end;
$$;

drop trigger if exists workout_exercises_sync_totals on public.workout_exercises;
create trigger workout_exercises_sync_totals
  after insert or update or delete on public.workout_exercises
  for each row execute function public.trg_sync_totals_from_workout_exercises();

create or replace function public.trg_sync_totals_from_workout_sets()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_session_id uuid;
begin
  select workout_session_id into v_session_id
  from public.workout_exercises
  where id = coalesce(NEW.workout_exercise_id, OLD.workout_exercise_id);

  if v_session_id is not null then
    perform private.recompute_workout_session_totals(v_session_id);
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

drop trigger if exists workout_sets_sync_totals on public.workout_sets;
create trigger workout_sets_sync_totals
  after insert or update or delete on public.workout_sets
  for each row execute function public.trg_sync_totals_from_workout_sets();

commit;
