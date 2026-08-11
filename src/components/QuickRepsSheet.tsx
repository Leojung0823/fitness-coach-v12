"use client";

import { useState } from "react";
import { t } from "@/lib/strings";

export function QuickRepsSheet({
  current,
  onSelect,
  onClose,
}: {
  current: number;
  onSelect: (value: number) => void;
  onClose: () => void;
}) {
  const [customValue, setCustomValue] = useState(String(current));

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 40,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 560,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, marginBottom: 12 }}>{t.workout.reps}</div>
        <div className="chip-row" style={{ marginBottom: 16 }}>
          {t.quickReps.map((r) => (
            <button
              key={r}
              className={`chip ${current === r ? "selected" : ""}`}
              onClick={() => onSelect(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="custom-reps">自訂次數</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="custom-reps"
              className="input"
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={() => {
                const parsed = Number(customValue);
                if (!Number.isNaN(parsed) && parsed >= 0) onSelect(Math.round(parsed));
              }}
            >
              {t.common.confirm}
            </button>
          </div>
        </div>
        <button className="btn btn-secondary btn-block" onClick={onClose}>
          {t.common.close}
        </button>
      </div>
    </div>
  );
}
