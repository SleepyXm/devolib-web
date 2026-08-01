"use client";

import type { ReactNode } from "react";
import { FolderKanban, LayoutDashboard, Palette, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { content, cx, ui } from "../UI";

const icons = [LayoutDashboard, FolderKanban, Palette, UserRound];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[1];
  const workspace = Boolean(segment) && !["projects", "profile", "designs"].includes(segment);

  if (workspace) return <div className="min-h-screen bg-[#090d12] pt-16">{children}</div>;

  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr] pt-16 max-md:grid-cols-1">
      <aside className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col border-r border-white/10 bg-[#0e1117]/95 p-4 max-md:top-16 max-md:z-20 max-md:h-auto max-md:overflow-x-auto max-md:border-b max-md:border-r-0 max-md:p-2">
        <div className="border-b border-white/10 px-3 pb-5 max-md:hidden">
          <span className={ui.micro}>Control plane</span>
          <strong className="mt-2 block text-sm font-medium">Project operations</strong>
        </div>
        <nav className="grid gap-1 pt-4 max-md:flex max-md:w-max max-md:pt-0">
          {content.dashboard.nav.map(([label, href], index) => {
            const Icon = icons[index];
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cx(
                  ui.nav,
                  "justify-start gap-3",
                  active && "border-white/20 bg-white/[.06] text-[var(--dv-accent)]",
                )}
              >
                <Icon size={13} /> {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 p-[clamp(1.25rem,4vw,3.5rem)] max-md:p-4">{children}</main>
    </div>
  );
}
