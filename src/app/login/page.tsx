"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { t } from "@/lib/strings";
import { signIn } from "@/lib/repositories/auth";
import { toFriendlyMessage } from "@/lib/errors";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // /auth/callback sends people here when a mailed link cannot be turned into
  // a session, so the reason is visible on the page they land on.
  const linkInvalid = searchParams.get("error") === "link_invalid";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      const redirectTo = searchParams.get("redirectTo");
      router.push(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/clients");
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
          <h1>{t.appName}</h1>
          <p>{t.tagline}</p>
        </div>

        {linkInvalid ? <div className="banner banner-error">{t.auth.resetLinkInvalid}</div> : null}
        {error ? <div className="banner banner-error">{error}</div> : null}

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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? t.common.loading : t.auth.loginButton}
          </button>
        </form>

        <div className="auth-footer">
          <Link href="/forgot-password">{t.auth.forgotPasswordLink}</Link>
        </div>
        <div className="auth-footer">
          <Link href="/signup">{t.auth.goToSignup}</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
