import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="dashboard-wrapper flex min-h-screen pt-[4%]">
      {/* Sidebar */}
      <aside className="w-[10vw] bg-gray-900 p-4">
        <h2 className="font-bold mb-4">Dashboard Sidebar</h2>
        <ul>
          <li>Projects</li>
          <li>Designs</li>
          <li>Settings</li>
        </ul>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">
        {children} {/* This will render projects.tsx, designs.tsx, etc. */}
      </main>
    </div>
  );
}