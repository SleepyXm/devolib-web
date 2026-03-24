"use client";

import { useState, useEffect, useContext } from "react";
import MonacoEditor from "@/app/components/monacoeditor";
import { useContextMenu } from "@/app/components/Contextmenu";
import { editorMenuItems } from "@/app/components/Contextmenu/menuitems";
import { EditorMenuItem } from "@/app/components/Contextmenu/menuactions";
import { ProjectContext, ProjectMetaContext } from "../../layout";
import { useFileManager } from "../../helpers/FileHandler/FileManager";
import { usePageScanner } from "../../helpers/FileHandler/FileScanner";
import FileTree from "../../helpers/FileHandler/FileTree";

export default function FrontendPage() {
  const { projectWS, projectName, roots } = useContext(ProjectContext)!;
  const { pages, groups } = useContext(ProjectMetaContext)!;
  const [srcDoc, setSrcDoc] = useState("");
  const [iframeMode, setIframeMode] = useState<"srcDoc" | "live">("srcDoc");

  const { contextMenu, handleContextMenu, handleClick } = useContextMenu();
  const { fileContent, writeFile, saveFile, readFile, loadFileContent, hasUnsavedChanges,} = useFileManager(projectWS);
  const [selectedPage, setSelectedPage] = useState<{ route: string; file: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handlePageSelect = (page: { route: string; file: string }) => {
    setSelectedPage(page);
    setSelectedFile(null);
    readFile(`/app/workspace/frontend/${projectName}/${page.file}`);
  };

  const handleFileSelect = (filepath: string) => {
    setSelectedFile(filepath);
    setSelectedPage(null);
    readFile(`${roots?.frontend_root}/${filepath}`);
    console.log("Selected page:", roots?.frontend_root);
    console.log("Selected file:", roots?.frontend_root + "/" + filepath);
  };


  const handleMenuAction = (item: EditorMenuItem) => {
    switch (item.action) {
      case "copy":
        navigator.clipboard.writeText(fileContent);
        alert("Copied!");
        break;
      case "format":
        writeFile(fileContent.toUpperCase());
        break;
      case "insert-element":
        writeFile(
          fileContent +
            `<${item.payload.value} class="${item.payload.defaultClass}"></${item.payload.value}>\n`,
        );
        break;
      case "set-class":
        writeFile(
          fileContent + ` class="${item.payload.prefix}-${item.payload.color}"`,
        );
        break;
    }
    handleClick();
  };

  // Check if container is running
  useEffect(() => {
    if (!projectName) return;
    fetch(`http://${projectName}.localhost`)
      .then((res) => {
        if (res.ok) setIframeMode("live");
        else setIframeMode("srcDoc");
      })
      .catch(() => setIframeMode("srcDoc"));
  }, []);

  // Fetch file content from container
  useEffect(() => {
    if (!projectWS || !projectName || iframeMode === "live") return;

    readFile(`/app/workspace/frontend/${projectName}/src/App.jsx`);

    projectWS.onOutput((data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === "FILE_CONTENT") {
          loadFileContent(msg.content); // Use hook method
        }
      } catch {
        // Handle non-JSON messages
        if (data.includes("FILE_CONTENT:")) {
          loadFileContent(data.replace("FILE_CONTENT:", ""));
        }
      }
    });
  }, [projectWS, iframeMode]);

  // Build srcDoc
  useEffect(() => {
    if (iframeMode !== "srcDoc") return;

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
            ${fileContent}
          </body>
        </html>
      `);
    }, 200);
    return () => clearTimeout(timeout);
  }, [fileContent, iframeMode]);

  // Handle context menu from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === "contextmenu") {
        const iframe = document.querySelector('iframe[title="preview"]');
        const iframeRect = iframe?.getBoundingClientRect();

        if (iframeRect) {
          handleContextMenu({
            clientX: iframeRect.left + e.data.x,
            clientY: iframeRect.top + e.data.y,
            pageX: iframeRect.left + e.data.x + window.scrollX,
            pageY: iframeRect.top + e.data.y + window.scrollY,
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
      <div className="p-2 bg-[#1a1e24] text-white flex justify-between items-center">
        <h2>Frontend Editor</h2>
        <div className="flex gap-2 items-center">
          {iframeMode === "srcDoc" && (
            <span className="text-yellow-400 bg-yellow-400/20 text-sm border rounded-xl py-1 px-2">⚠ Container offline</span>
          )}
          {iframeMode === "live" && (
            <span className="text-green-400 bg-green-400/20 text-sm border rounded-xl py-1 px-2">
              ✓ Live preview active
            </span>
          )}
          {hasUnsavedChanges && (
            <button
              onClick={saveFile}
              className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>

      <div
        className="flex flex-1 overflow-hidden"
        onContextMenu={iframeMode === "srcDoc" ? handleContextMenu : undefined}
        onClick={handleClick}
      >
        <div className="w-36 bg-gray-800 text-white flex flex-col overflow-y-auto shrink-0">
          <FileTree label="Pages"      items={pages.map(p => ({ name: p.route, filepath: p.file }))}      selected={selectedPage?.route}    onSelect={(item) => handlePageSelect({ route: item.name, file: item.filepath })} />
          {groups.map(group => (
            <FileTree key={group.label} label={group.label} items={group.files.map(f => ({ name: f.name, filepath: `${group.root}/${f.filepath}` }))} selected={undefined} onSelect={(item) => handleFileSelect(item.filepath)}/>
          ))}
        </div>

        <MonacoEditor
          initialCode={fileContent}
          language={iframeMode === "srcDoc" ? "html" : "typescript"}
          onChange={(value) => writeFile(value)}
        />
        <div className="relative w-1/2">
          {iframeMode === "live" ? (
            <iframe
              className="w-full h-full"
              src={`http://${projectName}.localhost/#${selectedPage ? selectedPage.route : ""}`}
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

        {iframeMode === "srcDoc" && contextMenu.show && (
          <>
            <div className="fixed inset-0 z-40" />
            <div
              className="fixed z-50 bg-gray-900 text-white rounded shadow-lg"
              style={{ top: contextMenu.y, left: contextMenu.x }}
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
      </div>
    </div>
  );
}
