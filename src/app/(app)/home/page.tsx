"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { t } from "@/lib/strings";
import { useOrg } from "@/lib/OrgContext";
import { listSessionsOnDate, getRangeSummary, type TodaySession } from "@/lib/repositories/workouts";
import { listClients, type ClientListItem } from "@/lib/repositories/clients";
import { toFriendlyMessage } from "@/lib/errors";
import { LoadingState, ErrorState } from "@/components/StateBlock";

function isoDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Monday-based, matching how a coach reads 本週. */
function weekRange() {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return { from: isoDate(monday), to: isoDate(now) };
}

export default function HomePage() {
  const { organizationId, displayName } = useOrg();
  const [sessions, setSessions] = useState<TodaySession[] | null>(null);
  const [summary, setSummary] = useState<{ sessions: number; clients: number } | null>(null);
  const [recent, setRecent] = useState<ClientListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { from, to } = weekRange();
      // Independent reads, so they go together rather than one after another.
      const [today, week, clients] = await Promise.all([
        listSessionsOnDate(isoDate(new Date())),
        getRangeSummary(from, to),
        listClients(organizationId),
      ]);
      setSessions(today);
      setSummary(week);
      setRecent(
        [...clients]
          .filter((client) => client.last_session_date)
          .sort((a, b) => (a.last_session_date! < b.last_session_date! ? 1 : -1))
          .slice(0, 3),
      );
    } catch (err) {
      setError(toFriendlyMessage(err));
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t.home.title}</h1>
      </header>

      <div className="page-body">
        {displayName ? <p className="muted">{displayName}</p> : null}

        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {!error && sessions === null ? <LoadingState /> : null}

        {!error && summary ? (
          <div className="today-summary">
            <div className="today-stat">
              <span className="today-stat-value">{summary.sessions}</span>
              <span className="today-stat-label">{t.home.weekSummary}・課程</span>
            </div>
            <div className="today-stat">
              <span className="today-stat-value">{summary.clients}</span>
              <span className="today-stat-label">{t.home.weekSummary}・學員</span>
            </div>
          </div>
        ) : null}

        {!error && sessions ? (
          <>
            <h2 className="section-title">{t.home.todaySessions}</h2>

            {sessions.length === 0 ? (
              <div className="card">
                <p className="muted" style={{ margin: 0 }}>
                  {t.home.noSessionsToday}
                </p>
              </div>
            ) : null}

            {sessions.map((session) => (
              <Link key={session.id} href={`/workout/${session.id}`} className="card-link">
                <div className="card session-row">
                  <span className="session-row-main">
                    <span className="session-row-name">{session.client_name}</span>
                    <span className="muted">
                      {t.workout.exercisesCount(session.total_exercises)} ·{" "}
                      {t.workout.setsCount(session.total_sets)}
                    </span>
                  </span>
                  {session.status === "draft" ? (
                    <span className="badge badge-draft">{t.home.draft}</span>
                  ) : null}
                  <span className="muted">
                    {session.status === "draft" ? t.home.resume : t.home.open} →
                  </span>
                </div>
              </Link>
            ))}

            {sessions.length === 0 && recent.length > 0 ? (
              <>
                <h2 className="section-title">{t.home.recentClients}</h2>
                {recent.map((client) => (
                  <Link key={client.id} href={`/clients/${client.id}`} className="card-link">
                    <div className="card session-row">
                      <span className="session-row-main">
                        <span className="session-row-name">{client.full_name}</span>
                        <span className="muted">
                          {t.clients.lastSession}：{client.last_session_date}
                        </span>
                      </span>
                      <span className="muted">→</span>
                    </div>
                  </Link>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
