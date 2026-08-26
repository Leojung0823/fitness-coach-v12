import type { Database } from "@/lib/supabase/database.types";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type ExerciseCategory = Database["public"]["Tables"]["exercise_categories"]["Row"];
export type MuscleGroup = Database["public"]["Tables"]["muscle_groups"]["Row"];
export type EquipmentType = Database["public"]["Tables"]["equipment_types"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type ExerciseTag = Database["public"]["Tables"]["exercise_tags"]["Row"];

export type ExerciseWithTags = Exercise & { tags: ExerciseTag[] };

export type WorkoutSession = Database["public"]["Tables"]["workout_sessions"]["Row"];
export type WorkoutExercise = Database["public"]["Tables"]["workout_exercises"]["Row"];
export type WorkoutSet = Database["public"]["Tables"]["workout_sets"]["Row"];

export type WorkoutExerciseWithExercise = WorkoutExercise & {
  exercise: Exercise;
  sets: WorkoutSet[];
};

export type WorkoutSessionDetail = WorkoutSession & {
  coach_display_name: string | null;
  client_name: string | null;
  workout_exercises: WorkoutExerciseWithExercise[];
};

export type ClientExercisePerformanceSet = {
  set_number: number;
  weight_value: number;
  weight_unit: string;
  reps: number | null;
  is_completed: boolean;
};

/** One exercise on the training-record screen: the latest session, plus the
 * one before it so the screen can say whether the weight moved. */
export type TrainingRecord = {
  exercise_id: string;
  exercise_name_zh_tw: string;
  exercise_name_en: string | null;
  muscle_filter_key: string;
  last_session_id: string;
  last_session_date: string;
  top_weight: number;
  weight_unit: string;
  set_count: number;
  previous_session_date: string | null;
  previous_top_weight: number | null;
  /** null on the first ever occurrence — different from 0, which is "no change". */
  weight_delta: number | null;
};

export type ExerciseHistoryEntry = {
  session_id: string;
  session_date: string;
  top_weight: number;
  weight_unit: string;
  set_count: number;
  sets: ClientExercisePerformanceSet[];
};

export class RepositoryError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}
