import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MonthlyCalendar from "@/components/MonthlyCalendar";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("location_id")
    .eq("id", user.id);

  const locationId = profileRows?.[0]?.location_id ?? null;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-coffee-800">Schedule</h1>
        <p className="text-gray-500 text-sm mt-1">Click a day to see shift details</p>
      </div>

      {!locationId ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <p className="text-gray-400">Your profile doesn&apos;t have a location set. Contact your manager.</p>
        </div>
      ) : (
        <MonthlyCalendar locationId={locationId} userId={user.id} />
      )}
    </div>
  );
}
