"use client";
import { useState, useEffect } from "react";
import { useUser } from "../provider/UserProvider";
import { logout } from "../handlers/auth";
import { useRouter } from "next/navigation";
 
const Navbar = () => {
  const { user, setUser } = useUser();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
 
  useEffect(() => {
    setMounted(true);
  }, []);
 
  if (!mounted) return null;
 
  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push("/");
  };
 
  const links = [
    { label: "Home", url: "/" },
    ...(user
      ? [
          { label: user.username, url: "/dashboard/profile" },
          { label: "Dashboard", url: "/dashboard" },
          { label: "Sign out", onClick: handleLogout },
        ]
      : [{ label: "Sign in", url: "/login", cta: true }]),
  ];
 
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-[11px] bg-white/20 dark:bg-white/[0.055] backdrop-blur-2xl border-b border-white/40 dark:border-white/[0.09]">
 
      {/* Logo */}
      <a href="/" className="flex items-center no-underline">
        <div className="px-3 rounded-[1px] flex items-center justify-center bg-[#00e0c0] dark:bg-[#ff6219] shadow-[0_0_14px_rgba(0,224,192,0.45),0_0_32px_rgba(0,224,192,0.45)] dark:shadow-[0_0_14px_rgba(255,140,66,0.5),0_0_32px_rgba(255,140,66,0.5)] flex-shrink-0">
          <span className="text-2xl font-thin tracking-[-0.4px] text-[#0a0a0a] whitespace-nowrap">
            DevoLib
          </span>
        </div>
      </a>
 
      {/* Desktop links */}
      <nav className="hidden md:block">
        <ul className="flex items-center gap-0.5 list-none">
          {links.map((link) => (
            <li key={link.label}>
              {link.url ? (
                <a
                  href={link.url}
                  className={
                    link.cta
                      ? // Sign in — accent pill
                        "block px-4 py-[7px] rounded-[1px] text-xs font-medium no-underline transition-all duration-150 active:scale-[0.97] bg-[#00e0c0] dark:bg-[#ff6219] text-[#0a0a0a] shadow-[0_2px_22px_rgba(0,224,192,0.45),0_0_44px_rgba(0,224,192,0.45)] dark:shadow-[0_2px_22px_rgba(255,140,66,0.5),0_0_44px_rgba(255,140,66,0.5)] hover:brightness-110"
                      : // Regular link — ghost pill
                        "block px-4 py-[7px] rounded-[1px] text-xs font-medium no-underline text-black/45 dark:text-white/45 hover:bg-[#00e0c0] hover:shadow-[0_0_14px_rgba(0,224,192,0.45),0_0_32px_rgba(0,224,192,0.45)] dark:hover:bg-[#ff6219] dark:hover:shadow-[0_0_14px_rgba(255,140,66,0.5),0_0_32px_rgba(255,140,66,0.5)] hover:text-black dark:hover:text-[#000000] transition-all duration-150"
                  }
                >
                  {link.label}
                </a>
              ) : (
                <button
                  onClick={link.onClick}
                  className="block px-4 py-[7px] rounded-[1px] text-xs font-medium bg-transparent border-none cursor-pointer text-black/45 dark:text-white/45 hover:bg-[#00e0c0] hover:shadow-[0_0_14px_rgba(0,224,192,0.45),0_0_32px_rgba(0,224,192,0.45)] dark:hover:bg-[#ff6219] dark:hover:shadow-[0_0_14px_rgba(255,140,66,0.5),0_0_32px_rgba(255,140,66,0.5)] hover:text-black dark:hover:text-[#000000] transition-all duration-150"
                >
                  {link.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
 
      {/* Mobile toggle */}
      <button
        className="md:hidden flex items-center justify-center w-[38px] h-[38px] rounded-[10px] border-none cursor-pointer bg-white/20 dark:bg-white/[0.055] backdrop-blur-md text-black dark:text-[#f0f0f0] hover:bg-white/40 dark:hover:bg-white/[0.09] transition-all duration-150"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label="Toggle menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
 
      {/* Mobile menu */}
      {mobileOpen && (
        <ul className="absolute top-full left-0 right-0 flex flex-col gap-0.5 list-none bg-white/20 dark:bg-white/[0.055] backdrop-blur-2xl border-b border-white/40 dark:border-white/[0.09] px-4 pb-3 pt-2 md:hidden">
          {links.map((link) => (
            <li key={link.label}>
              {link.url ? (
                <a
                  href={link.url}
                  className="block w-full px-[14px] py-[10px] rounded-[10px] text-sm font-medium no-underline text-black/45 dark:text-white/45 hover:bg-white/40 dark:hover:bg-white/[0.09] hover:text-black dark:hover:text-[#f0f0f0] transition-all duration-150"
                >
                  {link.label}
                </a>
              ) : (
                <button
                  onClick={link.onClick}
                  className="block w-full text-left px-[14px] py-[10px] rounded-[10px] text-sm font-medium bg-transparent border-none cursor-pointer text-black/45 dark:text-white/45 hover:bg-white/40 dark:hover:bg-white/[0.09] hover:text-black dark:hover:text-[#f0f0f0] transition-all duration-150"
                >
                  {link.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </header>
  );
};
 
export default Navbar;