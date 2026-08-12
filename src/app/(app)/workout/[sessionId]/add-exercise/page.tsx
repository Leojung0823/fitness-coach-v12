"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrg } from "@/lib/OrgContext";
import { t } from "@/lib/strings";
import {
  listMuscleGroups,
  listCategories,
  listEquipmentTypes,
  searchExercises,
  listExercisesByMuscleGroup,
  getRecentExercises,
  createCustomExercise,
  type RecentExercise,
} from "@/lib/repositories/exercises";
import { listExerciseTags } from "@/lib/repositories/exerciseTags";
import { addExercise } from "@/lib/repositories/workoutExercises";
import type {
  Exercise,
  ExerciseWithTags,
  ExerciseTag,
  MuscleGroup,
  ExerciseCategory,
  EquipmentType,
} from "@/lib/repositories/types";
import { toFriendlyMessage } from "@/lib/errors";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateBlock";
import { TagPickerSheet } from "@/components/TagPickerSheet";

export default function AddExercisePage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { organizationId } = useOrg();

  const [search, setSearch] = useState("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentExercise[]>([]);
  const [results, setResults] = useState<ExerciseWithTags[] | null>(null);
  const [allTags, setAllTags] = useState<ExerciseTag[]>([]);
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [groups, recentList, tags] = await Promise.all([
        listMuscleGroups(),
        getRecentExercises(organizationId),
        listExerciseTags(organizationId),
      ]);
      setMuscleGroups(groups);
      setRecent(recentList);
      setAllTags(tags);
    } catch (err) {
      setError(toFriendlyMessage(err));
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        let data: ExerciseWithTags[];
        if (selectedMuscleGroup) {
          data = await listExercisesByMuscleGroup(organizationId, selectedMuscleGroup);
        } else if (search.trim() !== "") {
          data = await searchExercises(organizationId, search);
        } else {
          data = [];
        }
        if (active) setResults(data);
      } catch (err) {
        if (active) setError(toFriendlyMessage(err));
      }
    }

    if (!selectedMuscleGroup && search.trim() === "") {
      setResults(null);
      return;
    }

    // Muscle-group taps are a single deliberate action — run immediately.
    // Free-text search fires on every keystroke, so debounce it to avoid
    // spamming a query per character while the coach is still typing.
    if (selectedMuscleGroup) {
      run();
      return () => {
        active = false;
      };
    }

    const timer = setTimeout(run, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, selectedMuscleGroup, organizationId]);

  async function handleSelect(exerciseId: string) {
    setAdding(exerciseId);
    try {
      await addExercise(organizationId, params.sessionId, exerciseId);
      router.replace(`/workout/${params.sessionId}`);
    } catch (err) {
      setError(toFriendlyMessage(err));
      setAdding(null);
    }
  }

  const browsing = selectedMuscleGroup !== null || search.trim() !== "";

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => router.back()} aria-label={t.common.back}>
          ←
        </button>
        <h1>{t.exercisePicker.title}</h1>
      </header>

      <div className="page-body page-body--no-fab">
        {error ? <div className="banner banner-error">{error}</div> : null}

        <div className="search-box">
          <input
            className="input"
            placeholder={t.exercisePicker.searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedMuscleGroup(null);
            }}
          />
        </div>

        {!browsing ? (
          <>
            <div className="section-title">{t.exercisePicker.byMuscleGroup}</div>
            <div className="chip-row" style={{ marginBottom: 8 }}>
              {muscleGroups
                .filter((g) => !g.parent_id)
                .map((g) => (
                  <button
                    key={g.id}
                    className="chip"
                    onClick={() => setSelectedMuscleGroup(g.id)}
                  >
                    {g.name_zh_tw}
                  </button>
                ))}
            </div>

            {recent.length > 0 ? (
              <>
                <div className="section-title">{t.exercisePicker.recentUsed}</div>
                {recent.map((ex) => (
                  <ExerciseRow key={ex.id} exercise={ex} onSelect={handleSelect} adding={adding === ex.id} />
                ))}
              </>
            ) : null}
          </>
        ) : (
          <>
            {selectedMuscleGroup ? (
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }} onClick={() => setSelectedMuscleGroup(null)}>
                ← {t.exercisePicker.allMuscleGroups}
              </button>
            ) : null}
            {results === null ? <LoadingState /> : null}
            {results && results.length === 0 ? (
              <EmptyState icon="🔍" message={t.exercisePicker.noResults} />
            ) : null}
            {results
              ? results.map((ex) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    onSelect={handleSelect}
                    adding={adding === ex.id}
                    tags={ex.tags}
                    onEditTags={() => setEditingTagsFor(ex.id)}
                  />
                ))
              : null}
          </>
        )}

        <div className="section-title">{t.exercisePicker.createCustom}</div>
        {!showCustomForm ? (
          <button className="btn btn-secondary btn-block" onClick={() => setShowCustomForm(true)}>
            + {t.exercisePicker.createCustom}
          </button>
        ) : (
          <CustomExerciseForm
            organizationId={organizationId}
            onCancel={() => setShowCustomForm(false)}
            onCreated={handleSelect}
          />
        )}
      </div>

      {editingTagsFor
        ? (() => {
            const editingExercise = results?.find((ex) => ex.id === editingTagsFor);
            if (!editingExercise) return null;
            return (
              <TagPickerSheet
                organizationId={organizationId}
                exerciseId={editingTagsFor}
                allTags={allTags}
                appliedTagIds={new Set(editingExercise.tags.map((tg) => tg.id))}
                onTagsChanged={(nextIds) => {
                  setResults((prev) =>
                    prev
                      ? prev.map((ex) =>
                          ex.id !== editingTagsFor
                            ? ex
                            : { ...ex, tags: allTags.filter((tg) => nextIds.has(tg.id)) },
                        )
                      : prev,
                  );
                }}
                onCreateTag={(tag) => setAllTags((prev) => [...prev, tag])}
                onClose={() => setEditingTagsFor(null)}
              />
            );
          })()
        : null}
    </div>
  );
}

