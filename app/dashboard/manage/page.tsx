import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CreateShiftForm from "@/components/CreateShiftForm";

export default async function ManagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify this user has manage access
  const { data: profile } = await supabase
    .from("profiles")
    .select("position")
    .eq("id", user.id)
    .single() as any;

  if (profile?.position) {
    const { data: pos } = await supabase
      .from("positions")
      .select("sort_order")
      .eq("id", profile.position)
      .single() as any;

    if (![2, 3, 4].includes(pos?.sort_order ?? 0)) {
      redirect("/dashboard");
    }
  } else {
    redirect("/dashboard");
  }

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, city")
    .order("city") as any;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-coffee-800">Manage Schedule</h1>
        <p className="text-gray-500 text-sm mt-1">Create shifts for your team</p>
      </div>
      <CreateShiftForm locations={locations || []} />
    </div>
  );
}
