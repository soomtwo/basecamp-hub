import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format, addHours } from "date-fns";
import ShiftSwapForm from "@/components/ShiftSwapForm";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

export default async function ShiftsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myShifts } = await supabase
    .from("shifts")
    .select("id, shift_date, start_time, end_time, schedule:schedules!schedule_id(status)")
    .eq("employee_id", user.id)
    .gte("shift_date", format(new Date(), "yyyy-MM-dd"))
    .order("shift_date")
    .limit(14);

  const eligibleShifts = (myShifts || []).filter((shift) => {
    const shiftDateTime = new Date(`${shift.shift_date}T${shift.start_time}`);
    const cutoff = addHours(new Date(), 72);
    return shiftDateTime > cutoff;
  });

  const { data: incomingRequests } = await supabase
    .from("shift_swap_requests")
    .select(`
      id, status, created_at,
      requester:profiles!requester_id(full_name),
      requester_shift:shifts!requester_shift_id(shift_date, start_time, end_time)
    `)
    .eq("target_employee_id", user.id)
    .eq("status", "pending");

  const { data: myRequests } = await supabase
    .from("shift_swap_requests")
    .select(`
      id, status, created_at,
      target_employee:profiles!target_employee_id(full_name),
      requester_shift:shifts!requester_shift_id(shift_date, start_time, end_time)
    `)
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-coffee-800">Shift Swaps</h1>
        <p className="text-gray-500 text-sm mt-1">Request must be made 72+ hours in advance</p>
      </div>

      {incomingRequests && incomingRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-coffee-200 p-6 mb-6">
          <h2 className="font-semibold text-coffee-800 mb-4">📬 Swap Requests for You ({incomingRequests.length})</h2>
          <div className="space-y-3">
            {incomingRequests.map((req) => {
              const reqShift = req.requester_shift as { shift_date: string; start_time: string; end_time: string } | null;
              return (
                <div key={req.id} className="flex items-center justify-between p-3 bg-coffee-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">
                      {(req.requester as unknown as { full_name: string } | null)?.full_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Wants to swap their {reqShift ? format(new Date(reqShift.shift_date), "EEE MMM d") : ""} shift ({reqShift?.start_time?.slice(0, 5)}–{reqShift?.end_time?.slice(0, 5)})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={`/api/shifts/${req.id}/accept`} method="POST">
                      <button className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">Accept</button>
                    </form>
                    <form action={`/api/shifts/${req.id}/decline`} method="POST">
                      <button className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors">Decline</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Request a Swap</h2>
        {eligibleShifts.length === 0 ? (
          <p className="text-sm text-gray-400">No upcoming shifts available for swapping (must be 72+ hours away).</p>
        ) : (
          <ShiftSwapForm shifts={eligibleShifts} />
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">My Swap Requests</h2>
        {!myRequests || myRequests.length === 0 ? (
          <p className="text-sm text-gray-400">No requests yet.</p>
        ) : (
          <div className="space-y-3">
            {myRequests.map((req) => {
              const reqShift = req.requester_shift as { shift_date: string; start_time: string; end_time: string } | null;
              const targetEmp = req.target_employee as unknown as { full_name: string } | null;
              return (
                <div key={req.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {reqShift ? format(new Date(reqShift.shift_date), "EEE MMM d") : "—"} ({reqShift?.start_time?.slice(0,5)}–{reqShift?.end_time?.slice(0,5)})
                    </p>
                    <p className="text-xs text-gray-400">{targetEmp ? `→ ${targetEmp.full_name}` : "→ Open to anyone"}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[req.status] || "bg-gray-100 text-gray-600"}`}>
                    {req.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
