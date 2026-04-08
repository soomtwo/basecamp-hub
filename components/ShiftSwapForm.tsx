"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

type Shift = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
};

export default function ShiftSwapForm({ shifts }: { shifts: Shift[] }) {
  const [selectedShift, setSelectedShift] = useState("");
  const [targetType, setTargetType] = useState<"anyone" | "specific">("anyone");
  const [targetName, setTargetName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedShift) return;

    let targetEmployeeId = null;

    if (targetType === "specific" && targetName) {
      const { data: found } = await supabase
        .from("profiles")
        .select("id")
        .ilike("full_name", `%${targetName}%`)
        .single();
      targetEmployeeId = found?.id || null;
    }

    const { error } = await supabase.from("shift_swap_requests").insert({
      requester_id: user.id,
      requester_shift_id: selectedShift,
      target_employee_id: targetEmployeeId,
    });

    if (error) {
      setStatus("error");
    } else {
      setStatus("success");
      setSelectedShift("");
      setTargetName("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Which shift do you want to swap?</label>
        <select
          value={selectedShift}
          onChange={(e) => setSelectedShift(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
        >
          <option value="">Select a shift...</option>
          {shifts.map((shift) => (
            <option key={shift.id} value={shift.id}>
              {format(new Date(shift.shift_date), "EEE, MMM d")} — {shift.start_time.slice(0, 5)} to {shift.end_time.slice(0, 5)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Who should cover it?</label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              value="anyone"
              checked={targetType === "anyone"}
              onChange={() => setTargetType("anyone")}
              className="accent-coffee-600"
            />
            Open to anyone
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              value="specific"
              checked={targetType === "specific"}
              onChange={() => setTargetType("specific")}
              className="accent-coffee-600"
            />
            Specific person
          </label>
        </div>
      </div>

      {targetType === "specific" && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Coworker's name</label>
          <input
            type="text"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="e.g. Marcus Jr."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>
      )}

      {status === "success" && (
        <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          Swap request sent! {targetType === "specific" ? "They'll be notified." : "Anyone can pick it up."}
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          Something went wrong. Please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="bg-coffee-700 hover:bg-coffee-800 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
      >
        {status === "loading" ? "Sending..." : "Send Swap Request"}
      </button>
    </form>
  );
}
