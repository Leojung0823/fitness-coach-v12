"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrg } from "@/lib/OrgContext";
import { t } from "@/lib/strings";
import {
  getWorkoutDetail,
  completeWorkoutSession,
  updateWorkoutSessionSchedule,
  deleteWorkoutSession,
} from "@/lib/repositories/workouts";
import { removeExercise } from "@/lib/repositories/workoutExercises";
import { createSet, duplicateSet, updateSet, completeSet, deleteSet } from "@/lib/repositories/workoutSets";
import type { WorkoutSessionDetail } from "@/lib/repositories/types";
import { toFriendlyMessage } from "@/lib/errors";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateBlock";
import { SetRow } from "@/components/SetRow";
import { Toast } from "@/components/Toast";
import { formatDateWithWeekday, weekdayLabel } from "@/lib/dateFormat";

function formatElapsed(startedAt: string) {
  const ms = Date.now() - new Date(startedAt).getTime();
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Ticks every second in isolation so the rest of the (potentially large)
 * exercise/set list doesn't re-render once per second along with it. */
function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{formatElapsed(startedAt)}</>;
}

/** Manual start/stop stopwatch — independent of the session's own elapsed
 * timer (that one tracks the whole session; this is for whatever the coach
 * wants to time in the moment, e.g. a rest interval). Local UI state only,
 * not persisted — isolated so its 1s tick doesn't re-render the page. */
function Stopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return (
    <div className="card stopwatch-card">
      <div className="stopwatch-display">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>
      <div className="stopwatch-controls">
        <button
          className="btn btn-secondary btn-lg"
          onClick={() => {
            setElapsedSeconds(0);
            setRunning(true);
          }}
          disabled={running}
        >
          {t.workout.stopwatchStart}
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => setRunning(false)} disabled={!running}>
          {t.workout.stopwatchStop}
        </button>
      </div>
    </div>
  );
}

