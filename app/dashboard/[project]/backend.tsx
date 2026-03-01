"use client";

import { useState, useEffect, useContext } from "react";
import BackendEditor from "./backend/backendeditor";
import { useFileManager } from "./frontend/frontendmanager";
import { ProjectContext, ProjectMetaContext } from "../[project]/layout";
import { useEndpointScanner } from "./helpers/FileScanner";


interface CommandPayload {
  type: string;
  target: string;
  payload: {
    name: string;
    framework: string;
  };
}

export default function BackendPage() {
  const { projectWS } = useContext(ProjectContext)!;
  const [projectName, setProjectName] = useState("");
  const [framework, setFramework] = useState("fastapi");
  const { 
    fileContent, 
    writeFile, 
    saveFile, 
    readFile, 
    loadFileContent,
    hasUnsavedChanges 
  } = useFileManager(projectWS);
  const { endpoints, setEndpoints } = useContext(ProjectMetaContext)!;
  const scannedEndpoints = useEndpointScanner(fileContent, framework, "main.py");

  const [commandPayload, setCommandPayload] = useState<CommandPayload | null>(
    null,
  );

  useEffect(() => {
    setEndpoints(scannedEndpoints);
  }, [scannedEndpoints]);

  const handleGeneratePayload = () => {
    const payload: CommandPayload = {
      type: "CREATE_PROJECT",
      target: "backend",
      payload: {
        name: projectName,
        framework,
      },
    };
    setCommandPayload(payload);
    console.log("Generated Backend Payload:", payload);
  };

  useEffect(() => {
    if (!projectWS) return;

    readFile(`/app/workspace/backend/main.py`);

    projectWS.onOutput((data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'FILE_CONTENT') {
          loadFileContent(msg.content); // Use hook method
        }
      } catch {
        // Handle non-JSON messages
        if (data.includes('FILE_CONTENT:')) {
          loadFileContent(data.replace('FILE_CONTENT:', ''));
        }
      }
    });
  }, [projectWS]);

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-200 text-white">
      {/* Header */}
      <div className="p-2 bg-gray-900 flex justify-between items-center">
        <h2>Backend Project Setup</h2>
        {hasUnsavedChanges && (
            <button
              onClick={saveFile}
              className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600"
            >
              Save Changes
            </button>
          )}
      </div>

      {/* Input section */}
      <div className="p-4 flex flex-col gap-3 bg-gray-800">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Backend Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="px-3 py-2 rounded w-1/3 bg-gray-900 text-white"
          />

          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
            className="px-3 py-2 rounded w-1/3 bg-gray-900 text-white"
          >
            <option value="fastapi">FastAPI (Python)</option>
            <option value="express">Node.js / Express</option>
            <option value="django">Django (Python)</option>
            <option value="flask">Flask (Python)</option>
            <option value="springboot">Spring Boot (Java)</option>
            <option value="laravel">Laravel (PHP)</option>
            <option value="nest">NestJS (TypeScript)</option>
          </select>

          <button
            onClick={handleGeneratePayload}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Generate Command
          </button>
        </div>

        {commandPayload && (
          <pre className="bg-gray-900 p-3 rounded text-green-400 overflow-x-auto">
            {JSON.stringify(commandPayload, null, 2)}
          </pre>
        )}
      </div>

      {/* Code editor */}
      <div className="flex flex-1 overflow-hidden">
        <BackendEditor initialCode={fileContent} onChange={(value) => writeFile(value)} language="python" />
      </div>
    </div>
  );
}
