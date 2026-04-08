/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, position, department, location:locations(name)")
    .eq("id", user.id)
    .single() as any;

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const locationName = profile?.location?.name ?? null;

  const cards = [
    { href: "/dashboard/directory", icon: "👥", title: "Directory", desc: "Find your teammates" },
    { href: "/dashboard/schedule", icon: "📅", title: "Schedule", desc: "View this week's shifts" },
    { href: "/dashboard/vacation", icon: "🌴", title: "Vacation", desc: "Request time off" },
    { href: "/dashboard/shifts", icon: "🔄", title: "Shift Swaps", desc: "Trade shifts with coworkers" },
  ];

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-coffee-800">Hey, {firstName}! 👋</h1>
        {profile && (
          <p className="text-gray-500 mt-1">
            {profile.position} · {profile.department}
            {locationName && ` · ${locationName}`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-xl p-6 border border-gray-100 hover:border-coffee-300 hover:shadow-sm transition-all group"
          >
            <div className="text-3xl mb-3">{card.icon}</div>
            <h2 className="font-semibold text-gray-800 group-hover:text-coffee-700">{card.title}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
