"use client";

import { useState } from "react";
import { t } from "@/lib/strings";
import type { ExerciseTag } from "@/lib/repositories/types";
import {
  createExerciseTag,
  addExerciseTagLink,
  removeExerciseTagLink,
} from "@/lib/repositories/exerciseTags";
import { toFriendlyMessage } from "@/lib/errors";

export function TagPickerSheet({
  organizationId,
  exerciseId,
  allTags,
  appliedTagIds,
  onTagsChanged,
  onCreateTag,
  onClose,
}: {
  organizationId: string;
  exerciseId: string;
  allTags: ExerciseTag[];
  appliedTagIds: Set<string>;
  /** Called after a toggle succeeds, with the new applied-tag id set. */
  onTagsChanged: (nextAppliedTagIds: Set<string>) => void;
  /** Called after a new custom tag is created, so the caller can add it to its tag list. */
  onCreateTag: (tag: ExerciseTag) => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(tag: ExerciseTag) {
    setError(null);
    setPending(tag.id);
    const applied = appliedTagIds.has(tag.id);
    try {
      if (applied) {
        await removeExerciseTagLink(exerciseId, tag.id);
        const next = new Set(appliedTagIds);
        next.delete(tag.id);
        onTagsChanged(next);
      } else {
        await addExerciseTagLink(organizationId, exerciseId, tag.id);
        onTagsChanged(new Set(appliedTagIds).add(tag.id));
      }
    } catch (err) {
      setError(toFriendlyMessage(err));
    } finally {
      setPending(null);
    }
  }

  async function handleCreateTag() {
    if (newTagName.trim() === "") return;
    setError(null);
    setCreating(true);
    try {
      const tag = await createExerciseTag(organizationId, newTagName);
      onCreateTag(tag);
      await addExerciseTagLink(organizationId, exerciseId, tag.id);
      onTagsChanged(new Set(appliedTagIds).add(tag.id));
      setNewTagName("");
    } catch (err) {
      setError(toFriendlyMessage(err));
    } finally {
      setCreating(false);
    }
  }

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
        <div style={{ fontWeight: 700, marginBottom: 12 }}>{t.exercisePicker.tags}</div>

        {error ? <div className="banner banner-error" style={{ marginBottom: 12 }}>{error}</div> : null}

        <div className="chip-row" style={{ marginBottom: 16 }}>
          {allTags.map((tag) => (
            <button
              key={tag.id}
              className={`chip ${appliedTagIds.has(tag.id) ? "selected" : ""}`}
              onClick={() => handleToggle(tag)}
              disabled={pending === tag.id}
            >
              {tag.name}
            </button>
          ))}
        </div>

        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="new-tag-name">{t.exercisePicker.createTag}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="new-tag-name"
              className="input"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder={t.exercisePicker.newTagPlaceholder}
            />
            <button className="btn btn-primary" onClick={handleCreateTag} disabled={creating}>
              {creating ? t.common.loading : t.common.add}
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
