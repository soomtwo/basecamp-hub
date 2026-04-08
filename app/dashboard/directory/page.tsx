import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";

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

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("location_id")
    .eq("id", user.id)
    .single();

  const { data: employees } = await supabase
    .from("profiles")
    .select(`
      id, full_name, position, department, phone, email,
      anniversary_month, anniversary_day, hire_date, photo_url,
      manager:profiles!manager_id(full_name)
    `)
    .eq("location_id", currentProfile?.location_id)
    .order("full_name");

  const grouped = (employees || []).reduce((acc: Record<string, typeof employees>, emp) => {
    const dept = emp!.department || "Other";
    if (!acc[dept]) acc[dept] = [];
    acc[dept]!.push(emp);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-coffee-800">Directory</h1>
        <p className="text-gray-500 text-sm mt-1">Your location's team</p>
      </div>

      {Object.entries(grouped).map(([dept, members]) => (
        <div key={dept} className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {dept}
          </h2>
          <div className="grid gap-3">
            {members!.map((emp) => {
              const hireYear = emp.hire_date ? new Date(emp.hire_date).getFullYear() : null;
              const yearsIn = hireYear ? new Date().getFullYear() - hireYear : null;
              const anniversary =
                emp.anniversary_month && emp.anniversary_day
                  ? `${MONTHS[emp.anniversary_month - 1]} ${getOrdinal(emp.anniversary_day)}`
                  : null;

              return (
                <div key={emp.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {emp.photo_url ? (
                      <Image src={emp.photo_url} alt={emp.full_name || ""} width={48} height={48} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-coffee-600 font-semibold text-lg">
                        {emp.full_name?.charAt(0) || "?"}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{emp.full_name}</p>
                      {user.id === emp.id && (
                        <span className="text-xs bg-coffee-100 text-coffee-700 px-2 py-0.5 rounded-full">You</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{emp.position}</p>
                    {(emp.manager as unknown as { full_name: string } | null)?.full_name && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Reports to {(emp.manager as unknown as { full_name: string }).full_name}
                      </p>
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

      {(!employees || employees.length === 0) && (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <p className="text-gray-400">No team members found for your location.</p>
        </div>
      )}
    </div>
  );
}
