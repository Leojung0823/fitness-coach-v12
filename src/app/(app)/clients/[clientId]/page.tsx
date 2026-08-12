"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useOrg } from "@/lib/OrgContext";
import { t } from "@/lib/strings";
import { getClient, archiveClient } from "@/lib/repositories/clients";
import { listClientWorkouts, createWorkoutSession, type ClientWorkoutListItem } from "@/lib/repositories/workouts";
import type { Client } from "@/lib/repositories/types";
import { toFriendlyMessage } from "@/lib/errors";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateBlock";
import { formatDateTimeWithWeekday } from "@/lib/dateFormat";

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

        <div className="section-title">{t.clients.historyTitle}</div>

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
      </div>
    </div>
  );
}
