"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/app/provider/UserProvider";
import ProjectsNav from "./~/projects/components/projectnav";

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

  const activeTab = pathname.split("/").pop();

  return (
    <div className="dashboard-wrapper flex min-h-screen bg-white/90 pt-13">
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

      {/* Content column */}
      <div className="flex-1 flex flex-col">
        {/* Projects sub-navbar at top of content column */}
        <ProjectsNav />

        {/* Main content below ProjectsNav */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}