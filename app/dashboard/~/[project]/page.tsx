"use client";

import Terminal from "../components/terminal";
import DatabasePage from "./database";
import FrontendPage from "./frontend";
import BackendPage from "./backend";
import { useState } from "react";

export default function ProjectPage() {

  const [activeView, setActiveView] = useState<'frontend' | 'backend' | 'database' | 'terminal'>('frontend');

  return(
  <div className="flex flex-col h-screen">
      {/* Tab buttons */}
      <div className="flex gap-2 p-2 bg-gray-800 border-b border-gray-700">
        <button
          onClick={() => setActiveView('frontend')}
          className={`px-4 py-2 rounded ${
            activeView === 'frontend' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Frontend
        </button>
        <button
          onClick={() => setActiveView('backend')}
          className={`px-4 py-2 rounded ${
            activeView === 'backend' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Backend
        </button>
        <button
          onClick={() => setActiveView('database')}
          className={`px-4 py-2 rounded ${
            activeView === 'database' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Database
        </button>
        <button
          onClick={() => setActiveView('terminal')}
          className={`px-4 py-2 rounded ${
            activeView === 'terminal' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Terminal
        </button>
      </div>

      {/* Render active view */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'frontend' && <FrontendPage />}
        {activeView === 'backend' && <BackendPage />}
        {activeView === 'database' && <DatabasePage />}
        {activeView === 'terminal' && <Terminal />}
      </div>
    </div>

  );
}