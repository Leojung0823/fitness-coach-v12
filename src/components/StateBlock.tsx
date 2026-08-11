import { t } from "@/lib/strings";

export function LoadingState() {
  return (
    <div className="state-block">
      <div className="spinner" />
      <p>{t.states.loading}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-block">
      <div className="state-icon">⚠️</div>
      <p>{message ?? t.states.errorGeneric}</p>
      {onRetry ? (
        <button className="btn btn-secondary" onClick={onRetry}>
          {t.common.retry}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon = "📋",
  message,
  action,
}: {
  icon?: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state-block">
      <div className="state-icon">{icon}</div>
      <p>{message}</p>
      {action}
    </div>
  );
}
