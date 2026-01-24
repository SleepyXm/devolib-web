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
    </div>
  );
}
