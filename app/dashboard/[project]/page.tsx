"use client";

import Terminal from "../components/terminal";
import DatabasePage from "./database";
import FrontendPage from "./frontend";
import BackendPage from "./backend";
import { useContext, useState } from "react";
import { ProjectContext } from "./layout";
import WireframeView from "./wireframeview";

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
      <div className="flex gap-2 p-2 bg-gray-800 border-b border-gray-700">
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
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serviceStatus.frontend ? "bg-green-500" : "bg-red-500"
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
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serviceStatus.backend ? "bg-green-500" : "bg-red-500"
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
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serviceStatus.database ? "bg-green-500" : "bg-red-500"
            }`}
          />
          Database
        </button>

        <button
          onClick={() => setActiveView("wireframe")}
          className={`px-4 py-2 rounded flex items-center gap-2 ${
            activeView === "wireframe"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >

          WireFrame
        </button>

        <button
          onClick={() => setActiveView("terminal")}
          className={`px-4 py-2 rounded flex items-center gap-2 ${
            activeView === "terminal"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serviceStatus.container ? "bg-green-500" : "bg-red-500"
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
