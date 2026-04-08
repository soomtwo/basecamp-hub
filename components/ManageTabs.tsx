"use client";

import { useState } from "react";
import AutoScheduleCalendar from "./AutoScheduleCalendar";
import CreateShiftForm from "./CreateShiftForm";

type Location = { id: string; name: string; city: string };

export default function ManageTabs({ locations }: { locations: Location[] }) {
  const [tab, setTab] = useState<"auto" | "manual">("auto");

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("auto")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "auto" ? "bg-white text-coffee-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ✨ Auto-generate
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "manual" ? "bg-white text-coffee-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          + Single shift
        </button>
      </div>

      {tab === "auto" ? (
        <AutoScheduleCalendar locations={locations} />
      ) : (
        <CreateShiftForm locations={locations} />
      )}
    </div>
  );
}
