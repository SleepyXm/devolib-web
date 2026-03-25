"use client";
import type { ReactNode } from "react";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/app/provider/UserProvider";
import { useRouter } from "next/navigation";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, resolved } = useUser();
  const name = user?.username;
  const router = useRouter();


  const tabs = [
    { name: "Dashboard", href: `/dashboard` },
    { name: "Projects", href: `/dashboard/projects` },
    { name: "Designs", href: `/dashboard/designs` },
    { name: "Profile", href: `/dashboard/profile` },
  ];

  const activeTab = pathname.split("/").pop();

  useEffect(() => {
  if (resolved && !user) {
    router.replace("/login");
  }
}, [resolved, user, router]);

if (!resolved) return null;


  return (
    <div className="flex min-h-screen pt-13">
      <aside className="w-[9.5vw] bg-white/20 dark:bg-white/[0.055] backdrop-blur-2xl border border-white/40 dark:border-white/[0.09] p-2 z-0">
        <h2 className="font-bold mb-4 text-black dark:text-white">Dashboard Sidebar</h2>
        <ul className="space-y-2">
          {tabs.map((tab) => (
            <li key={tab.name}>
              <Link href={tab.href} replace>
                <button
                  className={`w-full text-left px-2 py-1 rounded-[1px] ${
                    activeTab === tab.href.split("/").pop()
                      ? "bg-gradient-to-l from-gray-500/80 to-gray-200 border-l border-[#474849] text-black"
                      : "transition-all duration-300 hover:bg-[#00e0c0] hover:shadow-[0_0_14px_rgba(0,224,192,0.45),0_0_32px_rgba(0,224,192,0.45)] dark:hover:bg-[#ff6219] dark:hover:shadow-[0_0_14px_rgba(255,140,66,0.5),0_0_32px_rgba(255,140,66,0.5)] hover:text-black dark:hover:text-[#000000]"
                  }`}
                >
                  {tab.name}
                </button>
              </Link>
            </li>
          ))}
        </ul>
      </aside>


      <div className="flex-1 flex flex-col">

        <main className="flex-1 z-50">
          {children}
        </main>
      </div>
    </div>
  );
}