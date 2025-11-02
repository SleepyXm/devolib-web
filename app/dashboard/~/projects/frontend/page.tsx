"use client";

import { useState, useEffect } from "react";

export default function FrontendPage() {
  const [code, setCode] = useState(
    `<h1>Hello Devolib</h1>\n<p>This is your live preview.</p>`
  );
  const [flipped, setFlipped] = useState(false);
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
        <button
          className="bg-blue-500 px-3 py-1 rounded hover:bg-blue-600"
          onClick={() => setFlipped(!flipped)}
        >
          Flip View
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {!flipped ? (
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
        ) : (
          <>
            <iframe
              className="w-1/2"
              srcDoc={srcDoc}
              sandbox="allow-scripts"
              title="preview"
            />
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-1/2 p-2 font-mono text-lg text-black border-l border-gray-300 focus:outline-none"
            />
          </>
        )}
      </div>
    </div>
  );
}