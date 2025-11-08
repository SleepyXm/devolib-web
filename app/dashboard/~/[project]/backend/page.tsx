"use client";

import { useState, useEffect } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";

interface CommandPayload {
  type: string;
  target: string;
  payload: {
    name: string;
    framework: string;
  };
}

export default function BackendPage() {
  const monaco = useMonaco();

  const [code, setCode] = useState(
    `# Backend Entry Point\n# Example: FastAPI route\nfrom fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/")\ndef root():\n    return {"message": "Hello from your backend!"}`
  );
  const [projectName, setProjectName] = useState("");
  const [framework, setFramework] = useState("fastapi");
  const [commandPayload, setCommandPayload] = useState<CommandPayload | null>(null);

  // Define custom theme on mount
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme("vs-dark-custom-bg", {
        base: "vs-dark",
        inherit: true,
        rules: [], // keep all syntax colors
        colors: {
          "editor.background": "#1e1e2f", // lighter, less harsh than pure vs-dark
          "editorLineNumber.foreground": "#888888", // optional line number color
        },
      });
    }
  }, [monaco]);

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

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-200 text-white">
      {/* Header */}
      <div className="p-2 bg-gray-900 flex justify-between items-center">
        <h2>Backend Project Setup</h2>
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
        <Editor
          height="80%"
          defaultLanguage="python"
          value={code}
          onChange={(value) => setCode(value || "")}
          theme="vs-dark-custom-bg"
          options={{
            fontSize: 16,
            minimap: { enabled: false },
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}