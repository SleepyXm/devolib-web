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
      <div className="flex gap-2 p-2 bg-[#1a1e24] relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-gradient-to-l after:from-gray-200/80 after:to-gray-500">
        <div className="flex rounded py-1 px-1 bg-[#36383b40] border border-[#ffffff20]">
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
