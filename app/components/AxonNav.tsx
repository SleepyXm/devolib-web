"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "../handlers/auth";
import { content, cx, ui } from "../UI";
import { useUser } from "../provider/UserProvider";

export default function Navbar() {
  const { user, setUser } = useUser();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setReady(true), []);
  useEffect(() => setOpen(false), [pathname]);

  const links = [
    ...content.nav,
    ...(ready && user
      ? [
          { label: "Workspace", href: "/dashboard" },
          { label: user.username, href: "/dashboard/profile" },
        ]
      : [{ label: "Launch LIDE", href: "/login" }]),
  ];

  async function signOut() {
    await logout();
    setUser(null);
    router.push("/");
  }

  const items = (
    <>
      {links.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        const cta = link.href === "/login";
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cx(
              ui.nav,
              active && "border-white/10 bg-white/[.04] text-white",
              cta && "ml-2 border-[var(--dv-accent)] bg-[var(--dv-accent)] text-black hover:bg-white max-md:ml-0",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      {ready && user && (
        <button className={ui.nav} onClick={signOut}>
          <LogOut size={12} /> Sign out
        </button>
      )}
    </>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/10 bg-black/90 backdrop-blur-xl">
      <div className="mx-auto flex h-full w-[min(calc(100%-2rem),1180px)] items-center justify-between max-sm:w-[calc(100%-1.25rem)]">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-7 w-7 grid-cols-2 gap-[3px] border border-white/20 p-1">
            <i className="bg-[var(--dv-accent)]" /><i className="bg-white/20" />
            <i className="bg-white/20" /><i className="bg-[var(--dv-accent)]" />
          </span>
          <strong className="text-sm font-semibold">{content.brand.name}</strong>
          <small className="font-mono text-[9px] uppercase tracking-[.12em] text-white/35">
            {content.brand.product}
          </small>
        </Link>

        <nav className="flex items-center max-md:hidden">{items}</nav>
        <button
          className="hidden h-9 w-9 place-items-center border border-white/10 bg-white/[.03] max-md:grid"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>

        {open && (
          <nav className="absolute inset-x-3 top-full grid border border-white/15 bg-[var(--dv-surface)] p-2 shadow-2xl md:hidden">
            {items}
          </nav>
        )}
      </div>
    </header>
  );
}
