"use client";

import { useState } from "react";
import { t } from "@/lib/strings";
import type { TrainingRecord } from "@/lib/repositories/types";

function todayIso() {
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  return new Date(now.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 10);
}

/**
 * The whole point of this sheet is the coach's hands: one thumb, mid-set,
 * between two exercises. So it opens with last time's numbers one tap away,
 * steppers instead of a keyboard for the common ±2.5 kg adjustment, and a
 * single button to finish.
 */
export function QuickLogSheet({
  record,
  saving,
  onSave,
  onClose,
}: {
  record: TrainingRecord;
  saving: boolean;
  onSave: (input: { weight: number; setCount: number; sessionDate: string }) => void;
  onClose: () => void;
}) {
  const [weight, setWeight] = useState<number>(record.top_weight);
  const [setCount, setSetCount] = useState<number>(record.set_count);
  const [sessionDate, setSessionDate] = useState<string>(todayIso());

  const reuse = () => {
    setWeight(record.top_weight);
    setSetCount(record.set_count);
  };

  const step = (delta: number) =>
    setWeight((current) => Math.min(9999, Math.max(0, Math.round((current + delta) * 100) / 100)));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.training.quickLogTitle(record.exercise_name_zh_tw)}
      className="sheet-backdrop"
      onClick={onClose}
    >
      <div className="card sheet-panel" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 className="sheet-title">{t.training.quickLogTitle(record.exercise_name_zh_tw)}</h2>

        <button type="button" className="reuse-row" onClick={reuse}>
          <span className="reuse-label">{t.training.reuseLast}</span>
          <span className="reuse-detail">
            {t.training.reuseLastDetail(record.top_weight, record.weight_unit, record.set_count)}
          </span>
        </button>

        <div className="field">
          <label className="label" htmlFor="quick-weight">
            {t.training.weightLabel}
          </label>
          <div className="stepper-row">
            <button type="button" className="stepper-btn" onClick={() => step(-2.5)} aria-label="減少 2.5">
              −
            </button>
            <input
              id="quick-weight"
              className="input stepper-value"
              type="number"
              inputMode="decimal"
              min={0}
              max={9999}
              step={0.5}
              value={weight}
              onChange={(event) => setWeight(Number(event.target.value))}
            />
            <button type="button" className="stepper-btn" onClick={() => step(2.5)} aria-label="增加 2.5">
              ＋
            </button>
            <span className="stepper-unit">{record.weight_unit}</span>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="quick-sets">
            {t.training.setCountLabel}
          </label>
          <div className="chip-row" role="group" aria-labelledby="quick-sets">
            {[1, 2, 3, 4, 5, 6].map((count) => (
              <button
                key={count}
                type="button"
                className={`radio-chip ${setCount === count ? "selected" : ""}`}
                aria-pressed={setCount === count}
                onClick={() => setSetCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="quick-date">
            {t.training.dateLabel}
          </label>
          <input
            id="quick-date"
            className="input"
            type="date"
            value={sessionDate}
            max={todayIso()}
            onChange={(event) => setSessionDate(event.target.value)}
          />
        </div>

        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            {t.common.cancel}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => onSave({ weight, setCount, sessionDate })}
          >
            {saving ? t.common.loading : t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
