"use client";

import { useState, useEffect, useContext } from "react";
import MonacoEditor from "@/app/components/monacoeditor";
import { useContextMenu } from "@/app/components/Contextmenu";
import { editorMenuItems } from "@/app/components/Contextmenu/menuitems";
import { EditorMenuItem } from "@/app/components/Contextmenu/menuactions";
import { ProjectContext } from "../[project]/layout";

export default function FrontendPage() {
  const { projectWS } = useContext(ProjectContext)!;
  const [code, setCode] = useState('<h1>Hello Devolib</h1>\n<p>This is your live preview.</p>');
  const [srcDoc, setSrcDoc] = useState("");
  const [iframeMode, setIframeMode] = useState<'srcDoc' | 'live'>('srcDoc');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
    setHasUnsavedChanges(true);
    handleClick();
  };

  // Check if container is running
  useEffect(() => {
    fetch('http://test1-react.localhost')
      .then(res => {
        if (res.ok) {
          setIframeMode('live');
        } else {
          setIframeMode('srcDoc');
        }
      })
      .catch(() => {
        setIframeMode('srcDoc');
      });
  }, []);

  // Fetch file content from container if needed
  useEffect(() => {
    if (!projectWS || iframeMode === 'live') return;
    
    // Only fetch source if we're in srcDoc mode and want to edit actual files
    projectWS.sendCommand(JSON.stringify({
      type: 'READ_FILE',
      path: '/app/workspace/frontend/test1-react/src/App.jsx'
    }));
    
    projectWS.onOutput((data) => {
      if (data.includes('FILE_CONTENT:')) {
        const content = data.replace('FILE_CONTENT:', '');
        setCode(content);
      }
    });
  }, [projectWS, iframeMode]);

  // Build srcDoc with injected scripts (only for srcDoc mode)
  useEffect(() => {
    if (iframeMode !== 'srcDoc') return;
    
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
  }, [code, iframeMode]);

  // Handle context menu from iframe (only works in srcDoc mode)
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
            pageX: finalX,
            pageY: finalY,
            preventDefault: () => {},
          } as React.MouseEvent);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleContextMenu]);

  const handleSave = () => {
    if (!projectWS) return;
    
    projectWS.sendCommand(JSON.stringify({
      type: 'WRITE_FILE',
      path: '/app/workspace/frontend/test1-react/src/App.jsx',
      content: code
    }));
    setHasUnsavedChanges(false);
  };

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="p-2 bg-gray-900 text-white flex justify-between items-center">
        <h2>Frontend Project Page</h2>
        <div className="flex gap-2 items-center">
          {iframeMode === 'srcDoc' && (
            <span className="text-yellow-400 text-sm">
              ⚠ Container offline - context menu available
            </span>
          )}
          {iframeMode === 'live' && (
            <span className="text-green-400 text-sm">
              ✓ Live preview active
            </span>
          )}
          {iframeMode === 'srcDoc' && hasUnsavedChanges && (
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600"
            >
              Save •
            </button>
          )}
        </div>
      </div>

      {/* Code editor + preview */}
      <div
        className="flex flex-1 overflow-hidden"
        onContextMenu={iframeMode === 'srcDoc' ? handleContextMenu : undefined}
        onClick={handleClick}
      >
        <>
          <MonacoEditor
            initialCode={code}
            language={iframeMode === 'srcDoc' ? 'html' : 'typescript'}
            onChange={(value) => {
              setCode(value);
              setHasUnsavedChanges(true);
            }}
          />
          <div className="relative w-1/2">
            {iframeMode === 'live' ? (
              <iframe
                className="w-full h-full"
                src="http://test1-react.localhost"
                title="preview"
              />
            ) : (
              <iframe
                className="w-full h-full"
                srcDoc={srcDoc}
                sandbox="allow-scripts allow-same-origin"
                title="preview"
              />
            )}
          </div>

          {/* Context menu only shows in srcDoc mode */}
          {iframeMode === 'srcDoc' && contextMenu.show && (
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