"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { t } from "@/lib/strings";
import { ExerciseIcon } from "@/components/ExerciseIcon";
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
    return <span className="delta delta-flat">{t.training.firstTime}</span>;
  }
  if (record.weight_delta === 0) {
    return <span className="delta delta-flat">{t.training.same}</span>;
  }
  const up = record.weight_delta > 0;
  return (
    <span className={up ? "delta delta-up" : "delta delta-down"}>
      <span className="delta-arrow" aria-hidden="true">{up ? "↑" : "↓"}</span>
      <span className="delta-value">
        {up ? "+" : "−"}
        {trimWeight(Math.abs(record.weight_delta))}
      </span>
      <span className="delta-unit">{record.weight_unit}</span>
    </span>
  );
}

export function TrainingRecordList({
  clientId,
  records,
}: {
  clientId: string;
  records: TrainingRecord[];
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
      <div className="search-field">
        <span className="search-field-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
        </span>
        <input
          className="input search-input"
          type="search"
          inputMode="search"
          placeholder={t.training.searchPlaceholder}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          aria-label={t.training.searchPlaceholder}
        />
      </div>

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
        <Link
          key={record.exercise_id}
          href={`/clients/${clientId}/exercise/${record.exercise_id}`}
          className="record-card"
          aria-label={`${record.exercise_name_zh_tw}，${trimWeight(record.top_weight)} ${record.weight_unit}，${t.training.setsUnit(record.set_count)}`}
        >
          <ExerciseIcon group={record.muscle_filter_key} />

          <span className="record-identity">
            <span className="record-name">{record.exercise_name_zh_tw}</span>
            <span className="record-date">
              <span className="record-date-icon" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                  <path d="M3.5 9.5h17M8.5 3v3.6M15.5 3v3.6" />
                </svg>
              </span>
              {shortDate(record.last_session_date)}
            </span>
          </span>

          <span className="record-metric">
            <span className="record-metric-label">{t.training.latestWeight}</span>
            <span className="record-metric-value">
              {trimWeight(record.top_weight)}
              <span className="record-metric-unit">{record.weight_unit}</span>
            </span>
          </span>

          <span className="record-metric record-metric-divided">
            <span className="record-metric-label">{t.training.setCount}</span>
            <span className="record-metric-value">
              {record.set_count}
              <span className="record-metric-unit">組</span>
            </span>
          </span>

          <span className="record-metric record-metric-divided">
            <span className="record-metric-label">{t.training.versusLast}</span>
            <Delta record={record} />
          </span>
        </Link>
      ))}
    </div>
  );
}
