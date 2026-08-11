"use client";

import { useEffect } from "react";

/** Small ephemeral toast, used for the "已自動儲存" / save-failed indicator. */
export function Toast({
  message,
  tone = "default",
  onDismiss,
  durationMs = 2200,
}: {
  message: string;
  tone?: "default" | "error";
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    const id = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(id);
  }, [onDismiss, durationMs]);

  return (
    <div
      className="toast"
      style={tone === "error" ? { background: "var(--danger)" } : undefined}
      role="status"
    >
      {message}
    </div>
  );
}
