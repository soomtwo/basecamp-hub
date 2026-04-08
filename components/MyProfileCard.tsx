"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  preferred_name?: string;
  position?: string;
  department?: string;
  photo_url?: string;
  anniversary_month?: number;
  anniversary_day?: number;
  hire_date?: string;
  manager_name?: string;
};

type PositionOption = {
  title: string;
  category: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function MyProfileCard({
  profile,
  positions,
}: {
  profile: Profile;
  positions: PositionOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [preferredName, setPreferredName] = useState(profile.preferred_name || profile.full_name || "");
  const [position, setPosition] = useState(profile.position || "");
  const [photoUrl, setPhotoUrl] = useState(profile.photo_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const hireYear = profile.hire_date ? new Date(profile.hire_date).getFullYear() : null;
  const yearsIn = hireYear ? new Date().getFullYear() - hireYear : null;
  const anniversary =
    profile.anniversary_month && profile.anniversary_day
      ? `${MONTHS[profile.anniversary_month - 1]} ${getOrdinal(profile.anniversary_day)}`
      : null;

  // Group positions by category for the dropdown
  const grouped = positions.reduce((acc: Record<string, string[]>, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p.title);
    return acc;
  }, {});

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const fileName = `${profile.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setPhotoUrl(data.publicUrl);
    }

    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ preferred_name: preferredName, photo_url: photoUrl, position })
      .eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  }

  const displayName = preferredName || profile.full_name;
  const displayPosition = position || profile.position;

  return (
    <div className="bg-white rounded-xl border-2 border-coffee-300 p-5 mb-8">
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-coffee-100 flex items-center justify-center overflow-hidden">
            {photoUrl && photoUrl.startsWith("http") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={displayName} className="object-cover w-full h-full" />
            ) : (
              <span className="text-coffee-600 font-bold text-2xl">
                {displayName?.charAt(0) || "?"}
              </span>
            )}
          </div>
          {editing && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 bg-coffee-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-coffee-800 transition-colors"
            >
              {uploading ? "…" : "📷"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {editing ? (
              <input
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                className="font-bold text-gray-800 text-lg border-b-2 border-coffee-400 focus:outline-none bg-transparent w-48"
                placeholder="Preferred name"
              />
            ) : (
              <p className="font-bold text-gray-800 text-lg">{displayName}</p>
            )}
            <span className="text-xs bg-coffee-100 text-coffee-700 px-2 py-0.5 rounded-full">You</span>
          </div>

          {editing ? (
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-coffee-400 text-gray-700 mt-1"
            >
              <option value="">Select position...</option>
              {Object.entries(grouped).map(([category, titles]) => (
                <optgroup key={category} label={category}>
                  {titles.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-500">{displayPosition}</p>
          )}

          <p className="text-xs text-gray-400 mt-0.5">{profile.department}</p>
          {profile.manager_name && (
            <p className="text-xs text-gray-400 mt-0.5">Reports to {profile.manager_name}</p>
          )}
        </div>

        <div className="text-right text-xs text-gray-400 space-y-0.5 flex-shrink-0">
          {anniversary && <p>🎂 {anniversary}</p>}
          {yearsIn !== null && <p>⏱ {yearsIn}y with Basecamp</p>}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-coffee-700 hover:text-coffee-800 font-medium"
          >
            ✏️ Edit my profile
          </button>
        ) : (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm bg-coffee-700 text-white px-4 py-1.5 rounded-lg hover:bg-coffee-800 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5"
            >
              Cancel
            </button>
          </>
        )}
        {saved && <p className="text-sm text-green-600">Saved!</p>}
      </div>
    </div>
  );
}
