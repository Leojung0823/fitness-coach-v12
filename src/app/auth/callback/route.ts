import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * The landing point for every link Supabase mails out (password recovery,
 * email confirmation, magic link).
 *
 * Two link shapes arrive here and they are not interchangeable:
 *
 * - `?token_hash=…&type=…` — verified with `verifyOtp`. This works on **any**
 *   device, because the whole secret is in the link.
 * - `?code=…` — the PKCE authorization code, exchanged for a session. This
 *   only works in the browser that started the flow, because the matching code
 *   verifier lives in that browser's cookies and nowhere else.
 *
 * `@supabase/ssr` forces `flowType: "pkce"`, so a default Supabase email
 * template produces the second shape — which means "request a reset on the
 * laptop, open the mail on the phone" cannot work. Getting the first shape
 * requires pointing the email template at this route with `{{ .TokenHash }}`
 * (see README "信件連結設定"). Both are handled so the fix does not depend on
 * the template change landing first.
 */

// verifyOtp accepts several types; only the ones that can legitimately arrive
// by email are honoured, so a crafted link cannot ask for something else.
const EMAIL_OTP_TYPES: readonly EmailOtpType[] = ["recovery", "signup", "invite", "magiclink", "email_change"];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (EMAIL_OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Only a path on this site. A link is an untrusted input, and `next` decides
 * where the browser lands *after* a session exists — an open redirect here
 * would hand a freshly authenticated visitor to someone else's page.
 */
function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/clients";
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  // Expired, already used, or opened in a browser that never asked for it.
  // The reason is deliberately not echoed back: it is not actionable, and the
  // only useful next step is to request a fresh link.
  return NextResponse.redirect(new URL("/login?error=link_invalid", origin));
}
