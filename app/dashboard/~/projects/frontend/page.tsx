"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";

export default function FrontendPage() {
  const [code, setCode] = useState(
    `<h1>Hello Devolib</h1>\n<p>This is your live preview.</p>`
  );
  const [srcDoc, setSrcDoc] = useState("");

  // Update iframe srcdoc as code changes
  useEffect(() => {
  const timeout = setTimeout(() => {
    setSrcDoc(`
      <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body {}
          </style>
        </head>
        <body>
          ${code}

          <script>
            // Universal event listener: buttons, divs, etc.
            document.body.addEventListener('click', (e) => {
              if(e.target.dataset.action) {
                window.parent.postMessage(
                  { action: e.target.dataset.action, value: e.target.innerText },
                  '*'
                );
              }
            });

            // Example: global alert function you can call from code
            window.alertParent = (msg) => {
              window.parent.postMessage({ action: 'alert', value: msg }, '*');
            };
          </script>
        </body>
      </html>
    `);
  }, 200);

  return () => clearTimeout(timeout);
}, [code]);

  return (
    <div className="flex flex-col h-full min-h-screen">
      <div className="p-2 bg-gray-900 text-white flex justify-between items-center">
        <h2>Frontend Project Page</h2>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <>
          <div className="w-1/2 h-full">
            <Editor
              height="100%"
              defaultLanguage="html"
              value={code}
              onChange={(value) => setCode(value || "")}
              theme="vs-dark"
              options={{
                fontSize: 16,
                minimap: { enabled: false },
                wordWrap: "on",
              }}
            />
          </div>
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