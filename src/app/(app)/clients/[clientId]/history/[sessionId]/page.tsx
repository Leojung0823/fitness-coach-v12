"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { t } from "@/lib/strings";
import { getWorkoutDetail } from "@/lib/repositories/workouts";
import type { WorkoutSessionDetail } from "@/lib/repositories/types";
import { toFriendlyMessage } from "@/lib/errors";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateBlock";

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function WorkoutHistoryDetailPage() {
  const params = useParams<{ clientId: string; sessionId: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<WorkoutSessionDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="page">
      <header className="page-header">
        <button
          className="icon-btn"
          onClick={() => router.push(`/clients/${params.clientId}`)}
          aria-label={t.common.back}
        >
          ←
        </button>
        <h1>{detail ? formatDateTime(detail.started_at) : t.clients.historyTitle}</h1>
      </header>

      <div className="page-body page-body--no-fab">
        {detail === undefined && !error ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {detail === null && !error ? (
          <EmptyState icon="🚫" message="找不到這堂課程紀錄。" />
        ) : null}

        {detail ? (
          <>
            <div className="card">
              <div className="muted">{t.workout.coach}：{detail.coach_display_name ?? "—"}</div>
              <div className="muted">{t.workout.sessionDate}：{formatDateTime(detail.started_at)}</div>
              {detail.note ? (
                <div style={{ marginTop: 10 }}>
                  <div className="muted">{t.workout.sessionNote}</div>
                  <div>{detail.note}</div>
                </div>
              ) : null}
            </div>

            {detail.workout_exercises.length === 0 ? (
              <EmptyState icon="📋" message={t.clients.noHistory} />
            ) : (
              detail.workout_exercises.map((we) => (
                <div className="card" key={we.id}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{we.exercise.name_zh_tw}</div>
                  {we.exercise.name_en ? (
                    <div className="muted" style={{ marginTop: -6, marginBottom: 8 }}>
                      {we.exercise.name_en}
                    </div>
                  ) : null}
                  {we.sets.map((s) => (
                    <div key={s.id} className="set-row">
                      <span className="set-label">{t.workout.setNumber(s.set_number)}</span>
                      <span>
                        {s.weight_value} {t.common.kg} × {s.reps ?? 0} {t.common.reps}
                      </span>
                      {s.is_completed ? (
                        <span className="badge badge-completed" style={{ marginLeft: "auto" }}>
                          {t.workout.markComplete}
                        </span>
                      ) : null}
                    </div>
                  ))}
                  {we.note ? (
                    <div className="muted" style={{ marginTop: 8 }}>
                      {we.note}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
