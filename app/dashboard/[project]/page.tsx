"use client";

import Terminal from "../components/terminal/terminal";
import DatabasePage from "./database";
import FrontendPage from "./frontend";
import BackendPage from "./backend";
import { useContext, useState } from "react";
import { ProjectContext } from "./layout";
import WireframeView from "./wireframe/wireframeview";
import { ServiceTab } from "./components/projectcomponents";

export default function ProjectPage() {
  const [activeView, setActiveView] = useState<
    "frontend" | "backend" | "database" | "wireframe" | "terminal"
  >("terminal");

  const context = useContext(ProjectContext);

  if (!context) return <div>Loading project context...</div>;

  const { serviceStatus, isConnected } = context;

  return (
  <div className="flex flex-col h-full">
    <div className="flex gap-2 p-2 bg-[#1a1e24] relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-gradient-to-l after:from-gray-200/80 after:to-gray-500">
      <div className="flex rounded py-1 px-1 bg-[#36383b40] border border-[#ffffff20]">
        <ServiceTab label="Frontend"  active={activeView === "frontend"}  hasDot online={serviceStatus.frontend}  onClick={() => { setActiveView("frontend");  if (!serviceStatus.frontend)  context.startService("frontend")  }} />
        <ServiceTab label="Backend"   active={activeView === "backend"}   hasDot online={serviceStatus.backend}   onClick={() => { setActiveView("backend");   if (!serviceStatus.backend)   context.startService("backend")   }} />
        <ServiceTab label="Database"  active={activeView === "database"}  hasDot online={serviceStatus.database}  onClick={() => { setActiveView("database");  if (!serviceStatus.database)  context.startService("database")  }} />
        <ServiceTab label="WireFrame" active={activeView === "wireframe"}        onClick={() => setActiveView("wireframe")} />
        <ServiceTab label="Container" active={activeView === "terminal"} hasDot online={serviceStatus.container} connected={isConnected} onClick={() => setActiveView("terminal")} />
      </div>
    </div>

    <div className="flex-1 overflow-hidden">
      {activeView === "frontend"  && <FrontendPage />}
      {activeView === "backend"   && <BackendPage />}
      {activeView === "database"  && <DatabasePage />}
      {activeView === "terminal"  && <Terminal />}
      {activeView === "wireframe" && <WireframeView />}
    </div>
  </div>
)
}
