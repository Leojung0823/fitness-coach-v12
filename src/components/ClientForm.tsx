"use client";

import { useState } from "react";
import { t } from "@/lib/strings";
import type { Client } from "@/lib/repositories/types";

export type ClientFormValues = {
  full_name: string;
  nickname: string;
  gender: string;
  birth_date: string;
  phone: string;
  email: string;
  height_cm: string;
  current_weight_kg: string;
  note: string;
};

export function toFormValues(client?: Client | null): ClientFormValues {
  return {
    full_name: client?.full_name ?? "",
    nickname: client?.nickname ?? "",
    gender: client?.gender ?? "",
    birth_date: client?.birth_date ?? "",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    height_cm: client?.height_cm != null ? String(client.height_cm) : "",
    current_weight_kg: client?.current_weight_kg != null ? String(client.current_weight_kg) : "",
    note: client?.note ?? "",
  };
}

export function toClientPayload(values: ClientFormValues) {
  return {
    full_name: values.full_name.trim(),
    nickname: values.nickname.trim() || null,
    gender: values.gender || null,
    birth_date: values.birth_date || null,
    phone: values.phone.trim() || null,
    email: values.email.trim() || null,
    height_cm: values.height_cm ? Number(values.height_cm) : null,
    current_weight_kg: values.current_weight_kg ? Number(values.current_weight_kg) : null,
    note: values.note.trim() || null,
  };
}

export function ClientForm({
  initial,
  onSubmit,
  submitting,
  submitLabel,
}: {
  initial: ClientFormValues;
  onSubmit: (values: ClientFormValues) => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [values, setValues] = useState(initial);
  const [nameError, setNameError] = useState<string | null>(null);

  function set<K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.full_name.trim()) {
      setNameError(t.clients.fullNameRequired);
      return;
    }
    setNameError(null);
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="full_name">
          {t.clients.fullName} <span className="field-hint">{t.common.required}</span>
        </label>
        <input
          id="full_name"
          className="input"
          value={values.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          required
        />
        {nameError ? <div className="field-error">{nameError}</div> : null}
      </div>

      <div className="field">
        <label htmlFor="nickname">
          {t.clients.nickname} <span className="field-hint">{t.common.optional}</span>
        </label>
        <input
          id="nickname"
          className="input"
          value={values.nickname}
          onChange={(e) => set("nickname", e.target.value)}
        />
      </div>

      <div className="field">
        <label>
          {t.clients.gender} <span className="field-hint">{t.common.optional}</span>
        </label>
        <div className="radio-group">
          {[
            { value: "", label: t.clients.genderUnset },
            { value: "male", label: t.clients.genderMale },
            { value: "female", label: t.clients.genderFemale },
            { value: "other", label: t.clients.genderOther },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`radio-chip ${values.gender === opt.value ? "selected" : ""}`}
              onClick={() => set("gender", opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="birth_date">
          {t.clients.birthDate} <span className="field-hint">{t.common.optional}</span>
        </label>
        <input
          id="birth_date"
          className="input"
          type="date"
          value={values.birth_date}
          onChange={(e) => set("birth_date", e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="phone">
          {t.clients.phone} <span className="field-hint">{t.common.optional}</span>
        </label>
        <input
          id="phone"
          className="input"
          type="tel"
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="email">
          {t.clients.email} <span className="field-hint">{t.common.optional}</span>
        </label>
        <input
          id="email"
          className="input"
          type="email"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="height_cm">
          {t.clients.heightCm} <span className="field-hint">{t.common.optional}</span>
        </label>
        <input
          id="height_cm"
          className="input"
          type="number"
          inputMode="decimal"
          step="0.1"
          value={values.height_cm}
          onChange={(e) => set("height_cm", e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="current_weight_kg">
          {t.clients.weightKg} <span className="field-hint">{t.common.optional}</span>
        </label>
        <input
          id="current_weight_kg"
          className="input"
          type="number"
          inputMode="decimal"
          step="0.1"
          value={values.current_weight_kg}
          onChange={(e) => set("current_weight_kg", e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="note">
          {t.clients.note} <span className="field-hint">{t.common.optional}</span>
        </label>
        <textarea
          id="note"
          className="input"
          value={values.note}
          onChange={(e) => set("note", e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? t.common.loading : submitLabel}
      </button>
    </form>
  );
}
