"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function VacationForm() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("vacation_requests").insert({
      employee_id: user.id,
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
    });

    if (error) {
      setStatus("error");
    } else {
      setStatus("success");
      setStartDate("");
      setEndDate("");
      setReason("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Reason <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Family vacation"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
        />
      </div>

      {status === "success" && (
        <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          Request submitted! Your manager will review it.
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
        {status === "loading" ? "Submitting..." : "Submit Request"}
      </button>
    </form>
  );
}
