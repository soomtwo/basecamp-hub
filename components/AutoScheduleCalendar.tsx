"use client";

import { useState, useRef, useEffect } from "react";
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
type Pref = "any" | "am" | "pm";
type Location = { id: string; name: string; city: string };

const AM = { start: "08:00:00", end: "17:00:00", hours: 9 };
const PM = { start: "16:00:00", end: "20:00:00", hours: 4 };
const CREW = 3;

function buildSchedule(baristas: Barista[], year: number, month: number, prefs: Record<string, Pref>): Schedule {
  const days = getDaysInMonth(new Date(year, month));
  const hours: Record<string, number> = Object.fromEntries(baristas.map(b => [b.id, 0]));
  const schedule: Schedule = {};

  for (let d = 1; d <= days; d++) {
    const date = format(new Date(year, month, d), "yyyy-MM-dd");

    // AM candidates: pref != pm, sorted by fewest hours
    const amPool = [...baristas]
      .filter(b => (prefs[b.id] || "any") !== "pm")
      .sort((a, b) => hours[a.id] - hours[b.id]);
    const amCrew = amPool.slice(0, CREW).map(b => b.id);
    amCrew.forEach(id => { hours[id] += AM.hours; });

    // PM candidates: pref != am, not on AM today, sorted by fewest hours
    const pmPool = [...baristas]
      .filter(b => !amCrew.includes(b.id) && (prefs[b.id] || "any") !== "am")
      .sort((a, b) => hours[a.id] - hours[b.id]);
    const pmCrew = pmPool.slice(0, CREW).map(b => b.id);
    pmCrew.forEach(id => { hours[id] += PM.hours; });

    schedule[date] = { am: amCrew, pm: pmCrew };
  }
  return schedule;
}

function calcHours(baristas: Barista[], schedule: Schedule) {
  const h: Record<string, number> = Object.fromEntries(baristas.map(b => [b.id, 0]));
  for (const day of Object.values(schedule)) {
    day.am.forEach(id => { h[id] = (h[id] || 0) + AM.hours; });
    day.pm.forEach(id => { h[id] = (h[id] || 0) + PM.hours; });
  }
  return h;
}

