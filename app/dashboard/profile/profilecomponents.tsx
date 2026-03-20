import { ReactNode } from "react";

export function SidebarTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2 text-left rounded-md ${
        active
          ? "text-black font-semibold dark:text-zinc-200"
          : "text-black/50 dark:text-zinc-200 duration-300 transition-all hover:bg-black/70 hover:text-white"
      }`}
    >
      {label}
    </button>
  )
}

export function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between border-2 border-black rounded-lg dark:border-white p-3">
      <span className="font-medium">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export function TabSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h2 className="text-3xl font-semibold mt-6">{title}</h2>
      <div className="flex flex-col gap-3 mt-[2%]">
        {children}
      </div>
    </>
  )
}

export function UserAvatar({ username }: { username: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-medium text-black dark:text-zinc-200">
        {username ? username[0].toUpperCase() : "?"}
      </div>
      <div className="text-black text-sm mt-1">{username}</div>
    </div>
  )
}

export function SidebarActions({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="flex flex-col gap-2 mt-auto w-full">
      
       <a href="/settings"
        className="w-full px-3 py-2 rounded-lg bg-white/5 text-black border border-white/10 text-center dark:text-zinc-200"
      >
        Settings
      </a>
      <button
        onClick={onLogout}
        className="w-full px-3 py-2 border-2 border-black bg-red-500 hover:bg-red-400 transition"
      >
        Log out
      </button>
    </div>
  )
}