function toDateInputValue(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isToday(dateInputValue: string) {
  return dateInputValue === toDateInputValue(new Date().toISOString());
}

export default function WorkoutRecordingPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { organizationId } = useOrg();

  const [detail, setDetail] = useState<WorkoutSessionDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone?: "default" | "error" } | null>(null);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // A completed session opens read-only; the coach must explicitly tap
  // 編輯 to unlock it. Draft sessions are always implicitly editable.
  const [editMode, setEditMode] = useState(false);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getWorkoutDetail(params.sessionId);
      setDetail(data);
    } catch (err) {
      setError(toFriendlyMessage(err));
    }
  }, [params.sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset edit mode when navigating to a different session (App Router
  // keeps this component mounted across dynamic-segment navigation).
  useEffect(() => {
    setEditMode(false);
  }, [params.sessionId]);

  function showToast(message: string, tone: "default" | "error" = "default") {
    setToast({ message, tone });
  }

  async function handleChangeSchedule(nextDate: string, nextTime: string) {
    if (!detail) return;
    const [hours, minutes] = nextTime.split(":").map(Number);
    const startedAt = new Date(`${nextDate}T00:00:00`);
    startedAt.setHours(hours, minutes, 0, 0);

    const previous = detail;
    setDetail({ ...detail, session_date: nextDate, started_at: startedAt.toISOString() });
    try {
      await updateWorkoutSessionSchedule(detail.id, {
        session_date: nextDate,
        started_at: startedAt.toISOString(),
      });
    } catch (err) {
      showToast(toFriendlyMessage(err), "error");
      setDetail(previous);
    }
  }

  function persistSetField(setId: string, patch: { weight_value?: number; reps?: number }) {
    if (debounceTimers.current[setId]) clearTimeout(debounceTimers.current[setId]);
    debounceTimers.current[setId] = setTimeout(async () => {
      try {
        await updateSet(setId, patch);
      } catch (err) {
        showToast(toFriendlyMessage(err), "error");
      }
    }, 350);
  }

  function updateLocalSet(
    workoutExerciseId: string,
    setId: string,
    patch: Partial<{ weight_value: number; reps: number; is_completed: boolean; completed_at: string | null }>,
  ) {
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        workout_exercises: prev.workout_exercises.map((we) =>
          we.id !== workoutExerciseId
            ? we
            : {
                ...we,
                sets: we.sets.map((s) => (s.id !== setId ? s : { ...s, ...patch })),
              },
        ),
      };
    });
  }

  function handleChangeWeight(workoutExerciseId: string, setId: string, value: number) {
    updateLocalSet(workoutExerciseId, setId, { weight_value: value });
    persistSetField(setId, { weight_value: value });
  }

  function handleChangeReps(workoutExerciseId: string, setId: string, value: number) {
    updateLocalSet(workoutExerciseId, setId, { reps: value });
    persistSetField(setId, { reps: value });
  }

  async function handleToggleComplete(workoutExerciseId: string, setId: string, completed: boolean) {
    updateLocalSet(workoutExerciseId, setId, {
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    });
    try {
      await completeSet(setId, completed);
    } catch (err) {
      showToast(toFriendlyMessage(err), "error");
      load();
    }
  }

  async function handleDeleteSet(workoutExerciseId: string, setId: string) {
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            workout_exercises: prev.workout_exercises.map((we) =>
              we.id !== workoutExerciseId
                ? we
                : { ...we, sets: we.sets.filter((s) => s.id !== setId) },
            ),
          }
        : prev,
    );
    try {
      await deleteSet(setId);
    } catch (err) {
      showToast(toFriendlyMessage(err), "error");
      load();
    }
  }

  async function handleAddSet(workoutExerciseId: string) {
    const we = detail?.workout_exercises.find((e) => e.id === workoutExerciseId);
    if (!we) return;
    try {
      const newSet =
        we.sets.length > 0
          ? await duplicateSet(organizationId, workoutExerciseId, we.sets[we.sets.length - 1])
          : await createSet(organizationId, workoutExerciseId, { set_number: 1, weight_value: 0, reps: 10 });
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              workout_exercises: prev.workout_exercises.map((e) =>
                e.id !== workoutExerciseId ? e : { ...e, sets: [...e.sets, newSet] },
              ),
            }
          : prev,
      );
    } catch (err) {
      showToast(toFriendlyMessage(err), "error");
    }
  }

  async function handleRemoveExercise(workoutExerciseId: string) {
    if (!window.confirm(t.workout.deleteExerciseConfirm)) return;
    const previous = detail;
    setDetail((prev) =>
      prev
        ? { ...prev, workout_exercises: prev.workout_exercises.filter((e) => e.id !== workoutExerciseId) }
        : prev,
    );
    try {
      await removeExercise(workoutExerciseId);
    } catch (err) {
      showToast(toFriendlyMessage(err), "error");
      setDetail(previous);
    }
  }

  async function handleComplete() {
    if (!detail) return;
    if (detail.workout_exercises.length === 0) {
      if (!window.confirm(t.workout.completeConfirmEmpty)) return;
    }
    setCompleting(true);
    try {
      await completeWorkoutSession(detail.id);
      router.push(`/clients/${detail.client_id}`);
    } catch (err) {
      showToast(toFriendlyMessage(err), "error");
      setCompleting(false);
    }
  }

  async function handleDeleteSession() {
    if (!detail) return;
    if (!window.confirm(t.workout.deleteSessionConfirm)) return;
    setDeleting(true);
    try {
      await deleteWorkoutSession(detail.id);
      router.push(`/clients/${detail.client_id}`);
    } catch (err) {
      showToast(toFriendlyMessage(err), "error");
      setDeleting(false);
    }
  }

  if (detail === undefined) {
    return (
      <div className="page">
        <header className="page-header">
          <button className="icon-btn" onClick={() => router.back()} aria-label={t.common.back}>
            ←
          </button>
        </header>
        <div className="page-body">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="page">
        <header className="page-header">
          <button className="icon-btn" onClick={() => router.back()} aria-label={t.common.back}>
            ←
          </button>
        </header>
        <div className="page-body">
          <ErrorState message={error} onRetry={load} />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="page">
        <header className="page-header">
          <button className="icon-btn" onClick={() => router.back()} aria-label={t.common.back}>
            ←
          </button>
        </header>
        <div className="page-body">
          <EmptyState icon="🚫" message="找不到這堂課程。" />
        </div>
      </div>
    );
  }

  const isDraft = detail.status === "draft";
  // Completed sessions can be corrected by the coach after the fact
  // (weight/reps typos, a forgotten set); only a cancelled session stays
  // locked. Date/time rescheduling still stays draft-only below — that's
  // a different concern from fixing a completed session's recorded content.
  const editable = detail.status !== "cancelled";
  // Draft sessions are always mid-editing; a completed session opens
  // read-only until the coach explicitly taps 編輯.
  const canEditContent = editable && (isDraft || editMode);

  return (
    <div className="page">
      <header className="page-header">
        <button
          className="icon-btn"
          onClick={() => router.push(`/clients/${detail.client_id}`)}
          aria-label={t.common.back}
        >
          ←
        </button>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <h1 style={{ fontSize: 16 }}>{detail.client_name || t.workout.todaySession}</h1>
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            {t.workout.sessionTime}
          </div>
          {isDraft ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <input
                type="date"
                className="input input-sm"
                aria-label={t.workout.sessionDate}
                value={detail.session_date}
                onChange={(e) => handleChangeSchedule(e.target.value, toTimeInputValue(detail.started_at))}
              />
              <span className="muted" style={{ fontSize: 12 }}>{weekdayLabel(detail.session_date)}</span>
              <input
                type="time"
                className="input input-sm"
                aria-label={t.workout.sessionTime}
                value={toTimeInputValue(detail.started_at)}
                onChange={(e) => handleChangeSchedule(detail.session_date, e.target.value)}
              />
            </div>
          ) : (
            <div style={{ fontSize: 13, marginTop: 2 }}>
              {formatDateWithWeekday(detail.session_date)} {toTimeInputValue(detail.started_at)}
            </div>
          )}
        </div>
        {isDraft && isToday(detail.session_date) ? (
          <div style={{ textAlign: "right", flexShrink: 0, marginRight: 8 }}>
            <div className="muted" style={{ fontSize: 11 }}>
              {t.workout.sessionDuration}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              <ElapsedTimer startedAt={detail.started_at} />
            </div>
          </div>
        ) : null}
        {!isDraft ? (
          <span className={`badge ${detail.status === "completed" ? "badge-completed" : "badge-cancelled"}`}>
            {detail.status === "completed" ? t.workout.completed : t.workout.cancelled}
          </span>
        ) : null}
      </header>

      <div className="page-body">
        {error ? <div className="banner banner-error">{error}</div> : null}

        {isDraft ? <Stopwatch /> : null}

        {detail.workout_exercises.length === 0 ? (
          <EmptyState icon="🏋️" message={t.workout.noExercisesYet} />
        ) : (
          detail.workout_exercises.map((we) => (
            <div className="card" key={we.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{we.exercise.name_zh_tw}</div>
                  {we.exercise.name_en ? (
                    <div className="muted" style={{ fontSize: 12 }}>
                      {we.exercise.name_en}
                    </div>
                  ) : null}
                </div>
                {canEditContent ? (
                  <button
                    className="icon-btn"
                    aria-label={t.workout.deleteExercise}
                    onClick={() => handleRemoveExercise(we.id)}
                  >
                    🗑️
                  </button>
                ) : null}
              </div>

              <div style={{ marginTop: 8 }}>
                {we.sets.map((s) => (
                  <SetRow
                    key={s.id}
                    set={s}
                    disabled={!canEditContent}
                    onChangeWeight={(v) => canEditContent && handleChangeWeight(we.id, s.id, v)}
                    onChangeReps={(v) => canEditContent && handleChangeReps(we.id, s.id, v)}
                    onToggleComplete={(c) => canEditContent && handleToggleComplete(we.id, s.id, c)}
                    onDelete={() => canEditContent && handleDeleteSet(we.id, s.id)}
                  />
                ))}
              </div>

              {canEditContent ? (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => handleAddSet(we.id)}
                >
                  {t.workout.addSet}
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      {isDraft ? (
        <div className="bottom-bar">
          <button
            className="btn btn-secondary"
            onClick={() => router.push(`/workout/${detail.id}/add-exercise`)}
          >
            {t.workout.addExercise}
          </button>
          <button className="btn btn-secondary" onClick={handleComplete} disabled={completing}>
            {completing ? t.common.loading : t.workout.completeSession}
          </button>
        </div>
      ) : null}

      {editable && !isDraft && !editMode ? (
        <div className="bottom-bar">
          <button className="btn btn-secondary" onClick={() => setEditMode(true)}>
            {t.common.edit}
          </button>
          <button className="btn btn-secondary" onClick={handleDeleteSession} disabled={deleting}>
            {deleting ? t.common.loading : t.common.delete}
          </button>
        </div>
      ) : null}

      {editable && !isDraft && editMode ? (
        <div className="bottom-bar">
          <button
            className="btn btn-secondary"
            onClick={() => router.push(`/workout/${detail.id}/add-exercise`)}
          >
            {t.workout.addExercise}
          </button>
          <button className="btn btn-secondary" onClick={() => setEditMode(false)}>
            {t.workout.doneEditing}
          </button>
        </div>
      ) : null}

      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      ) : null}
    </div>
  );
}
