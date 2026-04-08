import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ManageTabs from "@/components/ManageTabs";

export default async function ManagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("position, location_id")
    .eq("id", user.id)
    .single() as any;

  if (!profile?.position) redirect("/dashboard");

  const { data: pos } = await supabase
    .from("positions")
    .select("sort_order")
    .eq("title", profile.position)
    .single() as any;

  const sortOrder = pos?.sort_order ?? 0;
  if (![3, 4, 5, 6, 7].includes(sortOrder)) redirect("/dashboard");

  // District/Regional managers see all locations; others see only their own
  let locations: any[] = [];
  if ([6, 7].includes(sortOrder)) {
    const { data } = await supabase.from("locations").select("id, name, city").order("city") as any;
    locations = data || [];
  } else {
    const { data } = await supabase.from("locations").select("id, name, city").eq("id", profile.location_id) as any;
    locations = data || [];
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-coffee-800">Manage Schedule</h1>
        <p className="text-gray-500 text-sm mt-1">Auto-generate or manually add shifts for your team</p>
      </div>
      <ManageTabs locations={locations} />
    </div>
  );
}
