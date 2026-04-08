"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  format, getDaysInMonth, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, isSameMonth, isToday,
  addMonths, subMonths,
} from "date-fns";

type Barista = { id: string; full_name: string; preferred_name?: string };
type SlotType = "am" | "pm";
type DaySchedule = { am: string[]; pm: string[] };
type Schedule = Record<string, DaySchedule>;

type Location = { id: string; name: string; city: string };

const AM = { start: "08:00:00", end: "17:00:00", hours: 9, label: "AM · 8–17", color: "bg-amber-100 text-amber-800 border-amber-200" };
const PM = { start: "16:00:00", end: "20:00:00", hours: 4, label: "PM · 16–20", color: "bg-indigo-100 text-indigo-800 border-indigo-200" };
const CREW = 3;

function autoGenerate(baristas: Barista[], year: number, month: number): Schedule {
  const days = getDaysInMonth(new Date(year, month));
  const hours: Record<string, number> = Object.fromEntries(baristas.map(b => [b.id, 0]));
  const schedule: Schedule = {};

  for (let d = 1; d <= days; d++) {
    const date = format(new Date(year, month, d), "yyyy-MM-dd");
    const sorted = [...baristas].sort((a, b) => hours[a.id] - hours[b.id]);

    const amCrew = sorted.slice(0, CREW).map(b => b.id);
    amCrew.forEach(id => { hours[id] += AM.hours; });

    const pmPool = sorted.filter(b => !amCrew.includes(b.id));
    const pmCrew = pmPool.slice(0, CREW).map(b => b.id);
    pmCrew.forEach(id => { hours[id] += PM.hours; });

    schedule[date] = { am: amCrew, pm: pmCrew };
  }

  return schedule;
}

function hoursPerBarista(baristas: Barista[], schedule: Schedule) {
  const hours: Record<string, number> = Object.fromEntries(baristas.map(b => [b.id, 0]));
  for (const day of Object.values(schedule)) {
    day.am.forEach(id => { hours[id] = (hours[id] || 0) + AM.hours; });
    day.pm.forEach(id => { hours[id] = (hours[id] || 0) + PM.hours; });
  }
  return hours;
}

