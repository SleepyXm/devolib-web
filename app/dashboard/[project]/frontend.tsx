"use client";

import { useState } from "react";
import FrontendEditor from "./frontend/frontendeditor";
import DesignEditor from "./frontend/designeditor";
import { ViewToggle } from "@/app/components/viewtoggle";
import { ServiceTab } from "./components/projectcomponents";

export default function FrontendPage() {
  const [activeView, setActiveView] = useState<"Editor" | "Designer">("Editor");

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-2 bg-gray-800 border-b border-gray-700">
        <ServiceTab
          label="Editor"
          active={activeView === "Editor"}
          onClick={() => setActiveView("Editor")}
        />
        <ServiceTab
          label="Designer"
          active={activeView === "Designer"}
          onClick={() => setActiveView("Designer")}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        {activeView === "Editor" && <FrontendEditor />}
        {activeView === "Designer" && <DesignEditor />}
      </div>
    </div>
  );
}
