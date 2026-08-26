"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useOrg } from "@/lib/OrgContext";
import { t } from "@/lib/strings";
import { getClient, archiveClient } from "@/lib/repositories/clients";
import {
  listClientWorkouts,
  createWorkoutSession,
  getClientTrainingRecords,
  quickLogExercise,
  type ClientWorkoutListItem,
} from "@/lib/repositories/workouts";
import type { Client, TrainingRecord } from "@/lib/repositories/types";
import { toFriendlyMessage } from "@/lib/errors";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateBlock";
import { TrainingRecordList } from "@/components/TrainingRecordList";
import { QuickLogSheet } from "@/components/QuickLogSheet";
import { Toast } from "@/components/Toast";
import { formatDateTimeWithWeekday } from "@/lib/dateFormat";

/** Monday-based, matching how a coach reads "本週". */
function trainedThisWeek(records: TrainingRecord[]) {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return records.filter((record) => new Date(`${record.last_session_date}T00:00:00`) >= monday).length;
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  draft: { label: t.workout.draft, cls: "badge-draft" },
  completed: { label: t.workout.completed, cls: "badge-completed" },
  cancelled: { label: t.workout.cancelled, cls: "badge-cancelled" },
};

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organizationId } = useOrg();
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [sessions, setSessions] = useState<ClientWorkoutListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  // The 訓練 tab links straight here, so honour where it wanted to land.
  const [activeTab, setActiveTab] = useState<"history" | "performance">(
    searchParams.get("tab") === "training" ? "performance" : "history",
  );
  const [records, setRecords] = useState<TrainingRecord[] | null>(null);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [quickLogFor, setQuickLogFor] = useState<TrainingRecord | null>(null);
  const [savingQuickLog, setSavingQuickLog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
    if (activeTab !== "performance" || records !== null) return;
    let active = true;
    getClientTrainingRecords(params.clientId)
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch((err) => {
        if (active) setPerformanceError(toFriendlyMessage(err));
      });
    return () => {
      active = false;
    };
  }, [activeTab, records, params.clientId]);

  async function handleQuickLog(input: { weight: number; setCount: number; sessionDate: string }) {
    if (!quickLogFor) return;
    setSavingQuickLog(true);
    try {
      await quickLogExercise({
        clientId: params.clientId,
        exerciseId: quickLogFor.exercise_id,
        weight: input.weight,
        setCount: input.setCount,
        sessionDate: input.sessionDate,
      });
      setQuickLogFor(null);
      setToast(t.training.saved);
      // The list now disagrees with the database -- refetch rather than patch
      // it locally, because the delta and the ordering both changed.
      setRecords(await getClientTrainingRecords(params.clientId));
      setSessions(await listClientWorkouts(params.clientId));
    } catch (err) {
      setPerformanceError(toFriendlyMessage(err));
    } finally {
      setSavingQuickLog(false);
    }
  }

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
            {performanceError ? (
              <div className="banner banner-error" style={{ marginTop: 12 }}>{performanceError}</div>
            ) : null}

            {records === null && !performanceError ? <LoadingState /> : null}

            {records && records.length === 0 ? (
              <EmptyState icon="📈" message={t.clients.noPerformance} />
            ) : null}

            {records && records.length > 0 ? (
              <>
                <div className="training-summary">
                  <span className="training-week">{t.training.weekSummary(trainedThisWeek(records))}</span>
                  <span className="muted">
                    {t.training.lastUpdated(records[0].last_session_date.replaceAll("-", "/"))}
                  </span>
                </div>
                <TrainingRecordList
                  clientId={params.clientId}
                  records={records}
                  onQuickLog={setQuickLogFor}
                />
              </>
            ) : null}
          </>
        )}
      </div>

      {quickLogFor ? (
        <QuickLogSheet
          record={quickLogFor}
          saving={savingQuickLog}
          onSave={handleQuickLog}
          onClose={() => setQuickLogFor(null)}
        />
      ) : null}

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
