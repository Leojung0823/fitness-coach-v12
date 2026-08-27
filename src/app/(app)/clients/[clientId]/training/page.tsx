"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { t } from "@/lib/strings";
import { getClient } from "@/lib/repositories/clients";
import { getClientTrainingRecords, quickLogExercise } from "@/lib/repositories/workouts";
import type { Client, TrainingRecord } from "@/lib/repositories/types";
import { toFriendlyMessage } from "@/lib/errors";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateBlock";
import { TrainingRecordList } from "@/components/TrainingRecordList";
import { QuickLogPicker } from "@/components/QuickLogPicker";
import { QuickLogSheet } from "@/components/QuickLogSheet";
import { Toast } from "@/components/Toast";

/** Monday-based, matching how a coach reads 本週. */
function trainedThisWeek(records: TrainingRecord[]) {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return records.filter((record) => new Date(`${record.last_session_date}T00:00:00`) >= monday).length;
}

export default function ClientTrainingPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [records, setRecords] = useState<TrainingRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [quickLogFor, setQuickLogFor] = useState<TrainingRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, r] = await Promise.all([
        getClient(params.clientId),
        getClientTrainingRecords(params.clientId),
      ]);
      setClient(c);
      setRecords(r);
    } catch (err) {
      setError(toFriendlyMessage(err));
    }
  }, [params.clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleQuickLog(input: { weight: number; setCount: number; sessionDate: string }) {
    if (!quickLogFor) return;
    setSaving(true);
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
      // The delta and the ordering both moved, so this is a refetch rather
      // than a local patch.
      setRecords(await getClientTrainingRecords(params.clientId));
    } catch (err) {
      setError(toFriendlyMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const lastUpdated = records?.[0]?.last_session_date;

  return (
    <div className="page">
      <header className="screen-header">
        <button className="icon-btn" onClick={() => router.back()} aria-label={t.common.back}>
          ←
        </button>
        <h1>{t.clients.performanceTitle}</h1>
        <button
          type="button"
          className="header-add"
          onClick={() => setPicking(true)}
          disabled={!records || records.length === 0}
          aria-label={t.training.pickExercise}
        >
          ＋
        </button>
      </header>

      <div className="page-body">
        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {!error && (client === undefined || records === null) ? <LoadingState /> : null}

        {!error && client && records ? (
          <>
            <div className="client-strip">
              <span className="client-avatar" aria-hidden="true">
                {client.full_name.trim().slice(0, 1)}
              </span>
              <span className="client-identity">
                <span className="client-name">{client.full_name}</span>
                <span className="client-updated">
                  {lastUpdated
                    ? t.training.lastUpdated(lastUpdated.replaceAll("-", "/"))
                    : t.trainingTab.neverTrained}
                </span>
              </span>
              <span className="week-pill">
                <span className="week-pill-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="12" width="4" height="9" rx="1" />
                    <rect x="10" y="7" width="4" height="14" rx="1" />
                    <rect x="17" y="3" width="4" height="18" rx="1" />
                  </svg>
                </span>
                {t.training.weekSummary(trainedThisWeek(records))}
              </span>
            </div>

            {records.length === 0 ? (
              <EmptyState icon="📈" message={t.clients.noPerformance} />
            ) : (
              <TrainingRecordList clientId={params.clientId} records={records} />
            )}
          </>
        ) : null}
      </div>

      {picking && records ? (
        <QuickLogPicker
          records={records}
          onSelect={(record) => {
            setPicking(false);
            setQuickLogFor(record);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}

      {quickLogFor ? (
        <QuickLogSheet
          record={quickLogFor}
          saving={saving}
          onSave={handleQuickLog}
          onClose={() => setQuickLogFor(null)}
        />
      ) : null}

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
