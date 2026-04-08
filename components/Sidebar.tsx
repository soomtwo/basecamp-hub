"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/dashboard/directory", label: "Directory", icon: "👥" },
  { href: "/dashboard/schedule", label: "Schedule", icon: "📅" },
  { href: "/dashboard/vacation", label: "Vacation", icon: "🌴" },
  { href: "/dashboard/shifts", label: "Shift Swaps", icon: "🔄" },
];

export default function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navContent = (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-coffee-100 text-coffee-800"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-gray-400">Signed in as</p>
          <p className="text-sm font-medium text-gray-700 truncate">{userName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 min-h-screen flex-col flex-shrink-0">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <div>
              <p className="font-bold text-coffee-800 leading-tight">Basecamp Hub</p>
              <p className="text-xs text-gray-400">Internal Portal</p>
            </div>
          </div>
        </div>
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">☕</span>
          <p className="font-bold text-coffee-800">Basecamp Hub</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
          aria-label="Open menu"
        >
          <div className="w-5 h-0.5 bg-gray-600 mb-1"></div>
          <div className="w-5 h-0.5 bg-gray-600 mb-1"></div>
          <div className="w-5 h-0.5 bg-gray-600"></div>
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <div>
              <p className="font-bold text-coffee-800 leading-tight">Basecamp Hub</p>
              <p className="text-xs text-gray-400">Internal Portal</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg hover:bg-gray-50 text-gray-500 text-xl"
          >
            ✕
          </button>
        </div>
        {navContent}
      </div>
    </>
  );
}
