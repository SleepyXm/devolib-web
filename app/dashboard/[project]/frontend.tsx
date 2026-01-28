"use client";

import { useState, useEffect } from "react";
import MonacoEditor from "@/app/components/monacoeditor";
import { useContextMenu } from "@/app/components/Contextmenu";
import { editorMenuItems } from "@/app/components/Contextmenu/menuitems";
import { EditorMenuItem } from "@/app/components/Contextmenu/menuactions";

export default function FrontendPage() {
  const [code, setCode] = useState(
    `<h1>Hello Devolib</h1>\n<p>This is your live preview.</p>`,
  );
  const [srcDoc, setSrcDoc] = useState("");

  const { contextMenu, handleContextMenu, handleClick } = useContextMenu();

  const handleMenuAction = (item: EditorMenuItem) => {
    switch (item.action) {
      case "copy":
        navigator.clipboard.writeText(code);
        alert("Copied!");
        break;

      case "format":
        setCode(code.toUpperCase());
        break;

      case "insert-element":
        setCode(
          code +
            `<${item.payload.value} class="${item.payload.defaultClass}"></${item.payload.value}>\n`,
        );
        break;

      case "set-class":
        setCode(code + ` class="${item.payload.prefix}-${item.payload.color}"`);
        break;
    }

    handleClick();
  };

  {/*useEffect(() => {
  // point to containers frontend
  setSrcDoc('http://localhost:9000');
  }, []);*/}

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSrcDoc(`
      <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            document.addEventListener('contextmenu', (e) => {
              e.preventDefault();
              window.parent.postMessage({
                type: 'contextmenu',
                x: e.pageX,
                y: e.pageY
              }, '*');
            });
          </script>
        </head>
        <body>
          ${code}
        </body>
      </html>
    `);
    }, 200);
    return () => clearTimeout(timeout);
  }, [code]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === "contextmenu") {
        const iframe = document.querySelector('iframe[title="preview"]');
        const iframeRect = iframe?.getBoundingClientRect();

        if (iframeRect) {
          const finalX = iframeRect.left + e.data.x + window.scrollX;
          const finalY = iframeRect.top + e.data.y + window.scrollY;

          handleContextMenu({
            clientX: iframeRect.left + e.data.x,
            clientY: iframeRect.top + e.data.y,
            pageX: finalX, // calculations to ensure correct positioning for context menu spawn
            pageY: finalY,
            preventDefault: () => {},
          } as React.MouseEvent);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleContextMenu]);

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="p-2 bg-gray-900 text-white flex justify-between items-center">
        <h2>Frontend Project Page</h2>
      </div>

      {/* Code editor + preview */}
      <div
        className="flex flex-1 overflow-hidden"
        onContextMenu={handleContextMenu}
        onClick={handleClick}
      >
        <>
          <MonacoEditor
            initialCode={code}
            language="html"
            onChange={(value) => setCode(value)}
          />
          <div className="relative w-1/2">
            <iframe
              className="w-full h-full"
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-same-origin"
              title="preview"
            />
          </div>

          {contextMenu.show && (
            <>
              <div className="fixed inset-0 z-40"/>

              <div
                className="fixed z-50 bg-gray-900 text-white rounded shadow-lg"
                style={{
                  top: contextMenu.y,
                  left: contextMenu.x,
                }}
              >
                {editorMenuItems.map((item) => (
                  <button
                    key={item.label}
                    className="block px-4 py-2 hover:bg-gray-700 w-full text-left"
                    onClick={() => handleMenuAction(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      </div>
    </div>
  );
}

{/* src="http://localhost:9000" This should be used when container rev proxy has been finalised*/}