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

  let canManage = false;
  if (profile?.position) {
    const { data: pos } = await supabase
      .from("positions")
      .select("sort_order")
      .eq("title", profile.position)
      .single() as any;
    // 3=Shift Supervisor, 4=ASM, 5=Store Manager, 6=District Manager, 7=Regional Manager
    canManage = [3, 4, 5, 6, 7].includes(pos?.sort_order ?? 0);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={displayName} canManage={canManage} />
      <main className="flex-1 p-8 overflow-auto mt-14 md:mt-0">{children}</main>
    </div>
  );
}
