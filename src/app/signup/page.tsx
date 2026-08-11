"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { t } from "@/lib/strings";
import { signUp, bootstrapWorkspace } from "@/lib/repositories/auth";
import { toFriendlyMessage } from "@/lib/errors";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError(t.auth.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp(email, password);

      if (!result.session) {
        // Email confirmation required before a session exists.
        setInfo(t.auth.signupSuccessCheckEmail);
        setSubmitting(false);
        return;
      }

      setBootstrapping(true);
      await bootstrapWorkspace();
      router.push("/clients");
      router.refresh();
    } catch (err) {
      setError(toFriendlyMessage(err));
      setSubmitting(false);
      setBootstrapping(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>{t.auth.signupTitle}</h1>
          <p>{t.tagline}</p>
        </div>

        {error ? <div className="banner banner-error">{error}</div> : null}
        {info ? <div className="banner banner-success">{info}</div> : null}

        {bootstrapping ? (
          <div className="state-block">
            <div className="spinner" />
            <p>{t.auth.settingUpWorkspace}</p>
          </div>
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
              {submitting ? t.common.loading : t.auth.signupButton}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link href="/login">{t.auth.goToLogin}</Link>
        </div>
      </div>
    </div>
  );
}
