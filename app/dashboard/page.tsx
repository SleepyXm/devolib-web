"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { listProjects } from "../handlers/projects";
import { Action, content, Empty, PageHeader, Panel, Status } from "../UI";
import { useUser } from "../provider/UserProvider";
import { ProjectCard, ProjectSummary } from "./components/projectdisplay/projectdisplay";
import { ProjectModal } from "./components/projectdisplay/projectmodal";

export default function DashboardPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  useEffect(() => {
    if (!user?.username) return;
    listProjects().then(setProjects).catch(() => setProjects([])).finally(() => setLoading(false));
  }, [user?.username]);

  const running = projects.filter((project) =>
    ["running", "online", "active"].includes(project.status.toLowerCase()),
  ).length;
  const services = projects.reduce((sum, project) => sum + (project.services?.length ?? 0), 0);

  return (
    <div className="grid gap-8">
      <PageHeader
        {...content.dashboard}
        title={user?.username ? `${user.username}'s runtimes` : content.dashboard.title}
        action={<Status>control plane ready</Status>}
      />

      <section className="grid grid-cols-3 gap-px border border-white/10 bg-white/10 max-sm:grid-cols-1">
        {[["Projects", projects.length], ["Running", running], ["Services", services]].map(([label, value]) => (
          <Panel className="border-0 p-5" key={label}>
            <span className="font-mono text-[10px] uppercase text-white/35">{label}</span>
            <strong className="mt-5 block text-3xl font-medium">{value}</strong>
          </Panel>
        ))}
      </section>

      <section className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Recent projects</h2>
          <Action href="/dashboard/projects" tone="quiet" className="min-h-8 px-3">
            All projects <ArrowRight size={11} />
          </Action>
        </div>
        {loading ? (
          <Empty title="Reading project state">Loading your registered runtimes.</Empty>
        ) : projects.length === 0 ? (
          <Empty
            title="No runtime yet"
            action={<Action href="/dashboard/projects?modal=import">Import repository</Action>}
          >
            Import a real full-stack project and LIDE will build its workspace.
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
            {projects.slice(0, 4).map((project) => (
              <ProjectCard key={project.project_id} project={project} onOpenModal={setSelected} />
            ))}
          </div>
        )}
      </section>

      {selected && (
        <ProjectModal
          projectId={selected}
          projectName={projects.find((project) => project.project_id === selected)?.name ?? "Project"}
          onClose={() => setSelected("")}
        />
      )}
    </div>
  );
}
