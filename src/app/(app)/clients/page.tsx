"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrg } from "@/lib/OrgContext";
import { t } from "@/lib/strings";
import { listClients, type ClientListItem } from "@/lib/repositories/clients";
import { toFriendlyMessage } from "@/lib/errors";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateBlock";

function formatDate(dateStr: string | null) {
  if (!dateStr) return t.clients.neverTrained;
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ClientsPage() {
  const { organizationId } = useOrg();
  const router = useRouter();
  const [clients, setClients] = useState<ClientListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listClients(organizationId, {
        includeArchived: showArchived,
        search,
      });
      setClients(data);
    } catch (err) {
      setError(toFriendlyMessage(err));
    }
  }, [organizationId, showArchived, search]);

  useEffect(() => {
    setClients(null);
    load();
  }, [load]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t.clients.listTitle}</h1>
      </header>

      <div className="page-body">
        <div className="search-box">
          <input
            className="input"
            placeholder={t.clients.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label
          className="muted"
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
        >
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
          {t.clients.showArchived}
        </label>

        {clients === null && !error ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={load} /> : null}

        {clients && clients.length === 0 ? (
          <EmptyState
            icon="🧑‍🤝‍🧑"
            message={t.clients.empty}
            action={
              <Link href="/clients/new" className="btn btn-primary">
                {t.clients.addClient}
              </Link>
            }
          />
        ) : null}

        {clients && clients.length > 0
          ? clients.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`} className="card-link">
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>
                        {client.full_name}
                        {client.nickname ? (
                          <span className="muted" style={{ marginLeft: 6 }}>
                            ({client.nickname})
                          </span>
                        ) : null}
                      </div>
                      <div className="muted" style={{ marginTop: 4 }}>
                        {t.clients.lastSession}：{formatDate(client.last_session_date)}
                      </div>
                      <div className="muted">{t.clients.sessionCount(client.session_count)}</div>
                    </div>
                    {client.status === "archived" ? (
                      <span className="badge badge-archived">{t.clients.archived}</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))
          : null}
      </div>

      <button
        className="fab"
        aria-label={t.clients.addClient}
        onClick={() => router.push("/clients/new")}
      >
        +
      </button>
    </div>
  );
}