function ExerciseRow({
  exercise,
  onSelect,
  adding,
  tags,
  onEditTags,
}: {
  exercise: Exercise;
  onSelect: (id: string) => void;
  adding: boolean;
  /** Omitted for the 最近使用 list — tag editing isn't offered there (V1 scope). */
  tags?: ExerciseTag[];
  onEditTags?: () => void;
}) {
  return (
    <div className="card">
      <button
        className="card-link"
        style={{
          width: "100%",
          textAlign: "left",
          border: "none",
          background: "none",
          padding: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        onClick={() => onSelect(exercise.id)}
        disabled={adding}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{exercise.name_zh_tw}</div>
          {exercise.name_en ? <div className="muted">{exercise.name_en}</div> : null}
        </div>
        {adding ? <div className="spinner" style={{ width: 20, height: 20 }} /> : <span className="muted">+</span>}
      </button>

      {tags ? (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 8 }}>
          {tags.map((tag) => (
            <span key={tag.id} className="chip chip-static">
              {tag.name}
            </span>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={onEditTags} aria-label={t.exercisePicker.editTags}>
            🏷️ {t.exercisePicker.editTags}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CustomExerciseForm({
  organizationId,
  onCancel,
  onCreated,
}: {
  organizationId: string;
  onCancel: () => void;
  onCreated: (exerciseId: string) => void;
}) {
  const [nameZh, setNameZh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [muscleGroupId, setMuscleGroupId] = useState("");
  const [equipmentTypeId, setEquipmentTypeId] = useState("");
  const [categories, setCategories] = useState<ExerciseCategory[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([listCategories(), listMuscleGroups(), listEquipmentTypes()]).then(
      ([c, m, e]) => {
        setCategories(c);
        setMuscleGroups(m);
        setEquipmentTypes(e);
      },
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameZh.trim()) {
      setError(t.exercisePicker.exerciseNameRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const exercise = await createCustomExercise(organizationId, {
        name_zh_tw: nameZh,
        name_en: nameEn || null,
        category_id: categoryId || null,
        primary_muscle_group_id: muscleGroupId || null,
        equipment_type_id: equipmentTypeId || null,
      });
      onCreated(exercise.id);
    } catch (err) {
      setError(toFriendlyMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      {error ? <div className="banner banner-error">{error}</div> : null}
      <div className="field">
        <label htmlFor="name_zh">{t.exercisePicker.exerciseNameZh}</label>
        <input id="name_zh" className="input" value={nameZh} onChange={(e) => setNameZh(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="name_en">
          {t.exercisePicker.exerciseNameEn} <span className="field-hint">{t.common.optional}</span>
        </label>
        <input id="name_en" className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="category">{t.exercisePicker.category}</label>
        <select id="category" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_zh_tw}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="muscle">{t.exercisePicker.primaryMuscleGroup}</label>
        <select id="muscle" className="input" value={muscleGroupId} onChange={(e) => setMuscleGroupId(e.target.value)}>
          <option value="">—</option>
          {muscleGroups.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name_zh_tw}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="equipment">{t.exercisePicker.equipmentType}</label>
        <select
          id="equipment"
          className="input"
          value={equipmentTypeId}
          onChange={(e) => setEquipmentTypeId(e.target.value)}
        >
          <option value="">—</option>
          {equipmentTypes.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.name_zh_tw}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {t.common.cancel}
        </button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
          {submitting ? t.common.loading : t.exercisePicker.createAndAdd}
        </button>
      </div>
    </form>
  );
}
