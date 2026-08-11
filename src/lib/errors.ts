import { t } from "@/lib/strings";

/**
 * Never show a raw database/auth error to the user (PRD §19). Map the small
 * set of errors we expect, fall back to a generic message for everything
 * else.
 */
export function toFriendlyMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (/invalid login credentials/i.test(raw)) return t.auth.invalidCredentials;
  if (/user already registered/i.test(raw)) return "此 Email 已註冊過，請直接登入。";
  if (/password should be at least/i.test(raw)) return "密碼長度不足，請至少輸入 6 個字元。";
  if (/rate limit/i.test(raw)) return "操作過於頻繁，請稍後再試。";
  if (/network|fetch failed|failed to fetch/i.test(raw)) return "網路連線異常，請檢查網路後重試。";

  return t.common.unknownError;
}
