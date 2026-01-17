"use client";

import { useState, useEffect } from "react";
import MonacoEditor from "@/app/components/monacoeditor";

interface CommandPayload {
  type: string;
  target: string;
  payload: {
    name: string;
    framework: string;
  };
}

export default function FrontendPage() {
  const [code, setCode] = useState(
    `<h1>Hello Devolib</h1>\n<p>This is your live preview.</p>`
  );
  const [srcDoc, setSrcDoc] = useState("");
  const [projectName, setProjectName] = useState("");
  const [framework, setFramework] = useState("html-css");
  const [commandPayload, setCommandPayload] = useState<CommandPayload | null>(null);

  

  // Update iframe srcdoc as code changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSrcDoc(`
        <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body>
            ${code}
          </body>
        </html>
      `);
    }, 200);
    return () => clearTimeout(timeout);
  }, [code]);

  // Generate payload
  const handleGeneratePayload = () => {
    const payload = {
      type: "CREATE_PROJECT",
      target: "frontend",
      payload: {
        name: projectName,
        framework,
      },
    };
    setCommandPayload(payload);
    console.log("Generated Payload:", payload);
  };

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="p-2 bg-gray-900 text-white flex justify-between items-center">
        <h2>Frontend Project Page</h2>
      </div>

      {/* Input section */}
      <div className="p-4 flex flex-col gap-3 bg-gray-800 text-white">
        <div className="flex items-center gap-3 text-white">
          <input
            type="text"
            placeholder="Frontend Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="px-3 py-2 rounded w-1/3 text-white"
          />

          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
            className="px-3 py-2rounded w-1/3 text-whitet"
          >
            <option value="html-css">Raw HTML + CSS</option>
            <option value="react">React</option>
            <option value="nextjs">Next.js</option>
            <option value="vue">Vue</option>
          </select>

          <button
            onClick={handleGeneratePayload}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
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

      {/* Code editor + preview */}
      <div className="flex flex-1 overflow-hidden">
        <>
            <MonacoEditor
              initialCode={code}
              language="html"
              onChange={(value) => setCode(value)}
            />
          <iframe
            className="w-1/2"
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin"
            title="preview"
          />
        </>
      </div>
    </div>
  );
}