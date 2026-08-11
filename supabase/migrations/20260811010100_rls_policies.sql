-- Coach Note V1 permission helpers + RLS policies.
-- Per ARCHITECTURE.md §6/§7: every organization-scoped table routes through
-- private.user_has_org_access / private.user_can / private.user_data_scope.
-- Role is never inline-checked (`role = 'coach'`) inside a policy.

begin;

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Permission helpers (SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------

create or replace function private.user_has_org_access(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

comment on function private.user_has_org_access(uuid) is
  'True when the current auth user is an active member of the target organization. Single entry point for RLS org-membership checks.';

-- V1 permission logic is intentionally simple (see ARCHITECTURE.md §6):
-- any active org member can read/create/update most resources; hard-delete
-- style permissions are refused because V1 never hard-deletes organization
-- data. The signature stays stable so future role-based rules only change
-- this function body, not every policy that calls it.
create or replace function private.user_can(target_organization_id uuid, permission_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select case
    when permission_code in ('client.delete', 'workout.delete', 'organization.delete', 'exercise.delete') then false
    else private.user_has_org_access(target_organization_id)
  end;
$$;

comment on function private.user_can(uuid, text) is
  'Action-level permission check. V1: any active org member may do most *.read/*.create/*.update actions; hard-delete actions are always refused.';

create or replace function private.user_data_scope(target_organization_id uuid, resource_code text)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select case
    when private.user_has_org_access(target_organization_id) then 'all'
    else 'none'
  end;
$$;

comment on function private.user_data_scope(uuid, text) is
  'Data-scope check (all/assigned/created/own/none). V1: active org members see all data in scope; future roles can narrow this without rewriting policies.';

grant usage on schema private to authenticated;
grant execute on function private.user_has_org_access(uuid) to authenticated;
grant execute on function private.user_can(uuid, text) to authenticated;
grant execute on function private.user_data_scope(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_self_or_org_peer
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.organization_members mine
      join public.organization_members theirs
        on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid()
        and mine.status = 'active'
        and theirs.user_id = profiles.id
        and theirs.status = 'active'
    )
  );

create policy profiles_insert_self
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy profiles_update_self
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

create policy organizations_select_member
  on public.organizations for select
  to authenticated
  using (private.user_has_org_access(id));

-- No direct insert/update/delete policy: organizations are only created via
-- the SECURITY DEFINER bootstrap RPC (bypasses RLS by design).

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
alter table public.organization_members enable row level security;

create policy organization_members_select_peer
  on public.organization_members for select
  to authenticated
  using (private.user_has_org_access(organization_id));

-- No direct insert/update/delete policy in V1: membership rows are only
-- written by the SECURITY DEFINER bootstrap RPC. Future invite/role-management
-- features add explicit policies backed by private.user_can.

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
alter table public.clients enable row level security;

create policy clients_select_org_member
  on public.clients for select
  to authenticated
  using (private.user_has_org_access(organization_id));

create policy clients_insert_org_member
  on public.clients for insert
  to authenticated
  with check (private.user_can(organization_id, 'client.create'));

create policy clients_update_org_member
  on public.clients for update
  to authenticated
  using (private.user_can(organization_id, 'client.update'))
  with check (private.user_can(organization_id, 'client.update'));

-- No delete policy: clients are archived via status update, never hard-deleted.

-- ---------------------------------------------------------------------------
-- exercise_categories / muscle_groups / equipment_types (shared reference data)
-- ---------------------------------------------------------------------------
alter table public.exercise_categories enable row level security;
alter table public.muscle_groups enable row level security;
alter table public.equipment_types enable row level security;

create policy exercise_categories_select_active
  on public.exercise_categories for select
  to authenticated
  using (is_active);

create policy muscle_groups_select_active
  on public.muscle_groups for select
  to authenticated
  using (is_active);

create policy equipment_types_select_active
  on public.equipment_types for select
  to authenticated
  using (is_active);

-- No write policies: reference data is managed via migrations/seed only.

-- ---------------------------------------------------------------------------
-- exercises
-- ---------------------------------------------------------------------------
alter table public.exercises enable row level security;

create policy exercises_select_system_or_own_org
  on public.exercises for select
  to authenticated
  using (
    (is_system and is_active)
    or (organization_id is not null and private.user_has_org_access(organization_id))
  );

create policy exercises_insert_own_org_custom_only
  on public.exercises for insert
  to authenticated
  with check (
    is_system = false
    and organization_id is not null
    and private.user_can(organization_id, 'exercise.create')
  );

create policy exercises_update_own_org_custom_only
  on public.exercises for update
  to authenticated
  using (
    is_system = false
    and organization_id is not null
    and private.user_can(organization_id, 'exercise.update')
  )
  with check (
    is_system = false
    and organization_id is not null
    and private.user_can(organization_id, 'exercise.update')
  );

-- ---------------------------------------------------------------------------
-- exercise_secondary_muscles
-- ---------------------------------------------------------------------------
alter table public.exercise_secondary_muscles enable row level security;

create policy exercise_secondary_muscles_select_all
  on public.exercise_secondary_muscles for select
  to authenticated
  using (true);

create policy exercise_secondary_muscles_insert_via_own_custom_exercise
  on public.exercise_secondary_muscles for insert
  to authenticated
  with check (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and e.organization_id is not null
        and private.user_has_org_access(e.organization_id)
    )
  );

create policy exercise_secondary_muscles_delete_via_own_custom_exercise
  on public.exercise_secondary_muscles for delete
  to authenticated
  using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and e.organization_id is not null
        and private.user_has_org_access(e.organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- workout_sessions
-- ---------------------------------------------------------------------------
alter table public.workout_sessions enable row level security;

create policy workout_sessions_select_org_member
  on public.workout_sessions for select
  to authenticated
  using (private.user_has_org_access(organization_id));

create policy workout_sessions_insert_org_member
  on public.workout_sessions for insert
  to authenticated
  with check (private.user_can(organization_id, 'workout.create'));

create policy workout_sessions_update_org_member
  on public.workout_sessions for update
  to authenticated
  using (private.user_can(organization_id, 'workout.update'))
  with check (private.user_can(organization_id, 'workout.update'));

-- No delete policy: sessions are cancelled via status update, never hard-deleted.

-- ---------------------------------------------------------------------------
-- workout_exercises
-- ---------------------------------------------------------------------------
alter table public.workout_exercises enable row level security;

create policy workout_exercises_select_org_member
  on public.workout_exercises for select
  to authenticated
  using (private.user_has_org_access(organization_id));

create policy workout_exercises_insert_org_member
  on public.workout_exercises for insert
  to authenticated
  with check (private.user_can(organization_id, 'workout.update'));

create policy workout_exercises_update_org_member
  on public.workout_exercises for update
  to authenticated
  using (private.user_can(organization_id, 'workout.update'))
  with check (private.user_can(organization_id, 'workout.update'));

create policy workout_exercises_delete_org_member
  on public.workout_exercises for delete
  to authenticated
  using (private.user_can(organization_id, 'workout.update'));

-- ---------------------------------------------------------------------------
-- workout_sets
-- ---------------------------------------------------------------------------
alter table public.workout_sets enable row level security;

create policy workout_sets_select_org_member
  on public.workout_sets for select
  to authenticated
  using (private.user_has_org_access(organization_id));

create policy workout_sets_insert_org_member
  on public.workout_sets for insert
  to authenticated
  with check (private.user_can(organization_id, 'workout.update'));

create policy workout_sets_update_org_member
  on public.workout_sets for update
  to authenticated
  using (private.user_can(organization_id, 'workout.update'))
  with check (private.user_can(organization_id, 'workout.update'));

create policy workout_sets_delete_org_member
  on public.workout_sets for delete
  to authenticated
  using (private.user_can(organization_id, 'workout.update'));

-- ---------------------------------------------------------------------------
-- exercise_usage_stats
-- ---------------------------------------------------------------------------
alter table public.exercise_usage_stats enable row level security;

create policy exercise_usage_stats_select_org_member
  on public.exercise_usage_stats for select
  to authenticated
  using (private.user_has_org_access(organization_id));

create policy exercise_usage_stats_insert_own
  on public.exercise_usage_stats for insert
  to authenticated
  with check (user_id = auth.uid() and private.user_has_org_access(organization_id));

create policy exercise_usage_stats_update_own
  on public.exercise_usage_stats for update
  to authenticated
  using (user_id = auth.uid() and private.user_has_org_access(organization_id))
  with check (user_id = auth.uid() and private.user_has_org_access(organization_id));

-- ---------------------------------------------------------------------------
-- favorite_exercises (no V1 UI, but table + RLS ship together per §7)
-- ---------------------------------------------------------------------------
alter table public.favorite_exercises enable row level security;

create policy favorite_exercises_select_own
  on public.favorite_exercises for select
  to authenticated
  using (user_id = auth.uid() and private.user_has_org_access(organization_id));

create policy favorite_exercises_insert_own
  on public.favorite_exercises for insert
  to authenticated
  with check (user_id = auth.uid() and private.user_has_org_access(organization_id));

create policy favorite_exercises_delete_own
  on public.favorite_exercises for delete
  to authenticated
  using (user_id = auth.uid() and private.user_has_org_access(organization_id));

-- ---------------------------------------------------------------------------
-- Table-level GRANTs for the authenticated role.
--
-- Local Supabase (matching the current hosted default) does NOT
-- auto-expose newly created tables to the API roles anymore
-- (config.toml [api] auto_expose_new_tables is left unset/off). RLS
-- policies alone are not sufficient: without an explicit GRANT the
-- `authenticated` role gets "permission denied for table" before RLS is
-- even evaluated. anon intentionally receives no data-table grants — every
-- policy above is scoped `to authenticated` only, matching PRD §7.1
-- ("未登入時不可存取 App 主要頁面").
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, insert, update on public.profiles to authenticated;

grant select on public.organizations to authenticated;
grant select on public.organization_members to authenticated;

grant select, insert, update on public.clients to authenticated;

grant select on public.exercise_categories to authenticated;
grant select on public.muscle_groups to authenticated;
grant select on public.equipment_types to authenticated;

grant select, insert, update on public.exercises to authenticated;
grant select, insert, delete on public.exercise_secondary_muscles to authenticated;

grant select, insert, update on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;

grant select, insert, update on public.exercise_usage_stats to authenticated;
grant select, insert, delete on public.favorite_exercises to authenticated;

commit;
