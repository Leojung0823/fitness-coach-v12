"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/strings";
import { useOrg } from "@/lib/OrgContext";
import { getCurrentUser, signOut } from "@/lib/repositories/auth";
import { toFriendlyMessage } from "@/lib/errors";

export default function AccountPage() {
  const router = useRouter();
  const { organizationName, displayName } = useOrg();
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (active) setEmail(user?.email ?? "");
      })
      .catch(() => {
        // The page is still useful without it; the layout already proved
        // there is a session.
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      setError(toFriendlyMessage(err));
      setSigningOut(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t.account.title}</h1>
      </header>

      <div className="page-body">
        {error ? <div className="banner banner-error">{error}</div> : null}

        <div className="card">
          <div className="account-rows">
            {displayName ? (
              <div className="account-row">
                <span className="account-row-label">{t.clients.fullName}</span>
                <span className="account-row-value">{displayName}</span>
              </div>
            ) : null}
            <div className="account-row">
              <span className="account-row-label">{t.account.workspace}</span>
              <span className="account-row-value">{organizationName}</span>
            </div>
            {email ? (
              <div className="account-row">
                <span className="account-row-label">{t.account.email}</span>
                <span className="account-row-value">{email}</span>
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-block"
          style={{ marginTop: 12 }}
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? t.common.loading : t.account.signOut}
        </button>
      </div>
    </div>
  );
}
