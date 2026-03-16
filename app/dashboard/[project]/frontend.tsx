"use client";

import { useState } from "react";
import FrontendEditor from "./frontend/frontendeditor";
import DesignEditor from "./frontend/designeditor";
import { ViewToggle } from "./frontend/helpers/viewtoggle";

export default function FrontendPage() {
  const [activeView, setActiveView] = useState<"Editor" | "Designer">("Editor");

  return (
    <div className="flex flex-col h-full">
      <ViewToggle
        active={activeView}
        views={["Editor", "Designer"]}
        onChange={(v) => setActiveView(v as "Editor" | "Designer")}
      />
      <div className="flex-1 overflow-hidden">
        {activeView === "Editor" && <FrontendEditor />}
        {activeView === "Designer" && <DesignEditor />}
      </div>
    </div>
  );
}
