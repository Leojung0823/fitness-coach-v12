"use client";

import { useState } from "react";
import Link from "next/link";
import { t } from "@/lib/strings";
import { resetPassword } from "@/lib/repositories/auth";
import { toFriendlyMessage } from "@/lib/errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(toFriendlyMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>{t.auth.forgotPasswordTitle}</h1>
        </div>

        {error ? <div className="banner banner-error">{error}</div> : null}

        {sent ? (
          <div className="banner banner-success">{t.auth.resetLinkSent}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">{t.auth.email}</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? t.common.loading : t.auth.sendResetLink}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link href="/login">{t.auth.backToLogin}</Link>
        </div>
      </div>
    </div>
  );
}
