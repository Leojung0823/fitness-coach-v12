import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  RepositoryError,
  type Exercise,
  type ExerciseCategory,
  type MuscleGroup,
  type EquipmentType,
  type ExerciseTag,
  type ExerciseWithTags,
} from "./types";

const EXERCISE_WITH_TAGS_SELECT = "*, exercise_tag_links(exercise_tags(*))";

type ExerciseRowWithTagLinks = Exercise & {
  exercise_tag_links: { exercise_tags: ExerciseTag | null }[] | null;
};

function withFlattenedTags(row: ExerciseRowWithTagLinks): ExerciseWithTags {
  const { exercise_tag_links, ...exercise } = row;
  return {
    ...exercise,
    tags: (exercise_tag_links ?? [])
      .map((link) => link.exercise_tags)
      .filter((tag): tag is ExerciseTag => tag !== null),
  };
}

/** ExerciseRepository (PRD §17). */

export async function listCategories(): Promise<ExerciseCategory[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("exercise_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new RepositoryError(error.message, error);
  return data ?? [];
}

export async function listMuscleGroups(): Promise<MuscleGroup[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("muscle_groups")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new RepositoryError(error.message, error);
  return data ?? [];
}

export async function listEquipmentTypes(): Promise<EquipmentType[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("equipment_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new RepositoryError(error.message, error);
  return data ?? [];
}

/** All exercises visible to this organization: system exercises + this org's custom exercises. */
export async function listVisibleExercises(organizationId: string): Promise<Exercise[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("is_active", true)
    .or(`is_system.eq.true,organization_id.eq.${organizationId}`)
    .order("name_zh_tw", { ascending: true });
  if (error) throw new RepositoryError(error.message, error);
  return data ?? [];
}

export async function searchExercises(organizationId: string, term: string): Promise<ExerciseWithTags[]> {
  const supabase = createSupabaseClient();
  const trimmed = term.trim();
  let query = supabase
    .from("exercises")
    .select(EXERCISE_WITH_TAGS_SELECT)
    .eq("is_active", true)
    .or(`is_system.eq.true,organization_id.eq.${organizationId}`);

  if (trimmed !== "") {
    query = query.or(`name_zh_tw.ilike.%${trimmed}%,name_en.ilike.%${trimmed}%`);
  }

  const { data, error } = await query.order("name_zh_tw", { ascending: true });
  if (error) throw new RepositoryError(error.message, error);
  return ((data ?? []) as unknown as ExerciseRowWithTagLinks[]).map(withFlattenedTags);
}

export async function listExercisesByMuscleGroup(
  organizationId: string,
  muscleGroupId: string,
): Promise<ExerciseWithTags[]> {
  const supabase = createSupabaseClient();

  // A top-level muscle group (e.g. 腿部) must also match exercises tagged
  // with one of its children (e.g. 股四頭肌/腿後肌/小腿) — see seed.sql,
  // most leg/back exercises use the specific child muscle group as their
  // primary_muscle_group_id, not the parent.
  const { data: children, error: childError } = await supabase
    .from("muscle_groups")
    .select("id")
    .eq("parent_id", muscleGroupId);
  if (childError) throw new RepositoryError(childError.message, childError);

  const groupIds = [muscleGroupId, ...(children ?? []).map((c) => c.id)];

  const { data, error } = await supabase
    .from("exercises")
    .select(EXERCISE_WITH_TAGS_SELECT)
    .eq("is_active", true)
    .in("primary_muscle_group_id", groupIds)
    .or(`is_system.eq.true,organization_id.eq.${organizationId}`)
    .order("name_zh_tw", { ascending: true });
  if (error) throw new RepositoryError(error.message, error);
  return ((data ?? []) as unknown as ExerciseRowWithTagLinks[]).map(withFlattenedTags);
}

export type RecentExercise = Exercise & { last_used_at: string | null; usage_count: number };

export async function getRecentExercises(
  organizationId: string,
  limit = 10,
): Promise<RecentExercise[]> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("exercise_usage_stats")
    .select("usage_count, last_used_at, exercise:exercises(*)")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .order("last_used_at", { ascending: false })
    .limit(limit);
  if (error) throw new RepositoryError(error.message, error);

  return (data ?? [])
    .filter((row) => row.exercise)
    .map((row) => ({
      ...(row.exercise as unknown as Exercise),
      usage_count: row.usage_count,
      last_used_at: row.last_used_at,
    }));
}

export async function recordExerciseUsage(organizationId: string, exerciseId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.rpc("record_exercise_usage", {
    target_organization_id: organizationId,
    target_exercise_id: exerciseId,
  });
  if (error) throw new RepositoryError(error.message, error);
}

export async function createCustomExercise(
  organizationId: string,
  input: {
    name_zh_tw: string;
    name_en?: string | null;
    category_id?: string | null;
    primary_muscle_group_id?: string | null;
    equipment_type_id?: string | null;
  },
): Promise<Exercise> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      organization_id: organizationId,
      name_zh_tw: input.name_zh_tw.trim(),
      name_en: input.name_en?.trim() || null,
      category_id: input.category_id ?? null,
      primary_muscle_group_id: input.primary_muscle_group_id ?? null,
      equipment_type_id: input.equipment_type_id ?? null,
      is_system: false,
      is_active: true,
      tracking_type: "weight_reps",
      default_unit: "kg",
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw new RepositoryError(error.message, error);
  return data;
}
