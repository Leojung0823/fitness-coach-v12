import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { RepositoryError, type WorkoutExercise, type WorkoutSet } from "./types";
import { recordExerciseUsage } from "./exercises";

/** WorkoutExerciseRepository (PRD §17). */

/**
 * Adds an exercise to a session and creates its first set (PRD §7.5:
 * weight 0, reps 10, set_number 1, incomplete) in one round trip, then
 * records usage for the "最近使用" list.
 */
export async function addExercise(
  organizationId: string,
  sessionId: string,
  exerciseId: string,
): Promise<{ workoutExercise: WorkoutExercise; firstSet: WorkoutSet }> {
  const supabase = createSupabaseClient();

  const { count } = await supabase
    .from("workout_exercises")
    .select("id", { count: "exact", head: true })
    .eq("workout_session_id", sessionId)
    .is("deleted_at", null);

  // organization_id is also stamped server-side by a BEFORE INSERT trigger
  // (see migration 20260811010000) derived from workout_session_id — this
  // client-supplied value only satisfies the generated not-null column
  // type and is never trusted as the source of truth.
  const { data: workoutExercise, error: weError } = await supabase
    .from("workout_exercises")
    .insert({
      organization_id: organizationId,
      workout_session_id: sessionId,
      exercise_id: exerciseId,
      sort_order: count ?? 0,
    })
    .select("*")
    .single();
  if (weError) throw new RepositoryError(weError.message, weError);

  const { data: firstSet, error: setError } = await supabase
    .from("workout_sets")
    .insert({
      organization_id: organizationId,
      workout_exercise_id: workoutExercise.id,
      set_number: 1,
      weight_value: 0,
      reps: 10,
      is_completed: false,
    })
    .select("*")
    .single();
  if (setError) throw new RepositoryError(setError.message, setError);

  // Best-effort — usage stats should never block the main flow.
  recordExerciseUsage(organizationId, exerciseId).catch(() => {});

  return { workoutExercise: workoutExercise as WorkoutExercise, firstSet: firstSet as WorkoutSet };
}

export async function removeExercise(workoutExerciseId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("workout_exercises")
    .delete()
    .eq("id", workoutExerciseId);
  if (error) throw new RepositoryError(error.message, error);
}

export async function updateExerciseNote(workoutExerciseId: string, note: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("workout_exercises")
    .update({ note })
    .eq("id", workoutExerciseId);
  if (error) throw new RepositoryError(error.message, error);
}
