import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format, startOfWeek, addDays } from "date-fns";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("location_id, role")
    .eq("id", user.id)
    .single();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = DAYS.map((day, i) => ({
    label: day,
    date: addDays(weekStart, i),
  }));

  const { data: schedule } = await supabase
    .from("schedules")
    .select("id, status")
    .eq("location_id", currentProfile?.location_id)
    .eq("week_start", format(weekStart, "yyyy-MM-dd"))
    .single();

  const { data: shifts } = schedule
    ? await supabase
        .from("shifts")
        .select(`
          id, shift_date, start_time, end_time,
          employee:profiles!employee_id(id, full_name)
        `)
        .eq("schedule_id", schedule.id)
        .order("shift_date")
        .order("start_time")
    : { data: [] };

  const shiftsByDay: Record<string, typeof shifts> = {};
  weekDays.forEach(({ date }) => {
    const key = format(date, "yyyy-MM-dd");
    shiftsByDay[key] = (shifts || []).filter((s) => s.shift_date === key);
  });

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-coffee-800">Schedule</h1>
          <p className="text-gray-500 text-sm mt-1">
            Week of {format(weekStart, "MMM d, yyyy")}
          </p>
        </div>
        {schedule && (
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${
            schedule.status === "approved"
              ? "bg-green-100 text-green-700"
              : schedule.status === "pending_approval"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-gray-100 text-gray-600"
          }`}>
            {schedule.status === "approved" ? "✓ Approved" : schedule.status === "pending_approval" ? "⏳ Pending approval" : "Draft"}
          </span>
        )}
      </div>

      {!schedule ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <p className="text-gray-400">No schedule has been created for this week yet.</p>
          {currentProfile?.role === "manager" && (
            <p className="text-sm text-coffee-600 mt-2">Generate one from the admin panel.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(({ label, date }) => {
            const key = format(date, "yyyy-MM-dd");
            const dayShifts = shiftsByDay[key] || [];
            const today = format(new Date(), "yyyy-MM-dd") === key;

            return (
              <div
                key={key}
                className={`bg-white rounded-xl border p-3 ${today ? "border-coffee-400 ring-1 ring-coffee-300" : "border-gray-100"}`}
              >
                <p className={`text-xs font-semibold mb-1 ${today ? "text-coffee-700" : "text-gray-400"}`}>
                  {label.slice(0, 3)}
                </p>
                <p className={`text-lg font-bold mb-3 ${today ? "text-coffee-800" : "text-gray-700"}`}>
                  {format(date, "d")}
                </p>

                <div className="space-y-1.5">
                  {dayShifts.length === 0 ? (
                    <p className="text-xs text-gray-300">—</p>
                  ) : (
                    dayShifts.map((shift) => {
                      const emp = shift.employee as unknown as { id: string; full_name: string } | null;
                      const isMe = emp?.id === user.id;
                      return (
                        <div
                          key={shift.id}
                          className={`rounded-lg p-1.5 text-xs ${
                            isMe ? "bg-coffee-100 text-coffee-800 font-medium" : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          <p className="font-medium truncate">{emp?.full_name?.split(" ")[0]}</p>
                          <p className="text-xs opacity-70">
                            {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
