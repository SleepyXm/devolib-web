"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/handlers/auth";
import { listGithubRepos, listProjects } from "@/app/handlers/projects";
import { GithubIcon, RailwayIcon, VercelIcon } from "@/app/components/assets/icons";
import { content, PageHeader, Panel } from "@/app/UI";
import { useUser } from "@/app/provider/UserProvider";
import { GithubRepo } from "@/app/types/projects";
import {
  AuthorisationsCard, ConnectionCard, EmptyState, InfoRow, ProjectCard,
  SidebarActions, SidebarTab, TabSection, UserAvatar,
} from "./profilecomponents";

const tabs = ["account", "connections", "authorisations", "projects", "sessions"] as const;
type Tab = (typeof tabs)[number];

export default function Profile() {
  const [active, setActive] = useState<Tab>("account");
  const [projects, setProjects] = useState<any[]>([]);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const { user, setUser } = useUser();
  const router = useRouter();

  useEffect(() => { if (active === "projects") void listProjects().then(setProjects); }, [active]);
  useEffect(() => { if (active === "authorisations") void listGithubRepos().then(setRepos); }, [active]);
  if (!user) return <div className="text-sm text-white/40">Loading account…</div>;

  async function signOut() {
    await logout();
    setUser(null);
    router.push("/");
  }

  return (
    <div className="grid gap-8">
      <PageHeader {...content.profile} />
      <Panel className="grid min-h-[620px] grid-cols-[190px_1fr] gap-6 p-5 max-lg:grid-cols-1">
        <aside className="flex flex-col gap-5 border-r border-white/10 pr-5 max-lg:border-b max-lg:border-r-0 max-lg:pb-5 max-lg:pr-0">
          <UserAvatar username={user.username} />
          <nav className="grid gap-1">{tabs.map((tab) => <SidebarTab key={tab} label={tab} active={active === tab} onClick={() => setActive(tab)} />)}</nav>
          <div className="mt-auto"><SidebarActions onLogout={() => void signOut()} /></div>
        </aside>

        <div className="min-w-0">
          {active === "account" && (
            <TabSection title="Account information" subtitle="Identity and credentials.">
              <InfoRow label="Username" value={user.username} />
              <InfoRow label="Email" value={user.email ?? "No email on file"} action={() => undefined} actionLabel="Change" />
              <InfoRow label="Password" value="••••••••" action={() => undefined} actionLabel="Change" />
            </TabSection>
          )}
          {active === "connections" && (
            <TabSection title="Connections" subtitle="Linked source and deployment providers.">
              <ConnectionCard name="GitHub" icon={<GithubIcon />} connected={Boolean(user.github_id)} connectedAs={user.github_id} onConnect={() => { window.location.href = "/api/auth/github"; }} />
              <ConnectionCard name="Vercel" icon={<VercelIcon />} comingSoon />
              <ConnectionCard name="Railway" icon={<RailwayIcon />} comingSoon />
            </TabSection>
          )}
          {active === "authorisations" && (
            <TabSection title="GitHub authorisations" subtitle="Repositories available to import.">
              {repos.length ? repos.map((repo) => <AuthorisationsCard key={repo.id} {...repo} />) : <EmptyState message="No repositories authorised." />}
            </TabSection>
          )}
          {active === "projects" && (
            <TabSection title="Owned projects" subtitle="Runtimes attached to this identity.">
              {projects.length ? projects.map((project) => <ProjectCard key={project.project_id} name={project.name} repo={project.repo} stack={project.services?.map((service: any) => service.name)} lastActive={project.last_online} />) : <EmptyState message="No projects yet." />}
            </TabSection>
          )}
          {active === "sessions" && <TabSection title="Active sessions" subtitle="Signed-in devices and locations."><EmptyState message="No active sessions reported." /></TabSection>}
        </div>
      </Panel>
    </div>
  );
}
