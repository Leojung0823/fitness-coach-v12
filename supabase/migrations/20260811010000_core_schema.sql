-- Coach Note V1 core schema
-- See ARCHITECTURE.md and docs/PRD.md §10 for the source-of-truth data model.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- profiles: one row per Auth user (system login identity)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name varchar not null default '',
  phone varchar,
  avatar_url text,
  locale varchar not null default 'zh-TW',
  timezone varchar not null default 'Asia/Taipei',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Public profile for a system login identity (Auth user). Never store client/student data here.';

-- ---------------------------------------------------------------------------
-- organizations: tenant root. Independent coach, studio, or gym.
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  name varchar not null check (btrim(name) <> ''),
  type varchar not null default 'individual'
    check (type in ('individual', 'studio', 'gym')),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  status varchar not null default 'active'
    check (status in ('active', 'suspended', 'closed')),
  timezone varchar not null default 'Asia/Taipei',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'Tenant root. Every organization-scoped business record must reference organizations.id.';

-- ---------------------------------------------------------------------------
-- organization_members: user <-> organization relationship + role
-- ---------------------------------------------------------------------------
create table public.organization_members (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role varchar not null default 'coach'
    check (role in ('owner', 'admin', 'coach', 'staff')),
  status varchar not null default 'active'
    check (status in ('active', 'invited', 'disabled')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organization_members is
  'Role/status is not the whole permission model on its own; see private.user_can / private.user_data_scope.';

create unique index organization_members_org_user_key
  on public.organization_members (organization_id, user_id);

create index organization_members_user_id_idx
  on public.organization_members (user_id);

-- ---------------------------------------------------------------------------
-- clients: organization-scoped student/client records. Never equal to profiles.
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  assigned_coach_id uuid references auth.users(id) on delete set null,
  full_name varchar not null check (btrim(full_name) <> ''),
  nickname varchar,
  gender varchar check (gender is null or gender in ('male', 'female', 'other')),
  birth_date date,
  phone varchar,
  email varchar,
  height_cm decimal(5, 1),
  current_weight_kg decimal(5, 1),
  note text,
  status varchar not null default 'active'
    check (status in ('active', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.clients is
  'Organization-scoped client/student profile. Soft-deleted via status=archived, never hard-deleted once workout history exists.';

create index clients_organization_id_idx on public.clients (organization_id);
create index clients_assigned_coach_id_idx on public.clients (assigned_coach_id);
create index clients_full_name_idx on public.clients (full_name);
create index clients_status_idx on public.clients (status);

-- ---------------------------------------------------------------------------
-- exercise_categories / muscle_groups / equipment_types: shared reference data
-- ---------------------------------------------------------------------------
create table public.exercise_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  code varchar not null unique,
  name_zh_tw varchar not null,
  name_en varchar,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.muscle_groups (
  id uuid primary key default extensions.gen_random_uuid(),
  code varchar not null unique,
  name_zh_tw varchar not null,
  name_en varchar,
  parent_id uuid references public.muscle_groups(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create index muscle_groups_parent_id_idx on public.muscle_groups (parent_id);

create table public.equipment_types (
  id uuid primary key default extensions.gen_random_uuid(),
  code varchar not null unique,
  name_zh_tw varchar not null,
  name_en varchar,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- exercises: system (organization_id null) or custom (organization_id set)
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  category_id uuid references public.exercise_categories(id) on delete set null,
  primary_muscle_group_id uuid references public.muscle_groups(id) on delete set null,
  equipment_type_id uuid references public.equipment_types(id) on delete set null,
  name_zh_tw varchar not null check (btrim(name_zh_tw) <> ''),
  name_en varchar,
  tracking_type varchar not null default 'weight_reps'
    check (tracking_type in ('weight_reps', 'bodyweight_reps', 'duration', 'distance')),
  default_unit varchar not null default 'kg'
    check (default_unit in ('kg', 'lb', 'sec', 'min', 'meter', 'kilometer', 'level')),
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (is_system = false or organization_id is null),
  check (is_system = true or organization_id is not null)
);

comment on table public.exercises is
  'System exercises: organization_id is null, is_system=true, visible to every organization. Custom exercises: organization_id set, is_system=false, visible only to that organization.';

create index exercises_organization_id_idx on public.exercises (organization_id);
create index exercises_category_id_idx on public.exercises (category_id);
create index exercises_primary_muscle_group_id_idx on public.exercises (primary_muscle_group_id);
create index exercises_name_zh_tw_idx on public.exercises (name_zh_tw);

-- ---------------------------------------------------------------------------
-- exercise_secondary_muscles: many-to-many
-- ---------------------------------------------------------------------------
create table public.exercise_secondary_muscles (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  muscle_group_id uuid not null references public.muscle_groups(id) on delete cascade,
  primary key (exercise_id, muscle_group_id)
);

-- ---------------------------------------------------------------------------
-- workout_sessions: one actual training session
-- ---------------------------------------------------------------------------
create table public.workout_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  coach_user_id uuid not null references auth.users(id) on delete restrict,
  session_date date not null default current_date,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status varchar not null default 'draft'
    check (status in ('draft', 'completed', 'cancelled')),
  title varchar,
  note text,
  total_exercises integer not null default 0,
  total_sets integer not null default 0,
  source_session_id uuid references public.workout_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (completed_at is null or status = 'completed')
);

comment on table public.workout_sessions is
  'Fact of a training session. Deliberately independent from any future appointment aggregate (ARCHITECTURE.md constitution 2).';

create index workout_sessions_organization_id_idx on public.workout_sessions (organization_id);
create index workout_sessions_client_id_idx on public.workout_sessions (client_id);
create index workout_sessions_coach_user_id_idx on public.workout_sessions (coach_user_id);
create index workout_sessions_session_date_idx on public.workout_sessions (session_date);
create index workout_sessions_status_idx on public.workout_sessions (status);

-- ---------------------------------------------------------------------------
-- workout_exercises: an exercise within a session
-- organization_id is a denormalized copy of workout_sessions.organization_id
-- (auto-populated by trigger) purely so RLS/indexes stay a direct column
-- check per ARCHITECTURE.md §7, without becoming a second source of truth.
-- ---------------------------------------------------------------------------
create table public.workout_exercises (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  sort_order integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.workout_exercises is
  'workout_session_id + exercise_id is intentionally NOT unique: the same exercise may be added twice in one session.';

create index workout_exercises_organization_id_idx on public.workout_exercises (organization_id);
create index workout_exercises_workout_session_id_idx on public.workout_exercises (workout_session_id);
create index workout_exercises_exercise_id_idx on public.workout_exercises (exercise_id);

-- ---------------------------------------------------------------------------
-- workout_sets: each set of an exercise
-- organization_id denormalized from the parent workout_exercise, same reasoning.
-- ---------------------------------------------------------------------------
create table public.workout_sets (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number integer not null,
  set_type varchar not null default 'working'
    check (set_type in ('warmup', 'working', 'drop', 'failure')),
  weight_value decimal(6, 2) not null default 0,
  weight_unit varchar not null default 'kg'
    check (weight_unit in ('kg', 'lb')),
  reps integer,
  duration_seconds integer,
  distance_value decimal(8, 2),
  distance_unit varchar check (distance_unit is null or distance_unit in ('meter', 'kilometer')),
  rpe decimal(3, 1),
  rir decimal(3, 1),
  is_completed boolean not null default false,
  completed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.workout_sets is
  'V1 UI only reads/writes set_number, weight_value, weight_unit, reps, is_completed. Other columns reserved for future use.';

create index workout_sets_organization_id_idx on public.workout_sets (organization_id);
create index workout_sets_workout_exercise_id_idx on public.workout_sets (workout_exercise_id);

-- ---------------------------------------------------------------------------
-- exercise_usage_stats: per coach usage counters, powers "most recently used"
-- ---------------------------------------------------------------------------
create table public.exercise_usage_stats (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index exercise_usage_stats_org_user_exercise_key
  on public.exercise_usage_stats (organization_id, user_id, exercise_id);

-- ---------------------------------------------------------------------------
-- favorite_exercises: table reserved per PRD §10.14 (no V1 UI)
-- ---------------------------------------------------------------------------
create table public.favorite_exercises (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index favorite_exercises_org_user_exercise_key
  on public.favorite_exercises (organization_id, user_id, exercise_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance trigger (shared)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger organization_members_set_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

create trigger workout_exercises_set_updated_at
  before update on public.workout_exercises
  for each row execute function public.set_updated_at();

create trigger workout_sets_set_updated_at
  before update on public.workout_sets
  for each row execute function public.set_updated_at();

create trigger exercise_usage_stats_set_updated_at
  before update on public.exercise_usage_stats
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Denormalize organization_id onto workout_exercises / workout_sets so every
-- organization-scoped table has a direct organization_id column for RLS,
-- without workout_exercises/workout_sets becoming a second source of truth
-- (the value is always derived from the parent, never client-supplied).
-- ---------------------------------------------------------------------------
create or replace function public.set_workout_exercise_organization_id()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  select ws.organization_id into new.organization_id
  from public.workout_sessions ws
  where ws.id = new.workout_session_id;

  if new.organization_id is null then
    raise exception using
      errcode = '23503',
      message = 'workout_session_id does not reference an existing workout session.';
  end if;

  return new;
end;
$$;

create trigger workout_exercises_set_organization_id
  before insert on public.workout_exercises
  for each row execute function public.set_workout_exercise_organization_id();

create or replace function public.set_workout_set_organization_id()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  select we.organization_id into new.organization_id
  from public.workout_exercises we
  where we.id = new.workout_exercise_id;

  if new.organization_id is null then
    raise exception using
      errcode = '23503',
      message = 'workout_exercise_id does not reference an existing workout exercise.';
  end if;

  return new;
end;
$$;

create trigger workout_sets_set_organization_id
  before insert on public.workout_sets
  for each row execute function public.set_workout_set_organization_id();

-- ---------------------------------------------------------------------------
-- Keep workout_sessions.total_exercises / total_sets in sync when a session
-- is completed (see private RPC in a later migration for the write path).
-- ---------------------------------------------------------------------------

commit;
