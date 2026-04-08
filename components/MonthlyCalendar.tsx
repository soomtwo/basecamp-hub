"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay
} from "date-fns";
import ShiftSwapDialog from "./ShiftSwapDialog";

type Shift = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  employee: { id: string; full_name: string; preferred_name?: string } | null;
};

type SwapTarget = {
  shiftId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
};

export default function MonthlyCalendar({ locationId, userId }: { locationId: string; userId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [pendingSwapShiftIds, setPendingSwapShiftIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [swapTarget, setSwapTarget] = useState<SwapTarget | null>(null);

  useEffect(() => {
    fetchShifts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  async function fetchShifts() {
    setLoading(true);
    const supabase = createClient();

    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const { data: schedules } = await supabase
      .from("schedules")
      .select("id")
      .eq("location_id", locationId)
      .gte("week_start", monthStart)
      .lte("week_start", monthEnd);

    if (!schedules || schedules.length === 0) {
      setShifts([]);
      setLoading(false);
      return;
    }

    const scheduleIds = schedules.map((s) => s.id);

    const { data: shiftData } = await supabase
      .from("shifts")
      .select("id, shift_date, start_time, end_time, employee:profiles!employee_id(id, full_name, preferred_name)")
      .in("schedule_id", scheduleIds)
      .gte("shift_date", monthStart)
      .lte("shift_date", monthEnd)
      .order("start_time") as any;

    // Fetch pending swap requests made by this user
    const { data: swapRequests } = await supabase
      .from("shift_swap_requests")
      .select("requester_shift_id")
      .eq("requester_id", userId)
      .eq("status", "pending") as any;

    const pendingIds = new Set<string>((swapRequests || []).map((r: any) => r.requester_shift_id));
    setPendingSwapShiftIds(pendingIds);

    setShifts(shiftData || []);
    setLoading(false);
  }

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  function getShiftsForDay(date: Date) {
    const key = format(date, "yyyy-MM-dd");
    return shifts.filter((s) => s.shift_date === key);
  }

  const selectedShifts = selectedDay ? getShiftsForDay(selectedDay) : [];

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          ←
        </button>
        <h2 className="text-lg font-bold text-coffee-800">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          →
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-xs font-semibold text-gray-400 text-center py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {days.map((date) => {
            const dayShifts = getShiftsForDay(date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isCurrentDay = isToday(date);
            const isSelected = selectedDay && isSameDay(date, selectedDay);
            const hasMyShift = dayShifts.some((s) => (s.employee as any)?.id === userId);

            return (
              <button
                key={date.toString()}
                onClick={() => setSelectedDay(isSameDay(date, selectedDay!) ? null : date)}
                className={`rounded-xl p-2 min-h-[72px] text-left transition-all border ${
                  isSelected
                    ? "border-coffee-400 bg-coffee-50"
                    : isCurrentDay
                    ? "border-coffee-300 bg-coffee-50"
                    : "border-transparent hover:border-gray-200 bg-white"
                } ${!isCurrentMonth ? "opacity-30" : ""}`}
              >
                <p className={`text-sm font-bold mb-1 ${isCurrentDay ? "text-coffee-700" : "text-gray-700"}`}>
                  {format(date, "d")}
                </p>
                <div className="space-y-0.5">
                  {dayShifts.slice(0, 3).map((shift) => {
                    const emp = shift.employee as any;
                    const isMe = emp?.id === userId;
                    return (
                      <div
                        key={shift.id}
                        className={`text-xs px-1.5 py-0.5 rounded truncate ${
                          isMe ? "bg-coffee-200 text-coffee-800 font-medium" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {emp?.preferred_name || emp?.full_name?.split(" ")[0]}
                      </div>
                    );
                  })}
                  {dayShifts.length > 3 && (
                    <p className="text-xs text-gray-400">+{dayShifts.length - 3} more</p>
                  )}
                </div>
                {hasMyShift && !dayShifts.slice(0,3).some(s => (s.employee as any)?.id === userId) && (
                  <div className="w-1.5 h-1.5 rounded-full bg-coffee-500 mt-1"></div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Day detail panel */}
      {selectedDay && (
        <div className="mt-4 bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">
            {format(selectedDay, "EEEE, MMMM d")}
          </h3>
          {selectedShifts.length === 0 ? (
            <p className="text-sm text-gray-400">No shifts scheduled.</p>
          ) : (
            <div className="space-y-2">
              {selectedShifts.map((shift) => {
                const emp = shift.employee as any;
                const isMe = emp?.id === userId;
                const shiftDate = new Date(`${shift.shift_date}T${shift.start_time}`);
                const canSwap = isMe && shiftDate > new Date(Date.now() + 72 * 60 * 60 * 1000);

                return (
                  <div
                    key={shift.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isMe ? "bg-coffee-50 border border-coffee-200" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isMe ? "bg-coffee-200 text-coffee-800" : "bg-gray-200 text-gray-600"
                      }`}>
                        {(emp?.preferred_name || emp?.full_name)?.charAt(0)}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isMe ? "text-coffee-800" : "text-gray-700"}`}>
                          {emp?.preferred_name || emp?.full_name}
                          {isMe && <span className="ml-1 text-xs text-coffee-600">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
                        </p>
                      </div>
                    </div>

                    {isMe && pendingSwapShiftIds.has(shift.id) ? (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1.5 rounded-lg font-medium">
                        ⏳ Waiting approval
                      </span>
                    ) : canSwap ? (
                      <button
                        onClick={() => setSwapTarget({
                          shiftId: shift.id,
                          shiftDate: shift.shift_date,
                          startTime: shift.start_time,
                          endTime: shift.end_time,
                        })}
                        className="text-xs text-coffee-700 border border-coffee-300 px-2.5 py-1.5 rounded-lg hover:bg-coffee-50 transition-colors font-medium"
                      >
                        🔄 Swap shift
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {swapTarget && (
        <ShiftSwapDialog
          shiftId={swapTarget.shiftId}
          shiftDate={swapTarget.shiftDate}
          startTime={swapTarget.startTime}
          endTime={swapTarget.endTime}
          locationId={locationId}
          onClose={() => setSwapTarget(null)}
          onSuccess={() => { setSwapTarget(null); fetchShifts(); }}
        />
      )}
    </div>
  );
}
