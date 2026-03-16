"use client";

import Terminal from "../components/terminal";
import DatabasePage from "./database";
import FrontendPage from "./frontend";
import BackendPage from "./backend";
import { useContext, useState } from "react";
import { ProjectContext } from "./layout";
import WireframeView from "./wireframe/wireframeview";

export default function ProjectPage() {
  const [activeView, setActiveView] = useState<
    "frontend" | "backend" | "database" | "wireframe" | "terminal"
  >("terminal");

  const context = useContext(ProjectContext);

  if (!context) return <div>Loading project context...</div>;

  const { serviceStatus } = context;

  return (
    <div className="flex flex-col h-screen">
      {/* Tab buttons */}
      <div className="flex gap-2 p-2 bg-[#1a1e24] border-b border-gray-700">
        <button
          onClick={() => {
            console.log("Button clicked!");
            console.log("Context:", context);
            console.log("serviceStatus:", serviceStatus);
            console.log("startService exists?", typeof context.startService);

            setActiveView("frontend");
            if (!serviceStatus.frontend) {
              console.log("Calling startService...");
              context.startService("frontend");
            }
          }}
          className={`px-4 py-2 rounded flex items-center gap-2 ${
            activeView === "frontend"
              ? "bg-[#222830] border border-[#2e3540] text-white"
              : "bg-transparent border-transparent text-[#3a4050] transition-all hover:text-zinc-400 duration-400"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serviceStatus.frontend ? "bg-[#50c878]" : "bg-[#c85050]"
            } ${
              activeView === "frontend"
                ? serviceStatus.frontend
                  ? "shadow-[0_0_4px_rgba(80,200,120,0.6)]"
                  : "shadow-[0_0_4px_rgba(200,80,80,0.6)]"
                : ""
            }`}
          />
          Frontend
        </button>

        <button
          onClick={() => {
            console.log("Button clicked!");
            console.log("Context:", context);
            console.log("serviceStatus:", serviceStatus);
            console.log("startService exists?", typeof context.startService);

            setActiveView("backend");
            if (!serviceStatus.backend) {
              console.log("Calling startService...");
              context.startService("backend");
            }
          }}
          className={`px-4 py-2 rounded flex items-center gap-2 ${
            activeView === "backend"
              ? "bg-[#222830] border border-[#2e3540] text-white"
              : "bg-transparent border-transparent text-[#3a4050] transition-all hover:text-zinc-400 duration-400"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serviceStatus.backend ? "bg-[#50c878]" : "bg-[#c85050]"
            } ${
              activeView === "backend"
                ? serviceStatus.backend
                  ? "shadow-[0_0_4px_rgba(80,200,120,0.6)]"
                  : "shadow-[0_0_4px_rgba(200,80,80,0.6)]"
                : ""
            }`}
          />
          Backend
        </button>

        <button
          onClick={() => {
            console.log("Button clicked!");
            console.log("Context:", context);
            console.log("serviceStatus:", serviceStatus);
            console.log("startService exists?", typeof context.startService);

            setActiveView("database");
            if (!serviceStatus.database) {
              console.log("Calling startService...");
              context.startService("database");
            }
          }}
          className={`px-4 py-2 rounded flex items-center gap-2 ${
            activeView === "database"
              ? "bg-[#222830] border border-[#2e3540] text-white"
              : "bg-transparent border-transparent text-[#3a4050] transition-all hover:text-zinc-400 duration-400"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serviceStatus.database ? "bg-[#50c878]" : "bg-[#c85050]"
            } ${
              activeView === "database"
                ? serviceStatus.database
                  ? "shadow-[0_0_4px_rgba(80,200,120,0.6)]"
                  : "shadow-[0_0_4px_rgba(200,80,80,0.6)]"
                : ""
            }`}
          />
          Database
        </button>

        <button
          onClick={() => setActiveView("wireframe")}
          className={`px-4 py-2 rounded flex items-center gap-2 ${
            activeView === "wireframe"
              ? "bg-[#222830] border border-[#2e3540] text-white"
              : "bg-transparent border-transparent text-[#3a4050] transition-all hover:text-zinc-400 duration-400"
          }`}
        >
          WireFrame
        </button>

        <button
          onClick={() => setActiveView("terminal")}
          className={`px-4 py-2 rounded flex items-center gap-2 ${
            activeView === "terminal"
              ? "bg-[#222830] border border-[#2e3540] text-white"
              : "bg-transparent border-transparent text-[#3a4050] transition-all hover:text-zinc-400 duration-400"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serviceStatus.container ? "bg-[#50c878]" : "bg-[#c85050]"
            } ${
              activeView === "terminal"
                ? serviceStatus.container
                  ? "shadow-[0_0_4px_rgba(80,200,120,0.6)]"
                  : "shadow-[0_0_4px_rgba(200,80,80,0.6)]"
                : ""
            }`}
          />
          Container
        </button>
      </div>

      {/* Render active view */}
      <div className="flex-1 overflow-hidden">
        {activeView === "frontend" && <FrontendPage />}
        {activeView === "backend" && <BackendPage />}
        {activeView === "database" && <DatabasePage />}
        {activeView === "terminal" && <Terminal />}
        {activeView === "wireframe" && <WireframeView />}
      </div>
    </div>
  );
}
