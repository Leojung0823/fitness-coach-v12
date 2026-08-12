"use client";

import { useState } from "react";
import { t } from "@/lib/strings";
import type { WorkoutSet } from "@/lib/repositories/types";
import { QuickWeightSheet } from "./QuickWeightSheet";
import { QuickRepsSheet } from "./QuickRepsSheet";

export function SetRow({
  set,
  onChangeWeight,
  onChangeReps,
  onToggleComplete,
  onDelete,
}: {
  set: WorkoutSet;
  onChangeWeight: (value: number) => void;
  onChangeReps: (value: number) => void;
  onToggleComplete: (completed: boolean) => void;
  onDelete: () => void;
}) {
  const [weightPickerOpen, setWeightPickerOpen] = useState(false);
  const [repsPickerOpen, setRepsPickerOpen] = useState(false);
  const reps = set.reps ?? 0;
  const locked = set.is_completed;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 0",
        borderTop: "1px solid var(--border)",
        flexWrap: "wrap",
      }}
    >
      <span className="set-label">{t.workout.setNumber(set.set_number)}</span>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, flexWrap: "wrap" }}>
        <div className="stepper">
          <button
            className="stepper-btn"
            aria-label="減少 2.5 公斤"
            onClick={() => onChangeWeight(Math.max(0, set.weight_value - 2.5))}
            disabled={locked}
          >
            −
          </button>
          <button
            className="stepper-value"
            style={{ cursor: locked ? "default" : "pointer" }}
            onClick={() => !locked && setWeightPickerOpen(true)}
            disabled={locked}
          >
            {set.weight_value}
            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-tertiary)" }}> kg</span>
          </button>
          <button
            className="stepper-btn"
            aria-label="增加 2.5 公斤"
            onClick={() => onChangeWeight(set.weight_value + 2.5)}
            disabled={locked}
          >
            +
          </button>
        </div>

        <div className="stepper">
          <button
            className="stepper-btn"
            aria-label="減少 1 次"
            onClick={() => onChangeReps(Math.max(0, reps - 1))}
            disabled={locked}
          >
            −
          </button>
          <button
            className="stepper-value"
            style={{ cursor: locked ? "default" : "pointer" }}
            onClick={() => !locked && setRepsPickerOpen(true)}
            disabled={locked}
          >
            {reps}
            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-tertiary)" }}> 次</span>
          </button>
          <button
            className="stepper-btn"
            aria-label="增加 1 次"
            onClick={() => onChangeReps(reps + 1)}
            disabled={locked}
          >
            +
          </button>
        </div>
      </div>

      <div className="set-complete-group">
        <span className="set-complete-label">
          {locked ? t.workout.markIncomplete : t.workout.markComplete}
        </span>
        <button
          className={`set-complete-btn ${locked ? "done" : ""}`}
          aria-label={locked ? t.workout.markIncomplete : t.workout.markComplete}
          onClick={() => onToggleComplete(!locked)}
        >
          {locked ? "✓" : ""}
        </button>
      </div>

      {!locked ? (
        <button className="set-delete-btn" aria-label={t.workout.deleteSet} onClick={onDelete}>
          ✕
        </button>
      ) : (
        <span style={{ width: 40, flexShrink: 0 }} />
      )}

      {weightPickerOpen ? (
        <QuickWeightSheet
          current={set.weight_value}
          onSelect={(value) => {
            onChangeWeight(value);
            setWeightPickerOpen(false);
          }}
          onClose={() => setWeightPickerOpen(false)}
        />
      ) : null}

      {repsPickerOpen ? (
        <QuickRepsSheet
          current={reps}
          onSelect={(value) => {
            onChangeReps(value);
            setRepsPickerOpen(false);
          }}
          onClose={() => setRepsPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}
