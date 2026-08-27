"use client";

import { useMemo, useState } from "react";
import { t } from "@/lib/strings";
import { ExerciseIcon } from "@/components/ExerciseIcon";
import type { TrainingRecord } from "@/lib/repositories/types";

/**
 * The step between the header's ＋ and the numbers: which exercise. Only
 * exercises this client has already done are offered, because the whole point
 * of logging from here is "same as last time, adjusted" — a brand new exercise
 * has nothing to carry over and belongs in the session flow.
 */
export function QuickLogPicker({
  records,
  onSelect,
  onClose,
}: {
  records: TrainingRecord[];
  onSelect: (record: TrainingRecord) => void;
  onClose: () => void;
}) {
  const [term, setTerm] = useState("");

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return records;
    return records.filter(
      (record) =>
        record.exercise_name_zh_tw.toLowerCase().includes(needle) ||
        (record.exercise_name_en ?? "").toLowerCase().includes(needle),
    );
  }, [records, term]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.training.pickExercise}
      className="sheet-backdrop"
      onClick={onClose}
    >
      <div className="card sheet-panel" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 className="sheet-title">{t.training.pickExercise}</h2>

        <input
          className="input"
          type="search"
          placeholder={t.training.searchPlaceholder}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          aria-label={t.training.searchPlaceholder}
        />

        <div className="picker-list">
          {visible.length === 0 ? (
            <p className="hint-text">{t.training.noSearchResult(term.trim())}</p>
          ) : null}

          {visible.map((record) => (
            <button
              key={record.exercise_id}
              type="button"
              className="picker-row"
              onClick={() => onSelect(record)}
            >
              <ExerciseIcon group={record.muscle_filter_key} />
              <span className="picker-row-name">{record.exercise_name_zh_tw}</span>
              <span className="picker-row-last">
                {record.top_weight} {record.weight_unit} × {record.set_count}
              </span>
            </button>
          ))}
        </div>

        <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}
