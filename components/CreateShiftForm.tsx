"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";

type Location = { id: string; name: string; city: string };
type Employee = { id: string; full_name: string; preferred_name?: string; email: string };

const SHIFT_OPTIONS = [
  { label: "AM  8:00 – 17:00", start: "08:00:00", end: "17:00:00" },
  { label: "PM  16:00 – 20:00", start: "16:00:00", end: "20:00:00" },
];

export default function CreateShiftForm({ locations }: { locations: Location[] }) {
  const [locationId, setLocationId] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  const [shiftTime, setShiftTime] = useState(SHIFT_OPTIONS[0].start);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!locationId) { setEmployees([]); setEmployeeId(""); return; }
    async function loadEmployees() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, preferred_name, email")
        .eq("location_id", locationId)
        .order("full_name") as any;
      setEmployees(data || []);
      setEmployeeId("");
    }
    loadEmployees();
  }, [locationId]);

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  function toggleDay(date: Date) {
    setSelectedDays((prev) =>
      prev.some((d) => isSameDay(d, date))
        ? prev.filter((d) => !isSameDay(d, date))
        : [...prev, date]
    );
  }

  async function handleSubmit() {
    setError("");
    if (!locationId || !employeeId || selectedDays.length === 0) {
      setError("Please select a location, employee, at least one day, and a shift time.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const selectedShift = SHIFT_OPTIONS.find((o) => o.start === shiftTime)!;

    const inserts = selectedDays.map((date) => ({
      location_id: locationId,
      employee_id: employeeId,
      shift_date: format(date, "yyyy-MM-dd"),
      start_time: selectedShift.start,
      end_time: selectedShift.end,
      status: "approved",
    }));

    const { error: insertError } = await supabase.from("shifts").insert(inserts) as any;

    setSubmitting(false);
    if (insertError) {
      setError("Failed to create shifts. Please try again.");
      return;
    }

    setSuccess(true);
    setSelectedDays([]);
    setTimeout(() => setSuccess(false), 3000);
  }

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  return (
    <div className="space-y-6">
      {/* Location */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-coffee-400"
        >
          <option value="">Select a location…</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name} — {loc.city}</option>
          ))}
        </select>
      </div>

      {/* Employee */}
      {locationId && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Team Member</label>
          {employees.length === 0 ? (
            <p className="text-sm text-gray-400">No employees found at this location.</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {employees.map((emp) => {
                const displayName = emp.preferred_name || emp.full_name || emp.email;
                return (
                  <label
                    key={emp.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      employeeId === emp.id ? "border-coffee-400 bg-coffee-50" : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="employee"
                      value={emp.id}
                      checked={employeeId === emp.id}
                      onChange={() => setEmployeeId(emp.id)}
                      className="accent-coffee-600"
                    />
                    <div className="w-7 h-7 rounded-full bg-coffee-100 flex items-center justify-center text-xs font-semibold text-coffee-700 flex-shrink-0">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-gray-800 font-medium">{displayName}</p>
                      {emp.preferred_name && <p className="text-xs text-gray-400">{emp.email}</p>}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Day picker */}
      {employeeId && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-semibold text-gray-700">Select Day(s)</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-sm"
              >←</button>
              <span className="text-sm font-medium text-gray-700">{format(currentMonth, "MMMM yyyy")}</span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-sm"
              >→</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="text-xs font-semibold text-gray-400 text-center py-1">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((date) => {
              const inMonth = isSameMonth(date, currentMonth);
              const isSelected = selectedDays.some((d) => isSameDay(d, date));
              const isCurrentDay = isToday(date);
              return (
                <button
                  key={date.toString()}
                  onClick={() => toggleDay(date)}
                  className={`rounded-lg py-2 text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-coffee-600 text-white"
                      : isCurrentDay
                      ? "bg-coffee-50 text-coffee-700 border border-coffee-300"
                      : "hover:bg-gray-50 text-gray-700"
                  } ${!inMonth ? "opacity-30" : ""}`}
                >
                  {format(date, "d")}
                </button>
              );
            })}
          </div>

          {selectedDays.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedDays
                .slice()
                .sort((a, b) => a.getTime() - b.getTime())
                .map((d) => (
                  <span
                    key={d.toString()}
                    className="text-xs bg-coffee-100 text-coffee-800 px-2 py-0.5 rounded-full font-medium"
                  >
                    {format(d, "EEE, MMM d")}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Shift time */}
      {selectedDays.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Shift Time</label>
          <div className="space-y-2">
            {SHIFT_OPTIONS.map((opt) => (
              <label
                key={opt.start}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  shiftTime === opt.start ? "border-coffee-400 bg-coffee-50" : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="shiftTime"
                  value={opt.start}
                  checked={shiftTime === opt.start}
                  onChange={() => setShiftTime(opt.start)}
                  className="accent-coffee-600"
                />
                <span className="text-sm font-medium text-gray-800">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Summary + submit */}
      {selectedDays.length > 0 && (
        <div className="bg-coffee-50 rounded-xl border border-coffee-200 p-5">
          <h3 className="text-sm font-semibold text-coffee-800 mb-2">Summary</h3>
          <p className="text-sm text-coffee-700">
            <span className="font-medium">{selectedEmployee?.preferred_name || selectedEmployee?.full_name}</span>
            {" · "}
            {SHIFT_OPTIONS.find((o) => o.start === shiftTime)?.label}
            {" · "}
            {selectedDays.length} day{selectedDays.length > 1 ? "s" : ""}
          </p>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          {success && <p className="text-sm text-green-600 mt-2 font-medium">Shifts created successfully!</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-4 w-full py-2.5 bg-coffee-700 text-white text-sm font-medium rounded-lg hover:bg-coffee-800 transition-colors disabled:opacity-60"
          >
            {submitting ? "Creating shifts…" : `Create ${selectedDays.length} Shift${selectedDays.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}