export default function AutoScheduleCalendar({ locations }: { locations: Location[] }) {
  const [locationId, setLocationId] = useState("");
  const [baristas, setBaristas] = useState<Barista[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [prefs, setPrefs] = useState<Record<string, Pref>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Highlight & drag state
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const dragSource = useRef<{ date: string; slot: SlotType; index: number; id: string } | null>(null);

  // Load baristas + existing schedule whenever location or month changes
  useEffect(() => {
    if (!locationId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setSchedule(null);
      setSaved(false);
      const supabase = createClient();

      const [{ data: bData }, { data: sData }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, preferred_name").eq("location_id", locationId).order("full_name") as any,
        supabase.from("shifts").select("employee_id, shift_date, start_time")
          .eq("location_id", locationId)
          .gte("shift_date", format(startOfMonth(currentMonth), "yyyy-MM-dd"))
          .lte("shift_date", format(endOfMonth(currentMonth), "yyyy-MM-dd"))
          .order("shift_date") as any,
      ]);

      if (cancelled) return;

      setBaristas(bData || []);

      if (sData && sData.length > 0) {
        const sched: Schedule = {};
        for (const s of sData) {
          if (!sched[s.shift_date]) sched[s.shift_date] = { am: [], pm: [] };
          sched[s.shift_date][s.start_time.startsWith("08") ? "am" : "pm"].push(s.employee_id);
        }
        setSchedule(sched);
        setSaved(true);
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [locationId, currentMonth]);

  function handleGenerate() {
    if (baristas.length < CREW * 2) {
      setError(`Need at least ${CREW * 2} people to generate a schedule.`);
      return;
    }
    setError("");
    setSchedule(buildSchedule(baristas, currentMonth.getFullYear(), currentMonth.getMonth(), prefs));
    setSaved(false);
    setHighlightId(null);
  }

  function getName(id: string) {
    const b = baristas.find(b => b.id === id);
    return b?.preferred_name || b?.full_name?.split(" ")[0] || "?";
  }

  function togglePref(id: string) {
    setPrefs(p => {
      const cur = p[id] || "any";
      const next: Pref = cur === "any" ? "am" : cur === "am" ? "pm" : "any";
      return { ...p, [id]: next };
    });
  }

  // Drag
  function onDragStart(date: string, slot: SlotType, index: number, id: string) {
    dragSource.current = { date, slot, index, id };
  }

  function dragKey(date: string, slot: SlotType, index: number) {
    return `${date}__${slot}__${index}`;
  }

  function onDrop(targetDate: string, targetSlot: SlotType, targetIndex: number) {
    setDragOverKey(null);
    if (!dragSource.current || !schedule) return;
    const src = dragSource.current;
    if (src.date === targetDate && src.slot === targetSlot && src.index === targetIndex) return;

    const next = JSON.parse(JSON.stringify(schedule)) as Schedule;
    const srcArr = next[src.date][src.slot];
    const tgtArr = next[targetDate][targetSlot];

    const tmp = srcArr[src.index];
    srcArr[src.index] = tgtArr[targetIndex];
    tgtArr[targetIndex] = tmp;

    setSchedule(next);
    setSaved(false);
    dragSource.current = null;
  }

  async function handleSave() {
    if (!schedule || !locationId) return;
    setSaving(true);
    setError("");
    const supabase = createClient();

    await (supabase.from("shifts").delete()
      .eq("location_id", locationId)
      .gte("shift_date", format(startOfMonth(currentMonth), "yyyy-MM-dd"))
      .lte("shift_date", format(endOfMonth(currentMonth), "yyyy-MM-dd")) as any);

    const rows: any[] = [];
    for (const [date, day] of Object.entries(schedule)) {
      day.am.forEach(id => rows.push({ location_id: locationId, employee_id: id, shift_date: date, start_time: AM.start, end_time: AM.end, status: "approved" }));
      day.pm.forEach(id => rows.push({ location_id: locationId, employee_id: id, shift_date: date, start_time: PM.start, end_time: PM.end, status: "approved" }));
    }

    const { error: err } = await supabase.from("shifts").insert(rows) as any;
    setSaving(false);
    if (err) { setError("Failed to save. Try again."); return; }
    setSaved(true);
  }

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const hours = schedule ? calcHours(baristas, schedule) : null;
  const hVals = hours ? Object.values(hours) : [];
  const minH = hVals.length ? Math.min(...hVals) : 0;
  const maxH = hVals.length ? Math.max(...hVals) : 0;

  const prefColors: Record<Pref, string> = {
    any: "bg-gray-100 text-gray-500",
    am: "bg-amber-200 text-amber-800",
    pm: "bg-indigo-200 text-indigo-800",
  };

  return (
    <div className="space-y-5">

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Location</label>
          <select
            value={locationId}
            onChange={e => { setLocationId(e.target.value); setHighlightId(null); }}
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
            <button onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setHighlightId(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">←</button>
            <span className="text-sm font-medium text-gray-700 w-28 text-center">{format(currentMonth, "MMMM yyyy")}</span>
            <button onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setHighlightId(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">→</button>
          </div>
        </div>

        {locationId && !loading && (
          <button
            onClick={handleGenerate}
            disabled={baristas.length === 0}
            className="px-4 py-2 bg-coffee-700 text-white text-sm font-medium rounded-lg hover:bg-coffee-800 transition-colors disabled:opacity-40"
          >
            ✨ {schedule ? "Regenerate" : "Auto-generate"}
          </button>
        )}

        {schedule && !saved && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save schedule"}
          </button>
        )}

        {saved && !saving && schedule && (
          <span className="text-sm text-green-600 font-medium">✓ Saved</span>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400 px-1">Loading…</p>}
      {error && <p className="text-sm text-red-600 px-1">{error}</p>}

      {/* Barista summary + shift preferences */}
      {baristas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {schedule ? "Monthly hours · click to highlight" : "Team · set AM/PM preference before generating"}
            </p>
            {schedule && highlightId && (
              <button onClick={() => setHighlightId(null)} className="text-xs text-gray-400 hover:text-gray-600">
                Clear highlight
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {baristas.map(b => {
              const h = hours?.[b.id] || 0;
              const isHighlighted = highlightId === b.id;
              const isOther = highlightId !== null && highlightId !== b.id;
              const pref = prefs[b.id] || "any";
              return (
                <div
                  key={b.id}
                  onClick={() => schedule && setHighlightId(highlightId === b.id ? null : b.id)}
                  className={`flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium border transition-all ${
                    schedule ? "cursor-pointer" : ""
                  } ${
                    isHighlighted
                      ? "bg-coffee-100 border-coffee-400 text-coffee-800 ring-2 ring-coffee-300"
                      : isOther
                      ? "opacity-30 bg-gray-50 border-gray-200 text-gray-500"
                      : h === maxH && maxH !== minH
                      ? "bg-red-50 border-red-200 text-red-700"
                      : h === minH && schedule
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-gray-50 border-gray-200 text-gray-700"
                  }`}
                >
                  <span>{b.preferred_name || b.full_name?.split(" ")[0]}</span>
                  {schedule && <span className="font-bold">{h}h</span>}
                  {/* Preference badge */}
                  <button
                    onClick={e => { e.stopPropagation(); togglePref(b.id); }}
                    title="Click to cycle: Any → AM → PM"
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 transition-colors ${prefColors[pref]}`}
                  >
                    {pref === "any" ? "ANY" : pref.toUpperCase()}
                  </button>
                </div>
              );
            })}
          </div>
          {schedule && (
            <p className="text-xs text-gray-400 mt-2">
              Range: {minH}h – {maxH}h · Drag names on calendar to swap · Click badge to set AM/PM preference
            </p>
          )}
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
                  className={`rounded-lg p-1.5 min-h-[90px] border transition-all ${
                    today ? "border-coffee-300 bg-coffee-50" : "border-gray-100 bg-white"
                  } ${!inMonth ? "opacity-20 pointer-events-none" : ""}`}
                >
                  <p className={`text-xs font-bold mb-1 ${today ? "text-coffee-700" : "text-gray-400"}`}>
                    {format(date, "d")}
                  </p>

                  {day && inMonth && (
                    <div className="space-y-1">
                      {/* AM */}
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wide">AM</p>
                        {day.am.map((id, i) => {
                          const k = dragKey(key, "am", i);
                          const isOver = dragOverKey === k;
                          const isHL = highlightId === id;
                          const isFaded = highlightId !== null && !isHL;
                          return (
                            <div
                              key={i}
                              draggable
                              onDragStart={() => onDragStart(key, "am", i, id)}
                              onDragOver={e => { e.preventDefault(); setDragOverKey(k); }}
                              onDragLeave={() => setDragOverKey(null)}
                              onDrop={() => onDrop(key, "am", i)}
                              className={`text-[10px] px-1 py-0.5 rounded border truncate cursor-grab active:cursor-grabbing select-none transition-all ${
                                isOver
                                  ? "bg-yellow-300 text-yellow-900 border-yellow-400 scale-105 shadow-sm"
                                  : isHL
                                  ? "bg-amber-300 text-amber-900 border-amber-400 font-bold"
                                  : isFaded
                                  ? "bg-amber-50 text-amber-300 border-amber-100 opacity-40"
                                  : "bg-amber-100 text-amber-800 border-amber-200"
                              }`}
                            >
                              {getName(id)}
                            </div>
                          );
                        })}
                      </div>
                      {/* PM */}
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide">PM</p>
                        {day.pm.map((id, i) => {
                          const k = dragKey(key, "pm", i);
                          const isOver = dragOverKey === k;
                          const isHL = highlightId === id;
                          const isFaded = highlightId !== null && !isHL;
                          return (
                            <div
                              key={i}
                              draggable
                              onDragStart={() => onDragStart(key, "pm", i, id)}
                              onDragOver={e => { e.preventDefault(); setDragOverKey(k); }}
                              onDragLeave={() => setDragOverKey(null)}
                              onDrop={() => onDrop(key, "pm", i)}
                              className={`text-[10px] px-1 py-0.5 rounded border truncate cursor-grab active:cursor-grabbing select-none transition-all ${
                                isOver
                                  ? "bg-yellow-300 text-yellow-900 border-yellow-400 scale-105 shadow-sm"
                                  : isHL
                                  ? "bg-indigo-300 text-indigo-900 border-indigo-400 font-bold"
                                  : isFaded
                                  ? "bg-indigo-50 text-indigo-300 border-indigo-100 opacity-40"
                                  : "bg-indigo-100 text-indigo-800 border-indigo-200"
                              }`}
                            >
                              {getName(id)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {locationId && !loading && !schedule && baristas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <p className="text-gray-400 text-sm mb-3">No schedule for this month yet.</p>
          <button
            onClick={handleGenerate}
            className="px-5 py-2 bg-coffee-700 text-white text-sm font-medium rounded-lg hover:bg-coffee-800 transition-colors"
          >
            ✨ Auto-generate
          </button>
        </div>
      )}
    </div>
  );
}
