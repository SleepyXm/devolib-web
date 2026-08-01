import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Action, Empty, Panel, Status, cx, ui } from "@/app/UI";

export function SidebarTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button className={cx(ui.nav, "justify-start", active && "border-white/20 bg-white/[.06] text-[var(--dv-accent)]")} onClick={onClick}>{label}</button>;
}

export function InfoRow({ label, value, action, actionLabel }: { label: string; value?: string; action?: () => void; actionLabel?: string }) {
  return (
    <Panel inset className="flex min-h-14 items-center justify-between gap-4 px-4">
      <span className="text-xs font-medium">{label}</span>
      <div className="flex items-center gap-3 text-xs text-white/40">
        <span>{value}</span>
        {action && actionLabel && <Action className="min-h-7 px-2" tone="quiet" onClick={action}>{actionLabel}</Action>}
      </div>
    </Panel>
  );
}

export function TabSection({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="grid gap-4"><header><h2 className="text-xl font-medium">{title}</h2><p className="mt-1 text-xs text-white/40">{subtitle}</p></header><div className="grid gap-2">{children}</div></section>;
}

export function ConnectionCard({
  name, icon, connected, connectedAs, onConnect, comingSoon,
}: {
  name: string; icon: ReactNode; connected?: boolean; connectedAs?: string;
  onConnect?: () => void; onDisconnect?: () => void; comingSoon?: boolean;
}) {
  return (
    <Panel inset className={cx("flex min-h-16 items-center justify-between px-4", comingSoon && "opacity-40")}>
      <div className="flex items-center gap-3"><span className="h-6 w-6">{icon}</span><div><strong className="text-xs font-medium">{name}</strong><p className="m-0 text-[10px] text-white/35">{comingSoon ? "Coming soon" : connectedAs ? `@${connectedAs}` : "Not connected"}</p></div></div>
      {!comingSoon && (connected ? <Status>connected</Status> : <Action className="min-h-7 px-2" tone="quiet" onClick={onConnect}>Connect</Action>)}
    </Panel>
  );
}

export function ProjectCard({ name, repo, stack, lastActive }: { name: string; repo?: string; stack?: string[]; lastActive?: string }) {
  return (
    <Panel inset className="flex min-h-16 items-center justify-between px-4">
      <div><strong className="text-xs font-medium">{name}</strong><p className="m-0 font-mono text-[9px] text-white/35">{repo || stack?.join(" · ") || "Stack pending"}</p></div>
      {lastActive && <span className={ui.micro}>{lastActive}</span>}
    </Panel>
  );
}

export function AuthorisationsCard({
  name, full_name, private: isPrivate, default_branch, url,
}: {
  name: string; full_name: string; private: boolean; default_branch: string;
  updated_at: string; url: string;
}) {
  const router = useRouter();
  return (
    <Panel inset className="flex min-h-16 items-center justify-between gap-4 px-4">
      <div><strong className="text-xs font-medium">{name}</strong><p className="m-0 font-mono text-[9px] text-white/35">{full_name} · {isPrivate ? "private" : "public"} · {default_branch}</p></div>
      <Action className="min-h-7 px-2" tone="quiet" onClick={() => router.push(`/dashboard/projects?modal=import&repo=${full_name}&url=${url}`)}>Import</Action>
    </Panel>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <Empty title="Nothing here yet">{message}</Empty>;
}

export function UserAvatar({ username }: { username: string }) {
  return <div className="grid justify-items-center gap-2"><span className="grid h-14 w-14 place-items-center border border-white/15 bg-white/[.04] text-lg font-medium">{username?.[0]?.toUpperCase() ?? "?"}</span><span className="text-xs">{username}</span></div>;
}

export function SidebarActions({ onLogout }: { onLogout: () => void }) {
  return <Action tone="quiet" onClick={onLogout}>Log out</Action>;
}
