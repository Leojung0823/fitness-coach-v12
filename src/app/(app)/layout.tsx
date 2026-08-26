import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrgProvider } from "@/lib/OrgContext";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let organizationId: string | null = membership?.organization_id ?? null;

  if (!organizationId) {
    // Bootstrap RPC is idempotent — this only does real work the first time
    // a user reaches an app page without having completed it yet (e.g. a
    // dropped network request right after signup).
    const { data: bootstrapRows } = await supabase.rpc("bootstrap_coach_workspace");
    organizationId = bootstrapRows?.[0]?.org_id ?? null;
  }

  if (!organizationId) {
    redirect("/login");
  }

  const [{ data: organization }, { data: profile }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <OrgProvider
      value={{
        organizationId,
        organizationName: organization?.name ?? "",
        userId: user.id,
        displayName: profile?.display_name ?? "",
      }}
    >
      {children}
      <BottomNav />
    </OrgProvider>
  );
}
