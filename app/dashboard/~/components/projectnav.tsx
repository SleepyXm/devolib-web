"use client";

import { useState } from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";

export default function ProjectsNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const params = useParams();
  const project = Array.isArray(params?.project) ? params.project[0] : params?.project;

  const links = [
    { name: "Front-End", href: `/dashboard/~/${project}/frontend` },
    { name: "Back-End", href: `/dashboard/~/${project}/backend` },
    { name: "Database", href: `/dashboard/~/${project}/database` },
  ];

  const activeTab = pathname.split("/").pop();

  return (
    <div className="w-min-screen">
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
          {/* Brand */}

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {links.map((link) => (
            <b key={link.name}>
              <Link href={link.href} replace>
                <button
                  className={`w-full text-left px-2 py-1 rounded ${
                    activeTab === link.href.split("/").pop()
                      ? "bg-blue-500 text-white"
                      : "hover:bg-gray-700 text-white"
                  }`}
                >
                  {link.name}
                </button>
              </Link>
            </b>
          ))}
          </nav>

          {/* Search Documentation - Desktop */}
          <div className="hidden lg:flex flex-1 max-w-xl mx-6">
            <div className="w-full relative">
              <input
                type="text"
                placeholder="Search documentation..."
                className="placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition xl:bg-gray-950 text-sm text-white bg-black/70 w-full h-10 border-gray-800 border rounded-xl pr-10 pl-10 backdrop-blur"
              />
              <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-white/50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-search w-4 h-4"
                  style={{ strokeWidth: "1.5" }}
                >
                  <path d="m21 21-4.34-4.34"></path>
                  <circle cx="11" cy="11" r="8"></circle>
                </svg>
              </div>
              <button className="absolute right-2 inset-y-0 my-auto inline-flex items-center justify-center h-7 px-2 rounded-lg text-xs transition bg-white/5 text-white/60 hover:text-white hover:bg-white/10">
                ⌘K
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="lg:hidden pb-3 px-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full h-10 pr-10 pl-10 rounded-xl border backdrop-blur placeholder-white/40 text-sm outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition border-white/5 bg-black/70 text-white"
            />
            <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-white/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-search w-4 h-4"
                style={{ strokeWidth: 1.5 }}
              >
                <path d="m21 21-4.34-4.34"></path>
                <circle cx="11" cy="11" r="8"></circle>
              </svg>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <nav className="md:hidden bg-black/80 backdrop-blur border-t border-white/5 p-4 flex flex-col gap-2">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="px-4 py-2 rounded-lg border border-white/5 text-white/70 hover:text-white hover:bg-white/5 text-sm"
              >
                {link.name}
              </a>
            ))}
          </nav>
        )}
      </header>
    </div>
  );
}
