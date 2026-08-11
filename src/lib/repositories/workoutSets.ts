import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { RepositoryError, type WorkoutSet } from "./types";

/** WorkoutSetRepository (PRD §17). */

export async function createSet(
  organizationId: string,
  workoutExerciseId: string,
  input: { set_number: number; weight_value: number; reps: number },
): Promise<WorkoutSet> {
  const supabase = createSupabaseClient();
  // organization_id is also stamped server-side by a BEFORE INSERT trigger
  // derived from workout_exercise_id — see migration 20260811010000. The
  // client-supplied value here only satisfies the generated not-null
  // column type and is never trusted as the source of truth.
  const { data, error } = await supabase
    .from("workout_sets")
    .insert({
      organization_id: organizationId,
      workout_exercise_id: workoutExerciseId,
      set_number: input.set_number,
      weight_value: input.weight_value,
      reps: input.reps,
      is_completed: false,
    })
    .select("*")
    .single();
  if (error) throw new RepositoryError(error.message, error);
  return data as WorkoutSet;
}

/** "新增一組": copies the previous set's weight + reps, next set_number, always incomplete. */
export async function duplicateSet(
  organizationId: string,
  workoutExerciseId: string,
  previousSet: WorkoutSet,
) {
  return createSet(organizationId, workoutExerciseId, {
    set_number: previousSet.set_number + 1,
    weight_value: previousSet.weight_value,
    reps: previousSet.reps ?? 10,
  });
}

export async function updateSet(
  setId: string,
  input: Partial<Pick<WorkoutSet, "weight_value" | "reps" | "is_completed" | "completed_at">>,
): Promise<WorkoutSet> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("workout_sets")
    .update(input)
    .eq("id", setId)
    .select("*")
    .single();
  if (error) throw new RepositoryError(error.message, error);
  return data as WorkoutSet;
}

export async function completeSet(setId: string, completed: boolean) {
  return updateSet(setId, {
    is_completed: completed,
    completed_at: completed ? new Date().toISOString() : null,
  });
}

/** Only incomplete sets may be deleted (PRD §7.6). */
export async function deleteSet(setId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("workout_sets")
    .delete()
    .eq("id", setId)
    .eq("is_completed", false);
  if (error) throw new RepositoryError(error.message, error);
}
