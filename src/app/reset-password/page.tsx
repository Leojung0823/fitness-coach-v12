"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { t } from "@/lib/strings";
import { updatePassword } from "@/lib/repositories/auth";
import { createClient } from "@/lib/supabase/client";
import { toFriendlyMessage } from "@/lib/errors";

/**
 * Reached from a recovery link, which /auth/callback has already turned into a
 * session. Without that session `updateUser` cannot work, so the form is only
 * offered once the session is confirmed — otherwise someone types a new
 * password twice and only then learns the link was no good.
 */
type LinkState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    // getUser rather than getSession: it asks the auth server whether this
    // session is real, so an expired or revoked recovery session is reported
    // as invalid here instead of failing on submit.
    supabase.auth
      .getUser()
      .then(({ data, error: userError }) => {
        if (cancelled) return;
        setLinkState(!userError && data.user ? "ready" : "invalid");
      })
      .catch(() => {
        if (!cancelled) setLinkState("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

        {linkState === "checking" ? <p className="muted">{t.auth.checkingResetLink}</p> : null}

        {linkState === "invalid" ? (
          <>
            <div className="banner banner-error">{t.auth.resetLinkInvalid}</div>
            <p className="muted">{t.auth.resetLinkInvalidHint}</p>
            <Link href="/forgot-password" className="btn btn-primary btn-block">
              {t.auth.requestNewResetLink}
            </Link>
            <div className="auth-footer">
              <Link href="/login">{t.auth.backToLogin}</Link>
            </div>
          </>
        ) : null}

        {linkState === "ready" ? (
          <>
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
          </>
        ) : null}
      </div>
    </div>
  );
}
