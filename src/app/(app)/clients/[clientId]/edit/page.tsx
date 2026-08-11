"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { t } from "@/lib/strings";
import { getClient, updateClient } from "@/lib/repositories/clients";
import type { Client } from "@/lib/repositories/types";
import { toFriendlyMessage } from "@/lib/errors";
import { LoadingState, ErrorState } from "@/components/StateBlock";
import { ClientForm, toClientPayload, toFormValues } from "@/components/ClientForm";

export default function EditClientPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const c = await getClient(params.clientId);
      setClient(c);
    } catch (err) {
      setError(toFriendlyMessage(err));
    }
  }, [params.clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(values: ReturnType<typeof toFormValues>) {
    setSubmitting(true);
    setError(null);
    try {
      await updateClient(params.clientId, toClientPayload(values));
      router.push(`/clients/${params.clientId}`);
    } catch (err) {
      setError(toFriendlyMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => router.back()} aria-label={t.common.back}>
          ←
        </button>
        <h1>{t.clients.editClientTitle}</h1>
      </header>
      <div className="page-body page-body--no-fab">
        {error ? <div className="banner banner-error">{error}</div> : null}
        {client === undefined ? <LoadingState /> : null}
        {client === null && !error ? <ErrorState message="找不到這位學員。" /> : null}
        {client ? (
          <ClientForm
            initial={toFormValues(client)}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitLabel={t.common.save}
          />
        ) : null}
      </div>
    </div>
  );
}
