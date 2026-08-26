"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { t } from "@/lib/strings";
import type { TrainingRecord } from "@/lib/repositories/types";

const FILTERS = [
  { key: "all", label: t.training.filters.all },
  { key: "chest", label: t.training.filters.chest },
  { key: "back", label: t.training.filters.back },
  { key: "legs", label: t.training.filters.legs },
  { key: "shoulders", label: t.training.filters.shoulders },
  { key: "arms", label: t.training.filters.arms },
  { key: "core", label: t.training.filters.core },
] as const;

function daysBetween(dateStr: string) {
  const then = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

function shortDate(dateStr: string) {
  return dateStr.slice(5).replace("-", "/");
}

/** Trailing zeros read as false precision on a number this large on screen. */
function trimWeight(value: number) {
  return Number(value).toString();
}

function Delta({ record }: { record: TrainingRecord }) {
  if (record.weight_delta === null) {
    return <span className="delta delta-first">{t.training.firstTime}</span>;
  }
  if (record.weight_delta === 0) {
    return <span className="delta delta-same">{t.training.same}</span>;
  }
  const up = record.weight_delta > 0;
  return (
    <span className={up ? "delta delta-up" : "delta delta-down"}>
      <span aria-hidden="true">{up ? "↑" : "↓"}</span> {up ? "+" : "−"}
      {trimWeight(Math.abs(record.weight_delta))}
      <span className="delta-unit"> {record.weight_unit}</span>
    </span>
  );
}

export function TrainingRecordList({
  clientId,
  records,
  onQuickLog,
}: {
  clientId: string;
  records: TrainingRecord[];
  onQuickLog: (record: TrainingRecord) => void;
}) {
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return records.filter((record) => {
      if (filter !== "all" && record.muscle_filter_key !== filter) return false;
      if (!needle) return true;
      return (
        record.exercise_name_zh_tw.toLowerCase().includes(needle) ||
        (record.exercise_name_en ?? "").toLowerCase().includes(needle)
      );
    });
  }, [records, term, filter]);

  // Only offer a filter the client has actually trained, so the row never
  // leads to an empty list.
  const availableFilters = useMemo(() => {
    const present = new Set(records.map((record) => record.muscle_filter_key));
    return FILTERS.filter((entry) => entry.key === "all" || present.has(entry.key));
  }, [records]);

  return (
    <div className="training-list">
      <input
        className="input search-input"
        type="search"
        inputMode="search"
        placeholder={t.training.searchPlaceholder}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        aria-label={t.training.searchPlaceholder}
      />

      {availableFilters.length > 2 ? (
        <div className="filter-row" role="group" aria-label={t.training.filters.all}>
          {availableFilters.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={`radio-chip ${filter === entry.key ? "selected" : ""}`}
              aria-pressed={filter === entry.key}
              onClick={() => setFilter(entry.key)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="muted training-empty">{t.training.noSearchResult(term.trim())}</p>
      ) : null}

      {visible.map((record) => (
        <div key={record.exercise_id} className="record-card">
          <Link
            href={`/clients/${clientId}/exercise/${record.exercise_id}`}
            className="record-main"
            aria-label={`${record.exercise_name_zh_tw}，${trimWeight(record.top_weight)} ${record.weight_unit}，${t.training.setsUnit(record.set_count)}`}
          >
            <span className="record-identity">
              <span className="record-name">{record.exercise_name_zh_tw}</span>
              {/* Relative time answers the question the coach actually has --
                  "how long since we trained this" -- which 08/25 does not. */}
              <span className="record-date">
                {t.training.daysAgo(daysBetween(record.last_session_date))} ·{" "}
                {shortDate(record.last_session_date)}
              </span>
            </span>

            <span className="record-weight">
              <span className="record-weight-value">{trimWeight(record.top_weight)}</span>
              <span className="record-weight-unit">{record.weight_unit}</span>
            </span>

            <span className="record-sets">{t.training.setsUnit(record.set_count)}</span>

            <Delta record={record} />
          </Link>

          <button
            type="button"
            className="record-add"
            onClick={() => onQuickLog(record)}
            aria-label={t.training.quickLogTitle(record.exercise_name_zh_tw)}
          >
            ＋
          </button>
        </div>
      ))}
    </div>
  );
}
