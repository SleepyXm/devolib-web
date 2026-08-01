"use client";

import { useContext, useState } from "react";
import BackendPage from "@/app/backend-editor/views/backend";
import DatabasePage from "@/app/database-edtior/database";
import FrontendPage from "@/app/frontend-editor/frontend";
import Terminal from "@/app/terminal/terminal";
import WireframeView from "@/app/wireframe/views/wireframeview";
import { Action, Status, ui } from "@/app/UI";
import { ProjectContext } from "./layout";
import { ServiceTab } from "./components/projectcomponents";

type View = "frontend" | "backend" | "database" | "wireframe" | "terminal";

export default function ProjectPage() {
  const [view, setView] = useState<View>("terminal");
  const project = useContext(ProjectContext);
  if (!project) return <div className="p-5 text-sm text-white/40">Loading project context…</div>;

  const select = (next: View, service?: "frontend" | "backend" | "database") => {
    setView(next);
    if (service && !project.serviceStatus[service]) project.startService(service);
  };

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-rows-[52px_44px_1fr] overflow-hidden">
      <header className="flex items-center justify-between border-b border-white/10 bg-[var(--dv-surface-inset)] px-4">
        <div className="flex items-center gap-3"><span className={ui.micro}>Workspace</span><strong className="text-sm font-medium">{project.projectName ?? "Project runtime"}</strong></div>
        <div className="flex items-center gap-2">
          <Status state={project.serviceStatus.container ? "live" : "offline"}>{project.serviceStatus.container ? "container live" : "container stopped"}</Status>
          {!project.isRunning && <Action className="min-h-7 px-2" onClick={() => void project.start()}>Start</Action>}
          {project.isRunning && !project.isConnected && <Action className="min-h-7 px-2" tone="quiet" onClick={() => project.connect()}>Connect</Action>}
          {project.isRunning && <Action className="min-h-7 px-2" tone="quiet" onClick={() => void project.stop()}>Stop</Action>}
        </div>
      </header>

      <nav className="flex items-center gap-1 overflow-x-auto border-b border-white/10 bg-[#0d1219] px-2">
        <ServiceTab label="Frontend" active={view === "frontend"} hasDot online={project.serviceStatus.frontend} onClick={() => select("frontend", "frontend")} />
        <ServiceTab label="Backend" active={view === "backend"} hasDot online={project.serviceStatus.backend} onClick={() => select("backend", "backend")} />
        <ServiceTab label="Database" active={view === "database"} hasDot online={project.serviceStatus.database} onClick={() => select("database", "database")} />
        <ServiceTab label="System map" active={view === "wireframe"} onClick={() => select("wireframe")} />
        <ServiceTab label="Container" active={view === "terminal"} hasDot online={project.serviceStatus.container} connected={project.isConnected} onClick={() => select("terminal")} />
      </nav>

      <main className="min-h-0 overflow-hidden bg-[var(--dv-canvas)]">
        {view === "frontend" && <FrontendPage />}
        {view === "backend" && <BackendPage />}
        {view === "database" && <DatabasePage />}
        {view === "terminal" && <Terminal />}
        {view === "wireframe" && <WireframeView />}
      </main>
    </div>
  );
}
