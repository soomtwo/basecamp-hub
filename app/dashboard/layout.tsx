import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const displayName = profile?.full_name || user.email || "Team Member";

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={displayName} />
      <main className="flex-1 p-8 overflow-auto mt-14 md:mt-0">{children}</main>
    </div>
  );
}
