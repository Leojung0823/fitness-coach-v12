"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { t } from "@/lib/strings";
import { getClient } from "@/lib/repositories/clients";
import { getClientExerciseHistory, getClientTrainingRecords } from "@/lib/repositories/workouts";
import type { ExerciseHistoryEntry, TrainingRecord } from "@/lib/repositories/types";
import { toFriendlyMessage } from "@/lib/errors";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateBlock";
import { formatDateWithWeekday } from "@/lib/dateFormat";

function trimWeight(value: number) {
  return Number(value).toString();
}

export default function ExerciseHistoryPage() {
  const params = useParams<{ clientId: string; exerciseId: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<TrainingRecord | null | undefined>(undefined);
  const [clientName, setClientName] = useState<string>("");
  const [history, setHistory] = useState<ExerciseHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // The three reads do not depend on each other, and on a phone in a gym
      // the round trips are what the coach feels.
      const [client, records, entries] = await Promise.all([
        getClient(params.clientId),
        getClientTrainingRecords(params.clientId),
        getClientExerciseHistory(params.clientId, params.exerciseId),
      ]);
      setClientName(client?.full_name ?? "");
      setRecord(records.find((entry) => entry.exercise_id === params.exerciseId) ?? null);
      setHistory(entries);
    } catch (err) {
      setError(toFriendlyMessage(err));
    }
  }, [params.clientId, params.exerciseId]);

  useEffect(() => {
    load();
  }, [load]);

  const header = (
    <header className="page-header">
      <button className="icon-btn" onClick={() => router.back()} aria-label={t.common.back}>
        ←
      </button>
      <h1>{record?.exercise_name_zh_tw ?? t.training.historyTitle}</h1>
    </header>
  );

  if (error) {
    return (
      <div className="page">
        {header}
        <div className="page-body">
          <ErrorState message={error} onRetry={load} />
        </div>
      </div>
    );
  }

  if (record === undefined || history === null) {
    return (
      <div className="page">
        {header}
        <div className="page-body">
          <LoadingState />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {header}
      <div className="page-body">
        {clientName ? <p className="muted">{clientName}</p> : null}

      {record ? (
        <div className="card latest-card">
          <span className="muted">{t.training.latest}</span>
          <div className="latest-figure">
            <span className="record-weight-value">{trimWeight(record.top_weight)}</span>
            <span className="record-weight-unit">{record.weight_unit}</span>
            <span className="latest-sets">{t.training.setsUnit(record.set_count)}</span>
          </div>
          <span className="muted">{formatDateWithWeekday(record.last_session_date)}</span>
        </div>
      ) : null}

      <h2 className="section-title">{t.training.historyTitle}</h2>

      {history.length === 0 ? <EmptyState icon="📈" message={t.clients.noPerformance} /> : null}

        {history.map((entry) => (
          <Link key={entry.session_id} href={`/workout/${entry.session_id}`} className="card-link">
            <div className="card history-row">
              <span className="history-date">{formatDateWithWeekday(entry.session_date)}</span>
              <span className="history-figure">
                <span className="history-weight">{trimWeight(entry.top_weight)}</span>
                <span className="record-weight-unit">{entry.weight_unit}</span>
              </span>
              <span className="history-sets">{t.training.setsUnit(entry.set_count)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
