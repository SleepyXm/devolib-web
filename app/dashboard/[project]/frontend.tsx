"use client";

import { useState, useEffect, useContext } from "react";
import FrontendEditor from "./frontend/frontendeditor";
import DesignEditor from "./frontend/designeditor";

export default function FrontendPage() {
  const [activeView, setActiveView] = useState<"Editor" | "Designer">("Editor");

  return (
    <div className="flex flex-col h-full">

      <div className="flex gap-2 p-2 bg-gray-800 border-b border-gray-700">
        <button
          onClick={() => setActiveView("Editor")}
          className={`px-4 py-2 rounded ${
            activeView === "Editor"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => setActiveView("Designer")}
          className={`px-4 py-2 rounded ${
            activeView === "Designer"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          Designer
        </button>
      </div>


      <div className="flex-1 overflow-hidden">
        {activeView === "Editor" && <FrontendEditor />}
        {activeView === "Designer" && <DesignEditor />}
      </div>
    </div>
  );
}
