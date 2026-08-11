import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { RepositoryError, type Organization } from "./types";

/** OrganizationRepository (PRD §17). */

export async function getCurrentOrganization(): Promise<Organization | null> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membershipError) throw new RepositoryError(membershipError.message, membershipError);
  if (!membership) return null;

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .maybeSingle();
  if (orgError) throw new RepositoryError(orgError.message, orgError);
  return organization;
}

export async function getOrganizationMembers(organizationId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organizationId);
  if (error) throw new RepositoryError(error.message, error);
  return data ?? [];
}
