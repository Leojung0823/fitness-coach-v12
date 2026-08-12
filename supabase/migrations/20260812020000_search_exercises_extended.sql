-- Coach Note: exercise search must match name AND the other classification
-- fields the coach thinks of as "tags on the exercise" — category, primary
-- muscle group, equipment, and actual custom/system tags (exercise_tags).
-- PostgREST can't express an OR across several joined tables in one request,
-- so this is a SQL function doing the join server-side. security invoker so
-- RLS on exercises/exercise_tag_links/exercise_tags applies exactly as it
-- would to an ad-hoc client query — this function grants no extra access.

begin;

create or replace function public.search_exercises(target_organization_id uuid, term text)
returns table (
  id uuid,
  organization_id uuid,
  category_id uuid,
  primary_muscle_group_id uuid,
  equipment_type_id uuid,
  name_zh_tw varchar,
  name_en varchar,
  tracking_type varchar,
  default_unit varchar,
  is_system boolean,
  is_active boolean,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  tags jsonb
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with escaped as (
    select replace(replace(btrim(term), '%', '\%'), '_', '\_') as pattern
  )
  select
    e.id, e.organization_id, e.category_id, e.primary_muscle_group_id, e.equipment_type_id,
    e.name_zh_tw, e.name_en, e.tracking_type, e.default_unit, e.is_system, e.is_active,
    e.created_by, e.created_at, e.updated_at, e.deleted_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
          'id', t2.id, 'name', t2.name, 'is_system', t2.is_system, 'organization_id', t2.organization_id
        ))
       from public.exercise_tag_links etl2
       join public.exercise_tags t2 on t2.id = etl2.tag_id
       where etl2.exercise_id = e.id and etl2.organization_id = target_organization_id),
      '[]'::jsonb
    ) as tags
  from public.exercises e
  left join public.exercise_categories c on c.id = e.category_id
  left join public.muscle_groups mg on mg.id = e.primary_muscle_group_id
  left join public.equipment_types eq on eq.id = e.equipment_type_id
  cross join escaped
  where e.is_active
    and (e.is_system or e.organization_id = target_organization_id)
    and (
      escaped.pattern = ''
      or e.name_zh_tw ilike '%' || escaped.pattern || '%' escape '\'
      or e.name_en ilike '%' || escaped.pattern || '%' escape '\'
      or c.name_zh_tw ilike '%' || escaped.pattern || '%' escape '\'
      or c.name_en ilike '%' || escaped.pattern || '%' escape '\'
      or mg.name_zh_tw ilike '%' || escaped.pattern || '%' escape '\'
      or mg.name_en ilike '%' || escaped.pattern || '%' escape '\'
      or eq.name_zh_tw ilike '%' || escaped.pattern || '%' escape '\'
      or eq.name_en ilike '%' || escaped.pattern || '%' escape '\'
      or exists (
        select 1 from public.exercise_tag_links etl3
        join public.exercise_tags t3 on t3.id = etl3.tag_id
        where etl3.exercise_id = e.id
          and etl3.organization_id = target_organization_id
          and t3.name ilike '%' || escaped.pattern || '%' escape '\'
      )
    )
  order by e.name_zh_tw;
$$;

comment on function public.search_exercises(uuid, text) is
  'Exercise search across name, category, muscle group, equipment, and tags — the fields a coach thinks of as this exercise''s tags. security invoker: no elevated access, RLS applies per table exactly as a direct client query would.';

grant execute on function public.search_exercises(uuid, text) to authenticated;

commit;
