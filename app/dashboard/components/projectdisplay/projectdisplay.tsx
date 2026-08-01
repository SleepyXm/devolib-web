import { ArrowUpRight } from "lucide-react";
import { Panel, Status, ui } from "@/app/UI";

export interface ProjectSummary {
  project_id: string;
  name: string;
  status: string;
  services?: { framework: string }[];
  last_online: string;
}

export function ProjectCard({
  project,
  onOpenModal,
}: {
  project: ProjectSummary;
  onOpenModal: (projectId: string) => void;
}) {
  const live = ["running", "online", "active"].includes(project.status.toLowerCase());
  return (
    <Panel
      className="grid min-h-44 cursor-pointer content-between gap-6 p-5 transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-[var(--dv-surface-raised)]"
    >
      <button className="absolute inset-0" onClick={() => onOpenModal(project.project_id)}>
        <span className="sr-only">Inspect {project.name}</span>
      </button>
      <div className="flex items-start justify-between gap-4">
        <div><span className={ui.micro}>Project runtime</span><h3 className="mt-2 text-lg font-medium">{project.name}</h3></div>
        <Status state={live ? "live" : "offline"}>{project.status || "stopped"}</Status>
      </div>
      <div className="flex flex-wrap gap-2">
        {(project.services?.length ? project.services : [{ framework: "Stack pending" }]).map((service) => (
          <span className="border border-white/10 bg-[var(--dv-surface-inset)] px-2 py-1 font-mono text-[9px] text-white/50" key={service.framework}>
            {service.framework}
          </span>
        ))}
      </div>
      <footer className="flex justify-between border-t border-white/10 pt-3 font-mono text-[9px] text-white/30">
        <span>{project.last_online ? new Date(project.last_online).toLocaleDateString() : "Not started"}</span>
        <span className="flex items-center gap-1 text-[var(--dv-accent)]">Inspect <ArrowUpRight size={10} /></span>
      </footer>
    </Panel>
  );
}
