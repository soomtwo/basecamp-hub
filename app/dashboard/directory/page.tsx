/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MyProfileCard from "@/components/MyProfileCard";

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function DirectoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select(`id, full_name, preferred_name, position, department, photo_url, anniversary_month, anniversary_day, hire_date, location_id, manager:profiles!manager_id(full_name)`)
    .eq("id", user.id)
    .single() as any;

  const { data: positions } = await supabase
    .from("positions")
    .select("title, category")
    .order("sort_order") as any;

  const { data: employees } = await supabase
    .from("profiles")
    .select(`id, full_name, preferred_name, position, department, email, anniversary_month, anniversary_day, hire_date, photo_url, manager:profiles!manager_id(full_name)`)
    .eq("location_id", myProfile?.location_id)
    .neq("id", user.id)
    .order("full_name") as any;

  const grouped = ((employees || []) as any[]).reduce((acc: Record<string, any[]>, emp: any) => {
    const dept = emp.department || "Other";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-coffee-800">Directory</h1>
        <p className="text-gray-500 text-sm mt-1">Your location&apos;s team</p>
      </div>

      {myProfile && (
        <MyProfileCard
          profile={{
            id: myProfile.id,
            full_name: myProfile.full_name,
            preferred_name: myProfile.preferred_name,
            position: myProfile.position,
            department: myProfile.department,
            photo_url: myProfile.photo_url,
            anniversary_month: myProfile.anniversary_month,
            anniversary_day: myProfile.anniversary_day,
            hire_date: myProfile.hire_date,
            manager_name: myProfile.manager?.full_name ?? null,
          }}
          positions={positions || []}
        />
      )}

      {Object.entries(grouped).map(([dept, members]) => (
        <div key={dept} className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {dept}
          </h2>
          <div className="grid gap-3">
            {(members as any[]).map((emp: any) => {
              const hireYear = emp.hire_date ? new Date(emp.hire_date).getFullYear() : null;
              const yearsIn = hireYear ? new Date().getFullYear() - hireYear : null;
              const anniversary =
                emp.anniversary_month && emp.anniversary_day
                  ? `${MONTHS[emp.anniversary_month - 1]} ${getOrdinal(emp.anniversary_day)}`
                  : null;
              const displayName = emp.preferred_name || emp.full_name;
              const managerName = emp.manager?.full_name ?? null;

              return (
                <div key={emp.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {emp.photo_url && emp.photo_url.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={emp.photo_url} alt={displayName || ""} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-coffee-600 font-semibold text-lg">
                        {displayName?.charAt(0) || "?"}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{displayName}</p>
                    <p className="text-sm text-gray-500">{emp.position}</p>
                    {managerName && (
                      <p className="text-xs text-gray-400 mt-0.5">Reports to {managerName}</p>
                    )}
                  </div>

                  <div className="text-right text-xs text-gray-400 space-y-0.5 flex-shrink-0">
                    {anniversary && <p>🎂 {anniversary}</p>}
                    {yearsIn !== null && <p>⏱ {yearsIn}y with Basecamp</p>}
                    {emp.email && <p>✉️ {emp.email}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {(!employees || employees.length === 0) && !myProfile && (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <p className="text-gray-400">No team members found for your location.</p>
        </div>
      )}
    </div>
  );
}
