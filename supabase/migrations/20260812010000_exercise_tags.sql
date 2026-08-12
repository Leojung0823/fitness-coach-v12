-- Coach Note: many-to-many, coach-customizable tags on exercises
-- (e.g. 肌肥大/肌力/熱身), on top of the existing single-value
-- category/muscle-group/equipment classification. Tags themselves follow
-- the same is_system/organization_id split as exercises (public.exercises,
-- 20260811010000): a handful of system presets everyone sees, plus each
-- org can define their own. Assignments are organization_id-scoped even
-- when the exercise itself is a shared system exercise, so one org tagging
-- a shared exercise never leaks into another org's view of it.

begin;

create table public.exercise_tags (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  name varchar not null check (btrim(name) <> ''),
  is_system boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_system = false or organization_id is null),
  check (is_system = true or organization_id is not null)
);

create index exercise_tags_organization_id_idx on public.exercise_tags (organization_id);

-- Case-insensitive uniqueness per scope so coaches can't pile up
-- near-duplicate tags ("肌肥大" / "肌肥大 " / "肌肥大" typo'd twice).
create unique index exercise_tags_org_name_unique_idx
  on public.exercise_tags (organization_id, lower(btrim(name)))
  where organization_id is not null;

create unique index exercise_tags_system_name_unique_idx
  on public.exercise_tags (lower(btrim(name)))
  where is_system;

create trigger exercise_tags_set_updated_at
  before update on public.exercise_tags
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- exercise_tag_links: which tags apply to which exercise, per organization.
-- organization_id is part of the key (not derived from exercise_id) because
-- exercise_id may point at a shared system exercise that different orgs tag
-- differently — this is client-supplied like clients/workout_sessions and
-- validated by the INSERT policy below, the same pattern those tables use.
-- ---------------------------------------------------------------------------
create table public.exercise_tag_links (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  tag_id uuid not null references public.exercise_tags(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (exercise_id, tag_id, organization_id)
);

create index exercise_tag_links_exercise_id_idx on public.exercise_tag_links (exercise_id);
create index exercise_tag_links_tag_id_idx on public.exercise_tag_links (tag_id);
create index exercise_tag_links_organization_id_idx on public.exercise_tag_links (organization_id);

-- ---------------------------------------------------------------------------
-- RLS: exercise_tags
-- ---------------------------------------------------------------------------
alter table public.exercise_tags enable row level security;

create policy exercise_tags_select_system_or_own_org
  on public.exercise_tags for select
  to authenticated
  using (
    is_system
    or (organization_id is not null and private.user_has_org_access(organization_id))
  );

create policy exercise_tags_insert_own_org_custom_only
  on public.exercise_tags for insert
  to authenticated
  with check (
    is_system = false
    and organization_id is not null
    and private.user_can(organization_id, 'exercise_tag.create')
  );

create policy exercise_tags_update_own_org_custom_only
  on public.exercise_tags for update
  to authenticated
  using (
    is_system = false
    and organization_id is not null
    and private.user_can(organization_id, 'exercise_tag.update')
  )
  with check (
    is_system = false
    and organization_id is not null
    and private.user_can(organization_id, 'exercise_tag.update')
  );

create policy exercise_tags_delete_own_org_custom_only
  on public.exercise_tags for delete
  to authenticated
  using (
    is_system = false
    and organization_id is not null
    and private.user_can(organization_id, 'exercise_tag.delete')
  );

-- ---------------------------------------------------------------------------
-- RLS: exercise_tag_links
-- ---------------------------------------------------------------------------
alter table public.exercise_tag_links enable row level security;

create policy exercise_tag_links_select_org_member
  on public.exercise_tag_links for select
  to authenticated
  using (private.user_has_org_access(organization_id));

create policy exercise_tag_links_insert_org_member
  on public.exercise_tag_links for insert
  to authenticated
  with check (
    private.user_can(organization_id, 'exercise_tag.update')
    and exists (
      select 1 from public.exercise_tags t
      where t.id = tag_id
        and (t.is_system or t.organization_id = exercise_tag_links.organization_id)
    )
    and exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and (e.is_system or e.organization_id = exercise_tag_links.organization_id)
    )
  );

create policy exercise_tag_links_delete_org_member
  on public.exercise_tag_links for delete
  to authenticated
  using (private.user_can(organization_id, 'exercise_tag.update'));

grant select, insert, update, delete on public.exercise_tags to authenticated;
grant select, insert, delete on public.exercise_tag_links to authenticated;

-- ---------------------------------------------------------------------------
-- Seed a small starting set of system tags (training goal / style — the
-- dimension the existing category/muscle-group/equipment columns don't
-- cover). Coaches can add their own custom ones on top from the app.
-- ---------------------------------------------------------------------------
insert into public.exercise_tags (organization_id, name, is_system) values
  (null, '肌肥大', true),
  (null, '肌力', true),
  (null, '爆發力', true),
  (null, '肌耐力', true),
  (null, '心肺', true),
  (null, '熱身', true),
  (null, '收操', true),
  (null, '複合動作', true),
  (null, '單關節動作', true),
  (null, '核心穩定', true);

commit;