export default function AutoScheduleCalendar({ locations }: { locations: Location[] }) {
  const [locationId, setLocationId] = useState("");
  const [baristas, setBaristas] = useState<Barista[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Drag state
  const dragSource = useRef<{ date: string; slot: SlotType; index: number; id: string } | null>(null);

  async function loadBaristas(locId: string) {
    setLoading(true);
    setSchedule(null);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, preferred_name")
      .eq("location_id", locId)
      .order("full_name") as any;
    setBaristas(data || []);
    setLoading(false);
  }

  function handleLocationChange(locId: string) {
    setLocationId(locId);
    if (locId) loadBaristas(locId);
    else setBaristas([]);
  }

  function handleGenerate() {
    if (baristas.length < CREW * 2) {
      setError(`Need at least ${CREW * 2} baristas to generate a schedule.`);
      return;
    }
    setError("");
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    setSchedule(autoGenerate(baristas, year, month));
    setSaved(false);
  }

  function getName(id: string) {
    const b = baristas.find(b => b.id === id);
    return b?.preferred_name || b?.full_name?.split(" ")[0] || "?";
  }

  // Drag handlers
  function onDragStart(date: string, slot: SlotType, index: number, id: string) {
    dragSource.current = { date, slot, index, id };
  }

  function onDrop(targetDate: string, targetSlot: SlotType, targetIndex: number) {
    if (!dragSource.current || !schedule) return;
    const src = dragSource.current;
    if (src.date === targetDate && src.slot === targetSlot && src.index === targetIndex) return;

    const newSchedule = JSON.parse(JSON.stringify(schedule)) as Schedule;

    const srcArr = newSchedule[src.date][src.slot];
    const tgtArr = newSchedule[targetDate][targetSlot];

    const srcId = srcArr[src.index];
    const tgtId = tgtArr[targetIndex];

    // Swap
    srcArr[src.index] = tgtId;
    tgtArr[targetIndex] = srcId;

    setSchedule(newSchedule);
    dragSource.current = null;
  }

  async function handleSave() {
    if (!schedule || !locationId) return;
    setSaving(true);
    setError("");
    const supabase = createClient();

    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    // Delete existing shifts for this location + month
    await supabase
      .from("shifts")
      .delete()
      .eq("location_id", locationId)
      .gte("shift_date", monthStart)
      .lte("shift_date", monthEnd) as any;

    // Build insert rows
    const rows: any[] = [];
    for (const [date, day] of Object.entries(schedule)) {
      for (const id of day.am) {
        rows.push({ location_id: locationId, employee_id: id, shift_date: date, start_time: AM.start, end_time: AM.end, status: "approved" });
      }
      for (const id of day.pm) {
        rows.push({ location_id: locationId, employee_id: id, shift_date: date, start_time: PM.start, end_time: PM.end, status: "approved" });
      }
    }

    const { error: insertError } = await supabase.from("shifts").insert(rows) as any;
    setSaving(false);
    if (insertError) { setError("Failed to save. Please try again."); return; }
    setSaved(true);
  }

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const hours = schedule ? hoursPerBarista(baristas, schedule) : null;
  const minH = hours ? Math.min(...Object.values(hours)) : 0;
  const maxH = hours ? Math.max(...Object.values(hours)) : 0;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Location</label>
          <select
            value={locationId}
            onChange={e => handleLocationChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-coffee-400"
          >
            <option value="">Select location…</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name} — {loc.city}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Month</label>
          <div className="flex items-center gap-2">
            <button onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSchedule(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">←</button>
            <span className="text-sm font-medium text-gray-700 w-28 text-center">{format(currentMonth, "MMMM yyyy")}</span>
            <button onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSchedule(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">→</button>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!locationId || loading || baristas.length === 0}
          className="px-4 py-2 bg-coffee-700 text-white text-sm font-medium rounded-lg hover:bg-coffee-800 transition-colors disabled:opacity-40"
        >
          {loading ? "Loading…" : "✨ Auto-generate"}
        </button>

        {schedule && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save schedule"}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 px-1">{error}</p>}

      {/* Hours summary */}
      {schedule && hours && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Monthly hours per barista</p>
          <div className="flex flex-wrap gap-2">
            {baristas.map(b => {
              const h = hours[b.id] || 0;
              const isMax = h === maxH;
              const isMin = h === minH;
              return (
                <div key={b.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  isMax ? "bg-red-50 text-red-700 border-red-200" : isMin ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"
                }`}>
                  {b.preferred_name || b.full_name?.split(" ")[0]}
                  <span className="font-bold">{h}h</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">Range: {minH}h – {maxH}h · Drag pills on the calendar to swap people</p>
        </div>
      )}

      {/* Calendar */}
      {schedule && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 mb-1 min-w-[700px]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <div key={day} className="text-xs font-semibold text-gray-400 text-center py-1">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 min-w-[700px]">
            {days.map(date => {
              const key = format(date, "yyyy-MM-dd");
              const inMonth = isSameMonth(date, currentMonth);
              const today = isToday(date);
              const day = schedule[key];

              return (
                <div
                  key={key}
                  className={`rounded-lg p-1.5 min-h-[90px] border ${
                    today ? "border-coffee-300 bg-coffee-50" : "border-gray-100 bg-white"
                  } ${!inMonth ? "opacity-25" : ""}`}
                >
                  <p className={`text-xs font-bold mb-1 ${today ? "text-coffee-700" : "text-gray-500"}`}>
                    {format(date, "d")}
                  </p>

                  {day && inMonth && (
                    <div className="space-y-1">
                      {/* AM row */}
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-amber-600 uppercase">AM</p>
                        {day.am.map((id, i) => (
                          <div
                            key={i}
                            draggable
                            onDragStart={() => onDragStart(key, "am", i, id)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => onDrop(key, "am", i)}
                            className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 truncate cursor-grab active:cursor-grabbing select-none"
                          >
                            {getName(id)}
                          </div>
                        ))}
                      </div>
                      {/* PM row */}
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-indigo-600 uppercase">PM</p>
                        {day.pm.map((id, i) => (
                          <div
                            key={i}
                            draggable
                            onDragStart={() => onDragStart(key, "pm", i, id)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => onDrop(key, "pm", i)}
                            className="text-[10px] px-1 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 truncate cursor-grab active:cursor-grabbing select-none"
                          >
                            {getName(id)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
