import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import VacationForm from "@/components/VacationForm";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
};

export default async function VacationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isManager = profile?.role === "manager";

  const { data: myRequests } = await supabase
    .from("vacation_requests")
    .select("id, start_date, end_date, reason, status, created_at")
    .eq("employee_id", user.id)
    .order("created_at", { ascending: false });

  const { data: pendingRequests } = isManager
    ? await supabase
        .from("vacation_requests")
        .select(`id, start_date, end_date, reason, status, created_at, employee:profiles!employee_id(full_name)`)
        .eq("status", "pending")
        .order("created_at")
    : { data: [] };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-coffee-800">Vacation Requests</h1>
        <p className="text-gray-500 text-sm mt-1">Request time off or check your status</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">New Request</h2>
        <VacationForm />
      </div>

      {isManager && pendingRequests && pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-coffee-200 p-6 mb-6">
          <h2 className="font-semibold text-coffee-800 mb-4">⏳ Pending Approval ({pendingRequests.length})</h2>
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-coffee-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">
                    {(req.employee as unknown as { full_name: string } | null)?.full_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(req.start_date), "MMM d")} – {format(new Date(req.end_date), "MMM d, yyyy")}
                  </p>
                  {req.reason && <p className="text-xs text-gray-400 mt-0.5">"{req.reason}"</p>}
                </div>
                <div className="flex gap-2">
                  <form action={`/api/vacation/${req.id}/approve`} method="POST">
                    <button className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                      Approve
                    </button>
                  </form>
                  <form action={`/api/vacation/${req.id}/deny`} method="POST">
                    <button className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors">
                      Deny
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">My Requests</h2>
        {!myRequests || myRequests.length === 0 ? (
          <p className="text-sm text-gray-400">No requests yet.</p>
        ) : (
          <div className="space-y-3">
            {myRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {format(new Date(req.start_date), "MMM d")} – {format(new Date(req.end_date), "MMM d, yyyy")}
                  </p>
                  {req.reason && <p className="text-xs text-gray-400 mt-0.5">"{req.reason}"</p>}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[req.status] || "bg-gray-100 text-gray-600"}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
