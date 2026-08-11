import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  RepositoryError,
  type Exercise,
  type ExerciseCategory,
  type MuscleGroup,
  type EquipmentType,
} from "./types";

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

export async function searchExercises(organizationId: string, term: string): Promise<Exercise[]> {
  const supabase = createSupabaseClient();
  const trimmed = term.trim();
  let query = supabase
    .from("exercises")
    .select("*")
    .eq("is_active", true)
    .or(`is_system.eq.true,organization_id.eq.${organizationId}`);

  if (trimmed !== "") {
    query = query.or(`name_zh_tw.ilike.%${trimmed}%,name_en.ilike.%${trimmed}%`);
  }

  const { data, error } = await query.order("name_zh_tw", { ascending: true });
  if (error) throw new RepositoryError(error.message, error);
  return data ?? [];
}

export async function listExercisesByMuscleGroup(
  organizationId: string,
  muscleGroupId: string,
): Promise<Exercise[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("is_active", true)
    .eq("primary_muscle_group_id", muscleGroupId)
    .or(`is_system.eq.true,organization_id.eq.${organizationId}`)
    .order("name_zh_tw", { ascending: true });
  if (error) throw new RepositoryError(error.message, error);
  return data ?? [];
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
