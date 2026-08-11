"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/lib/OrgContext";
import { t } from "@/lib/strings";
import { createClient } from "@/lib/repositories/clients";
import { toFriendlyMessage } from "@/lib/errors";
import { ClientForm, toClientPayload, toFormValues } from "@/components/ClientForm";

export default function NewClientPage() {
  const router = useRouter();
  const { organizationId } = useOrg();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: ReturnType<typeof toFormValues>) {
    setSubmitting(true);
    setError(null);
    try {
      const client = await createClient(organizationId, toClientPayload(values));
      router.push(`/clients/${client.id}`);
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
        <h1>{t.clients.newClientTitle}</h1>
      </header>
      <div className="page-body page-body--no-fab">
        {error ? <div className="banner banner-error">{error}</div> : null}
        <ClientForm
          initial={toFormValues(null)}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={t.clients.saveClient}
        />
      </div>
    </div>
  );
}
