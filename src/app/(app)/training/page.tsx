"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { t } from "@/lib/strings";
import { useOrg } from "@/lib/OrgContext";
import { listClients, type ClientListItem } from "@/lib/repositories/clients";
import { toFriendlyMessage } from "@/lib/errors";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateBlock";

/**
 * A shortcut, not a second roster. 學員 is the full list — search, archived,
 * add — and opens a client's profile. This one is ordered by who trained most
 * recently and goes straight to their training records, which is what the
 * coach wants when the client is standing in front of them.
 */
export default function TrainingPage() {
  const { organizationId } = useOrg();
  const [clients, setClients] = useState<ClientListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const all = await listClients(organizationId);
      setClients(
        [...all].sort((a, b) => {
          if (!a.last_session_date) return 1;
          if (!b.last_session_date) return -1;
          return a.last_session_date < b.last_session_date ? 1 : -1;
        }),
      );
    } catch (err) {
      setError(toFriendlyMessage(err));
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t.trainingTab.title}</h1>
      </header>

      <div className="page-body">
        <p className="muted">{t.trainingTab.subtitle}</p>

        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {!error && clients === null ? <LoadingState /> : null}
        {!error && clients && clients.length === 0 ? (
          <EmptyState icon="🏋️" message={t.trainingTab.empty} />
        ) : null}

        {(clients ?? []).map((client) => (
          <Link
            key={client.id}
            href={`/clients/${client.id}?tab=training`}
            className="card-link"
          >
            <div className="card session-row">
              <span className="session-row-main">
                <span className="session-row-name">{client.full_name}</span>
                <span className="muted">
                  {client.last_session_date
                    ? `${t.clients.lastSession}：${client.last_session_date.replaceAll("-", "/")}`
                    : t.trainingTab.neverTrained}
                </span>
              </span>
              <span className="muted">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
