import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { RepositoryError, type ExerciseTag } from "./types";

/** ExerciseTagRepository — many-to-many, coach-customizable tags on
 * exercises (training goal/style, e.g. 肌肥大/熱身), on top of the
 * existing single-value category/muscle-group/equipment classification. */

/** All tags visible to this org: system presets + this org's own custom tags. */
export async function listExerciseTags(organizationId: string): Promise<ExerciseTag[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("exercise_tags")
    .select("*")
    .or(`is_system.eq.true,organization_id.eq.${organizationId}`)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw new RepositoryError(error.message, error);
  return data ?? [];
}

export async function createExerciseTag(organizationId: string, name: string): Promise<ExerciseTag> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("exercise_tags")
    .insert({
      organization_id: organizationId,
      name: name.trim(),
      is_system: false,
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw new RepositoryError(error.message, error);
  return data;
}

/** Only this org's own custom tags can be deleted (RLS refuses system tags). */
export async function deleteExerciseTag(tagId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("exercise_tags").delete().eq("id", tagId);
  if (error) throw new RepositoryError(error.message, error);
}

export async function addExerciseTagLink(organizationId: string, exerciseId: string, tagId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("exercise_tag_links")
    .insert({ organization_id: organizationId, exercise_id: exerciseId, tag_id: tagId });
  if (error) throw new RepositoryError(error.message, error);
}

export async function removeExerciseTagLink(exerciseId: string, tagId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("exercise_tag_links")
    .delete()
    .eq("exercise_id", exerciseId)
    .eq("tag_id", tagId);
  if (error) throw new RepositoryError(error.message, error);
}

/** Tags currently applied to one exercise, scoped to this org (RLS already
 * filters exercise_tag_links to rows this org can see). */
export async function getExerciseTags(exerciseId: string): Promise<ExerciseTag[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("exercise_tag_links")
    .select("tag:exercise_tags(*)")
    .eq("exercise_id", exerciseId);
  if (error) throw new RepositoryError(error.message, error);
  return (data ?? []).map((row) => row.tag).filter((tag): tag is ExerciseTag => tag !== null);
}
