"use client";

import { usePathname } from "next/navigation";

export function Topbar() {
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname === "/onboarding") return "New Project";
    if (pathname === "/settings") return "Settings";
    if (pathname.startsWith("/projects/")) return "Project";
    return "G2M Platform";
  };

  return (
    <div className="border-b border-slate-200 bg-white px-8 py-4">
      <h1 className="text-lg font-semibold text-slate-900">{getTitle()}</h1>
    </div>
  );
}
