"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useOrg } from "@/lib/OrgContext";
import { t } from "@/lib/strings";
import { getClient, archiveClient } from "@/lib/repositories/clients";
import {
  listClientWorkouts,
  createWorkoutSession,
  getClientExercisePerformance,
  type ClientWorkoutListItem,
} from "@/lib/repositories/workouts";
import type { Client, ClientExercisePerformance } from "@/lib/repositories/types";
import { toFriendlyMessage } from "@/lib/errors";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateBlock";
import { formatDateTimeWithWeekday, formatDateWithWeekday } from "@/lib/dateFormat";

const statusBadge: Record<string, { label: string; cls: string }> = {
  draft: { label: t.workout.draft, cls: "badge-draft" },
  completed: { label: t.workout.completed, cls: "badge-completed" },
  cancelled: { label: t.workout.cancelled, cls: "badge-cancelled" },
};

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const { organizationId } = useOrg();
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [sessions, setSessions] = useState<ClientWorkoutListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "performance">("history");
  const [performance, setPerformance] = useState<ClientExercisePerformance[] | null>(null);
  const [performanceError, setPerformanceError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, s] = await Promise.all([
        getClient(params.clientId),
        listClientWorkouts(params.clientId),
      ]);
      setClient(c);
      setSessions(s);
    } catch (err) {
      setError(toFriendlyMessage(err));
    }
  }, [params.clientId]);

  useEffect(() => {
    load();
  }, [load]);

  // Lazy-loaded — most visits only look at 歷史課程, no need to pay for
  // the performance query on every client detail page load.
  useEffect(() => {
    if (activeTab !== "performance" || performance !== null) return;
    let active = true;
    getClientExercisePerformance(params.clientId)
      .then((data) => {
        if (active) setPerformance(data);
      })
      .catch((err) => {
        if (active) setPerformanceError(toFriendlyMessage(err));
      });
    return () => {
      active = false;
    };
  }, [activeTab, performance, params.clientId]);

  async function handleStartSession() {
    setStarting(true);
    try {
      const session = await createWorkoutSession(organizationId, params.clientId);
      router.push(`/workout/${session.id}`);
    } catch (err) {
      setError(toFriendlyMessage(err));
      setStarting(false);
    }
  }

  async function handleToggleArchive() {
    if (!client) return;
    const archived = client.status !== "archived";
    if (archived && !window.confirm(t.clients.archiveConfirm)) return;
    setArchiving(true);
    try {
      const updated = await archiveClient(client.id, archived);
      setClient(updated);
    } catch (err) {
      setError(toFriendlyMessage(err));
    } finally {
      setArchiving(false);
    }
  }

  if (client === undefined) {
    return (
      <div className="page">
        <header className="page-header">
          <button className="icon-btn" onClick={() => router.back()} aria-label={t.common.back}>
            ←
          </button>
          <h1>{t.clients.clientDetailTitle}</h1>
        </header>
        <div className="page-body">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error && !client) {
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

  if (client === null) {
    return (
      <div className="page">
        <header className="page-header">
          <button className="icon-btn" onClick={() => router.back()} aria-label={t.common.back}>
            ←
          </button>
        </header>
        <div className="page-body">
          <EmptyState icon="🚫" message="找不到這位學員。" />
        </div>
      </div>
    );
  }

  const lastSession = sessions?.find((s) => s.status !== "cancelled");

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => router.push("/clients")} aria-label={t.common.back}>
          ←
        </button>
        <h1>{client.full_name}</h1>
        <Link href={`/clients/${client.id}/edit`} className="icon-btn" aria-label={t.clients.editClient}>
          ✏️
        </Link>
      </header>

      <div className="page-body">
        {error ? <div className="banner banner-error">{error}</div> : null}

        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            {client.full_name}
            {client.nickname ? <span className="muted"> ({client.nickname})</span> : null}
          </div>
          {client.status === "archived" ? (
            <span className="badge badge-archived" style={{ marginTop: 8 }}>
              {t.clients.archived}
            </span>
          ) : null}
          <div className="muted" style={{ marginTop: 8 }}>
            {t.clients.lastSession}：
            {lastSession ? formatDateTimeWithWeekday(lastSession.started_at) : t.clients.neverTrained}
          </div>
          {client.phone ? <div className="muted">{t.clients.phone}：{client.phone}</div> : null}
          {client.note ? <div className="muted" style={{ marginTop: 8 }}>{client.note}</div> : null}
        </div>

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 16 }}
          onClick={handleStartSession}
          disabled={starting || client.status === "archived"}
        >
          {starting ? t.common.loading : t.clients.startTodaySession}
        </button>

        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: 10 }}
          onClick={handleToggleArchive}
          disabled={archiving}
        >
          {client.status === "archived" ? t.clients.unarchiveClient : t.clients.archiveClient}
        </button>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            className={`radio-chip ${activeTab === "history" ? "selected" : ""}`}
            style={{ flex: 1 }}
            onClick={() => setActiveTab("history")}
          >
            {t.clients.historyTitle}
          </button>
          <button
            className={`radio-chip ${activeTab === "performance" ? "selected" : ""}`}
            style={{ flex: 1 }}
            onClick={() => setActiveTab("performance")}
          >
            {t.clients.performanceTitle}
          </button>
        </div>

        {activeTab === "history" ? (
          <>
            {sessions === null ? <LoadingState /> : null}

            {sessions && sessions.length === 0 ? (
              <EmptyState icon="📋" message={t.clients.noHistory} />
            ) : null}

            {sessions && sessions.length > 0
              ? sessions.map((session) => {
                  const badge = statusBadge[session.status] ?? statusBadge.draft;
                  return (
                    <Link key={session.id} href={`/workout/${session.id}`} className="card-link">
                      <div className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{formatDateTimeWithWeekday(session.started_at)}</div>
                            <div className="muted" style={{ marginTop: 4 }}>
                              {t.workout.exercisesCount(session.total_exercises)} ·{" "}
                              {t.workout.setsCount(session.total_sets)}
                            </div>
                          </div>
                          <span className={`badge ${badge.cls}`}>{badge.label}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              : null}
          </>
        ) : (
          <>
            {performanceError ? <div className="banner banner-error" style={{ marginTop: 12 }}>{performanceError}</div> : null}

            {performance === null && !performanceError ? <LoadingState /> : null}

            {performance && performance.length === 0 ? (
              <EmptyState icon="📈" message={t.clients.noPerformance} />
            ) : null}

            {performance && performance.length > 0
              ? performance.map((p) => (
                  <Link key={p.exercise_id} href={`/workout/${p.last_session_id}`} className="card-link">
                    <div className="card">
                      <div style={{ fontWeight: 700 }}>{p.exercise_name_zh_tw}</div>
                      {p.exercise_name_en ? (
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {p.exercise_name_en}
                        </div>
                      ) : null}
                      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                        {t.clients.performanceLastDate}：{formatDateWithWeekday(p.last_session_date)}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                        {p.sets.map((s) => (
                          <span key={s.set_number} className="chip-static">
                            {s.weight_value}
                            {t.common.kg} × {s.reps ?? 0}
                            {t.common.reps}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))
              : null}
          </>
        )}
      </div>
    </div>
  );
}
