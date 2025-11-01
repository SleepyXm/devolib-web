"use client";
import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/app/provider/UserProvider";
import FrontendPage from "./~/projects/frontend/page";
import BackendPage from "./~/projects/backend/page";
import DatabasePage from "./~/projects/database/page";
import ProjectsPage from "./~/projects/page";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const user = useUser();
  const name = user?.user?.username ?? "default";

  const tabs = [
    { name: "Home", href: `/${name}s-dashboard/` },
    { name: "Projects", href: `/dashboard/~/projects` },
    { name: "Designs", href: `/dashboard/~/designs` },
    { name: "Settings", href: `/dashboard/~/settings` },
  ];

  // Derive active tab from URL path
  const activeTab = pathname.split("/").pop();

  return (
    <div className="bg-white/90 dashboard-wrapper flex min-h-screen pt-19">
      {/* Sidebar */}
      <aside className="w-[10vw] bg-gray-900 p-4">
        <h2 className="font-bold mb-4 text-white">Dashboard Sidebar</h2>
        <ul className="space-y-2">
          {tabs.map((tab) => (
            <li key={tab.name}>
              <Link href={tab.href} replace>
                <button
                  className={`w-full text-left px-2 py-1 rounded ${
                    activeTab === tab.href.split("/").pop()
                      ? "bg-blue-500 text-white"
                      : "hover:bg-gray-700 text-white"
                  }`}
                >
                  {tab.name}
                </button>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">
        {/* Routed page content */}
        {children}

        {/* Additional manual components you want rendered */}
      </main>
    </div>
  );
}