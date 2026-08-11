"use client";

import { useState } from "react";
import { t } from "@/lib/strings";

const QUICK_WEIGHTS = [0, 2.5, 5, 7.5, 10, 12.5, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100];

export function QuickWeightSheet({
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
        <div style={{ fontWeight: 700, marginBottom: 12 }}>{t.workout.weight}</div>
        <div className="chip-row" style={{ marginBottom: 16 }}>
          {QUICK_WEIGHTS.map((w) => (
            <button
              key={w}
              className={`chip ${current === w ? "selected" : ""}`}
              onClick={() => onSelect(w)}
            >
              {w}
            </button>
          ))}
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="custom-weight">自訂重量（{t.common.kg}）</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="custom-weight"
              className="input"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={() => {
                const parsed = Number(customValue);
                if (!Number.isNaN(parsed) && parsed >= 0) onSelect(parsed);
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
