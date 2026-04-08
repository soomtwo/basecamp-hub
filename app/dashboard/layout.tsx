import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, position")
    .eq("id", user.id)
    .single() as any;

  const displayName = profile?.full_name || user.email || "Team Member";

  // Look up sort_order for this position to determine manage access
  let canManage = false;
  if (profile?.position) {
    const { data: pos } = await supabase
      .from("positions")
      .select("sort_order")
      .eq("id", profile.position)
      .single() as any;
    // sort_order 2, 3, 4 = Senior/Lead Barista, Shift Supervisor, Assistant Store Manager
    canManage = [2, 3, 4].includes(pos?.sort_order ?? 0);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={displayName} canManage={canManage} />
      <main className="flex-1 p-8 overflow-auto mt-14 md:mt-0">{children}</main>
    </div>
  );
}
