import { createClient } from "@/lib/supabase/client";
import { RepositoryError } from "./types";

/**
 * AuthRepository (PRD §17). Thin wrapper over Supabase Auth so components
 * never call supabase-js directly.
 */

export async function signUp(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new RepositoryError(error.message, error);
  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new RepositoryError(error.message, error);
  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new RepositoryError(error.message, error);
}

export async function resetPassword(email: string) {
  const supabase = createClient();
  // Sent to /auth/callback rather than straight to /reset-password: the link
  // carries either a PKCE code or a token hash, and both have to be turned
  // into a session on the server before the form is worth showing.
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`
      : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new RepositoryError(error.message, error);
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new RepositoryError(error.message, error);
}

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw new RepositoryError(error.message, error);
  return user;
}

/**
 * Atomic, idempotent signup bootstrap (PRD §6.1). Must be called once right
 * after signup succeeds; safe to call again on retry.
 */
export async function bootstrapWorkspace() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("bootstrap_coach_workspace");
  if (error) throw new RepositoryError(error.message, error);
  const row = data?.[0];
  if (!row) throw new RepositoryError("Bootstrap did not return a workspace.");
  return { organizationId: row.org_id, organizationName: row.org_name, role: row.member_role };
}
