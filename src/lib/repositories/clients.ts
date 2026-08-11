import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { RepositoryError, type Client, type ClientInsert, type ClientUpdate } from "./types";

/** ClientRepository (PRD §17). */

export type ClientListItem = Client & {
  last_session_date: string | null;
  session_count: number;
};

type ClientRow = Client & {
  workout_sessions: { session_date: string; status: string }[];
};

export async function listClients(
  organizationId: string,
  options: { includeArchived?: boolean; search?: string } = {},
): Promise<ClientListItem[]> {
  const supabase = createSupabaseClient();
  let query = supabase
    .from("clients")
    .select("*, workout_sessions(session_date, status)")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true });

  if (!options.includeArchived) {
    query = query.eq("status", "active");
  }
  if (options.search && options.search.trim() !== "") {
    const term = options.search.trim();
    query = query.or(`full_name.ilike.%${term}%,nickname.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new RepositoryError(error.message, error);

  return ((data ?? []) as unknown as ClientRow[]).map((row) => {
    const { workout_sessions: sessions, ...client } = row;
    const completed = sessions.filter((s) => s.status !== "cancelled");
    const lastDate = completed.reduce<string | null>((latest, s) => {
      if (!latest || s.session_date > latest) return s.session_date;
      return latest;
    }, null);
    return {
      ...client,
      last_session_date: lastDate,
      session_count: completed.length,
    };
  });
}

export async function getClient(clientId: string): Promise<Client | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (error) throw new RepositoryError(error.message, error);
  return data;
}

export async function createClient(organizationId: string, input: Partial<ClientInsert>) {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload: ClientInsert = {
    ...input,
    organization_id: organizationId,
    full_name: input.full_name?.trim() ?? "",
    created_by: user?.id ?? null,
  };

  const { data, error } = await supabase.from("clients").insert(payload).select("*").single();
  if (error) throw new RepositoryError(error.message, error);
  return data as Client;
}

export async function updateClient(clientId: string, input: ClientUpdate) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .update(input)
    .eq("id", clientId)
    .select("*")
    .single();
  if (error) throw new RepositoryError(error.message, error);
  return data as Client;
}

export async function archiveClient(clientId: string, archived: boolean) {
  return updateClient(clientId, { status: archived ? "archived" : "active" });
}
