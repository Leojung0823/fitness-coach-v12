import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  RepositoryError,
  type WorkoutSession,
  type WorkoutSessionDetail,
  type WorkoutExerciseWithExercise,
} from "./types";

/** WorkoutRepository (PRD §17). */

export async function createWorkoutSession(organizationId: string, clientId: string) {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new RepositoryError("尚未登入");

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      organization_id: organizationId,
      client_id: clientId,
      coach_user_id: user.id,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw new RepositoryError(error.message, error);
  return data as WorkoutSession;
}

/** Fetch a session with all exercises + sets + the coach's display name, ordered for display. */
export async function getWorkoutDetail(sessionId: string): Promise<WorkoutSessionDetail | null> {
  const supabase = createSupabaseClient();

  // Client name comes along for free via the FK embed — this is the one
  // query that must land before the rest can start (everything else keys
  // off session.coach_user_id / sessionId), so the other two run in
  // parallel afterward instead of stacking into a 4-request waterfall.
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("*, client:clients(full_name)")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionError) throw new RepositoryError(sessionError.message, sessionError);
  if (!session) return null;

  const { client, ...sessionRow } = session as WorkoutSession & { client: { full_name: string } | null };

  const [{ data: coachProfile }, { data: workoutExercises, error: exercisesError }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", sessionRow.coach_user_id).maybeSingle(),
    supabase
      .from("workout_exercises")
      .select("*, exercise:exercises(*), sets:workout_sets(*)")
      .eq("workout_session_id", sessionId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
  ]);
  if (exercisesError) throw new RepositoryError(exercisesError.message, exercisesError);

  const withSortedSets = (workoutExercises ?? []).map((we) => ({
    ...we,
    sets: (we.sets ?? [])
      .filter((s) => !s.deleted_at)
      .sort((a, b) => a.set_number - b.set_number),
  })) as unknown as WorkoutExerciseWithExercise[];

  return {
    ...sessionRow,
    coach_display_name: coachProfile?.display_name ?? null,
    client_name: client?.full_name ?? null,
    workout_exercises: withSortedSets,
  };
}

export async function updateWorkoutSessionNote(sessionId: string, note: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("workout_sessions").update({ note }).eq("id", sessionId);
  if (error) throw new RepositoryError(error.message, error);
}

export async function completeWorkoutSession(sessionId: string): Promise<WorkoutSession> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("complete_workout_session", {
    target_session_id: sessionId,
  });
  if (error) throw new RepositoryError(error.message, error);
  return data as unknown as WorkoutSession;
}

export type ClientWorkoutListItem = Pick<
  WorkoutSession,
  "id" | "session_date" | "started_at" | "completed_at" | "status" | "total_exercises" | "total_sets"
>;

export async function listClientWorkouts(clientId: string): Promise<ClientWorkoutListItem[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, session_date, started_at, completed_at, status, total_exercises, total_sets")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("session_date", { ascending: false })
    .order("started_at", { ascending: false });
  if (error) throw new RepositoryError(error.message, error);
  return data ?? [];
}
