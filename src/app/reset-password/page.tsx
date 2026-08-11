"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/strings";
import { updatePassword } from "@/lib/repositories/auth";
import { toFriendlyMessage } from "@/lib/errors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t.auth.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      router.push("/clients");
      router.refresh();
    } catch (err) {
      setError(toFriendlyMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>設定新密碼</h1>
        </div>

        {error ? <div className="banner banner-error">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="password">{t.auth.password}</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">{t.auth.confirmPassword}</label>
            <input
              id="confirmPassword"
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? t.common.loading : t.common.save}
          </button>
        </form>
      </div>
    </div>
  );
}
