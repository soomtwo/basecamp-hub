"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

type Coworker = { id: string; full_name: string; preferred_name?: string };

type Props = {
  shiftId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  locationId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ShiftSwapDialog({ shiftId, shiftDate, startTime, endTime, locationId, onClose, onSuccess }: Props) {
  const [coworkers, setCoworkers] = useState<Coworker[]>([]);
  const [selected, setSelected] = useState<string>("anyone");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, preferred_name")
        .eq("location_id", locationId)
        .neq("id", user?.id) as any;

      setCoworkers(data || []);
    }
    load();
  }, [locationId]);

  async function handleConfirm() {
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("shift_swap_requests").insert({
      requester_id: user?.id,
      requester_shift_id: shiftId,
      target_employee_id: selected === "anyone" ? null : selected,
      status: "pending",
    });

    // Create in-app notification
    if (selected !== "anyone") {
      await supabase.from("notifications").insert({
        user_id: selected,
        type: "shift_swap_request",
        message: `${user?.email} wants to swap their ${format(new Date(shiftDate), "MMM d")} shift with you`,
        link: "/dashboard/schedule",
        read: false,
      });
    }

    setSubmitting(false);
    setDone(true);
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 text-lg">Swap Shift</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="bg-coffee-50 rounded-lg p-3 mb-4 text-sm">
          <p className="font-medium text-coffee-800">{format(new Date(shiftDate), "EEEE, MMMM d")}</p>
          <p className="text-coffee-600">{startTime.slice(0, 5)} – {endTime.slice(0, 5)}</p>
        </div>

        <p className="text-sm text-gray-600 mb-3">Who should cover this shift?</p>

        <div className="space-y-2 max-h-52 overflow-y-auto mb-4">
          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected === "anyone" ? "border-coffee-400 bg-coffee-50" : "border-gray-100 hover:border-gray-200"}`}>
            <input type="radio" value="anyone" checked={selected === "anyone"} onChange={() => setSelected("anyone")} className="accent-coffee-600" />
            <div>
              <p className="text-sm font-medium text-gray-800">Anyone available</p>
              <p className="text-xs text-gray-400">Open to all coworkers</p>
            </div>
          </label>

          {coworkers.map((c) => (
            <label key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected === c.id ? "border-coffee-400 bg-coffee-50" : "border-gray-100 hover:border-gray-200"}`}>
              <input type="radio" value={c.id} checked={selected === c.id} onChange={() => setSelected(c.id)} className="accent-coffee-600" />
              <div className="w-7 h-7 rounded-full bg-coffee-100 flex items-center justify-center text-xs font-semibold text-coffee-700 flex-shrink-0">
                {(c.preferred_name || c.full_name)?.charAt(0)}
              </div>
              <p className="text-sm text-gray-800">{c.preferred_name || c.full_name}</p>
            </label>
          ))}
        </div>

        {done ? (
          <div className="text-center py-2 text-green-600 font-medium text-sm">✓ Swap request sent!</div>
        ) : (
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 py-2 text-sm bg-coffee-700 text-white rounded-lg hover:bg-coffee-800 transition-colors disabled:opacity-60 font-medium"
            >
              {submitting ? "Sending..." : "Confirm Request"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
