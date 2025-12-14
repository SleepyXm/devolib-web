"use client";

import { useState, useEffect } from "react";

export default function FrontendPage() {
  const [code, setCode] = useState(
    `<h1>Hello Devolib</h1>\n<p>This is your live preview.</p>`
  );
  const [srcDoc, setSrcDoc] = useState("");

  // Update iframe srcdoc as code changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSrcDoc(code);
    }, 200); // debounce for smooth typing

    return () => clearTimeout(timeout);
  }, [code]);

  // Listen for messages from iframe
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (e.data?.action === "test") {
        alert("Button clicked via postMessage!");
        console.log("Action received from iframe:", e.data.action);
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-screen">
      <div className="p-2 bg-gray-900 text-white flex justify-between items-center">
        <h2>Frontend Project Page</h2>
      </div>

      <div className="flex flex-1 overflow-hidden">
        (
          <>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-1/2 p-2 font-mono text-lg text-black border-r border-gray-300 focus:outline-none"
            />
            <iframe
              className="w-1/2"
              srcDoc={srcDoc}
              sandbox="allow-scripts"
              title="preview"
            />
          </>
        ) 
      </div>
    </div>
  );
}