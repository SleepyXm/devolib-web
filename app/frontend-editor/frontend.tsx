"use client";

import { useState } from "react";
import FrontendEditor from "./views/frontendeditor";
import DesignEditor from "./views/designeditor";
import { ViewToggle } from "@/app/components/viewtoggle";
import { ServiceTab } from "../dashboard/[project]/components/projectcomponents";

export default function FrontendPage() {
  const [activeView, setActiveView] = useState<"Editor" | "Designer">("Editor");

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-white/10 bg-[var(--dv-surface-inset)] px-2">
        <div className="flex">
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
      </div>
      <div className="flex-1 overflow-hidden">
        {activeView === "Editor" && <FrontendEditor />}
        {activeView === "Designer" && <DesignEditor />}
      </div>
    </div>
  );
}
