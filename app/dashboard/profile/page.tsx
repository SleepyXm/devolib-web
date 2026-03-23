"use client";
import { logout } from "@/app/handlers/auth";
import { useState, useEffect } from "react";
import { useUser } from "@/app/provider/UserProvider";
import { InfoRow, SidebarTab, TabSection, UserAvatar, SidebarActions, SectionDivider, ConnectionCard, ProjectCard, EmptyState, AuthorisationsCard } from "./profilecomponents";
import { GithubIcon, RailwayIcon, VercelIcon } from "@/app/components/assets/icons";
import { listProjects, listGithubRepos } from "@/app/handlers/projects";
import { GithubRepo } from "@/app/handlers/projects";

export default function Profile() {
  const [activeTab, setActiveTab] = useState("account");
  const { user } = useUser();
  const [hydrated, setHydrated] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [authorisations, setAuthorisations] = useState<GithubRepo[]>([]);
  
 
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
  if (activeTab === "projects") {
    listProjects().then(setProjects);
  }
}, [activeTab]);

useEffect(() => {
  if (activeTab === "authorisations") {
    listGithubRepos().then(setAuthorisations);
  }
}, [activeTab]);
 
  if (!hydrated) return null;
  if (!user) return <div>Loading...</div>;
 
  const { username } = user;

  
 
  const sessions: any[] = [];
 
  return (
    <div className="min-h-screen flex justify-center items-start py-8 relative text-black dark:text-zinc-200">
      <div className="w-[85vw] h-[85vh] border-2 border-black/70 dark:border-white/20 p-6 shadow-2xl bg-white/30 backdrop-blur-lg flex gap-6">
 
        {/* Sidebar */}
        <div className="w-48 flex flex-col items-center border-r border-black/20 dark:border-white/10 pr-4 gap-6">
          <UserAvatar username={username} />
          <div className="flex flex-col w-full gap-2">
            <SidebarTab
              label="Account"
              active={activeTab === "account"}
              onClick={() => setActiveTab("account")}
            />
            <SidebarTab
              label="Connections"
              active={activeTab === "connections"}
              onClick={() => setActiveTab("connections")}
            />
            <SidebarTab
              label="Authorisations"
              active={activeTab === "authorisations"}
              onClick={() => setActiveTab("authorisations")}
            />
            <SidebarTab
              label="Projects"
              active={activeTab === "projects"}
              onClick={() => setActiveTab("projects")}
            />
            <SidebarTab
              label="Sessions"
              active={activeTab === "sessions"}
              onClick={() => setActiveTab("sessions")}
            />
            <SidebarTab
              label="Personalization"
              active={activeTab === "personalization"}
              onClick={() => setActiveTab("personalization")}
            />
          </div>
          <SidebarActions onLogout={logout} />
        </div>
 
        {/* Content */}
        <div className="flex-1 overflow-auto flex flex-col gap-4">
 
          {activeTab === "account" && (
            <TabSection title="Account Information" subtitle="Your personal details and credentials.">
              <InfoRow label="Username" value={user.username} />
              <InfoRow label="Email" value={user.email ?? "No email on file"} action={() => {}} actionLabel="Change" />
              <InfoRow label="Password" value="••••••••" action={() => {}} actionLabel="Change" />
              <SectionDivider label="Danger Zone" />
              <InfoRow label="Delete Account" value="Permanently remove your account and all data." action={() => {}} actionLabel="Delete" actionVariant="danger" />
            </TabSection>
          )}
 
          {activeTab === "connections" && (
            <TabSection title="Connections" subtitle="Manage your linked services and integrations.">
              <ConnectionCard
                name="GitHub"
                icon={<GithubIcon />}
                connected={!!user.github_id}
                connectedAs={user.github_id}
                onConnect={() => (window.location.href = "/api/auth/github")}
                onDisconnect={() => {/* TODO: disconnect endpoint */}}
              />
              <ConnectionCard name="Vercel" icon={<VercelIcon />} comingSoon />
              <ConnectionCard name="Railway" icon={<RailwayIcon />} comingSoon />
            </TabSection>
          )}
 
          {activeTab === "projects" && (
            <TabSection title="Your Projects" subtitle="Projects you've created or imported into Devolib.">
              {projects.length === 0 ? (
                <EmptyState message="No projects yet. Create or import one to get started." />
              ) : (
                projects.map((p) => (
                  <ProjectCard key={p.project_id} name={p.name} repo={p?.repo} stack={p.services.map((s: any) => s.name)} lastActive={p.lastOnline} />
                ))
              )}
            </TabSection>
          )}
 
          {activeTab === "authorisations" && (
            <TabSection title="Authorisations" subtitle="Manage your linked services and integrations.">
              {authorisations.length === 0 ? (
                <EmptyState message="No authorisations found." />
              ) : (
                authorisations.map((a) => (
                  <AuthorisationsCard
                    key={a.id}
                    name={a.name}
                    full_name={a.full_name}
                    private={a.private}
                    default_branch={a.default_branch}
                    updated_at={a.updated_at}
                  />
                ))
              )}
            </TabSection>
          )}
 
          {activeTab === "sessions" && (
            <TabSection title="Active Sessions" subtitle="Devices and locations currently signed in to your account.">
              {sessions.length === 0 ? (
                <EmptyState message="No active sessions found." />
              ) : (
                sessions.map((s, i) => (
                  <InfoRow key={i} label={s.device} value={s.location} action={() => {}} actionLabel="Revoke" actionVariant="danger" />
                ))
              )}
            </TabSection>
          )}
 
          {activeTab === "personalization" && (
            <TabSection title="Personalization" subtitle="Customize your editor and assistant preferences.">
              <InfoRow label="Editor Theme" value="Devolib Default" action={() => {}} actionLabel="Change" />
              <InfoRow label="Design Assistant" value="Claude Sonnet" action={() => {}} actionLabel="Change" />
            </TabSection>
          )}
 
        </div>
      </div>
    </div>
  );
}