"use client";

import { useState, useEffect, useContext } from "react";
import MonacoEditor from "@/app/components/monacoeditor";
import { useContextMenu } from "@/app/components/Contextmenu";
import { editorMenuItems } from "@/app/components/Contextmenu/menuitems";
import { EditorMenuItem } from "@/app/components/Contextmenu/menuactions";
import { ProjectContext, ProjectMetaContext } from "@/app/dashboard/[project]/layout";
import { useFileManager } from "@/app/file-manager/FileManager";
import FileTree from "../../file-manager/FileTree";
import { LoadingState } from "@/app/components/loader";
import { withRetry } from "@/app/hooks/timer";

export default function FrontendPage() {
  const { projectWS, projectName, roots } = useContext(ProjectContext)!;
  const { pages, groups } = useContext(ProjectMetaContext)!;
  const [srcDoc, setSrcDoc] = useState("");
  const [iframeMode, setIframeMode] = useState<"srcDoc" | "live">("srcDoc");
  const [previewReady, setPreviewReady] = useState(false);

  const { contextMenu, handleContextMenu, handleClick } = useContextMenu();
  const { fileContent, writeFile, saveFile, readFile, loadFileContent, hasUnsavedChanges,} = useFileManager(projectWS);
  const [selectedPage, setSelectedPage] = useState<{ route: string; file: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const frontendGroups = groups.filter(g => g.context === "frontend");

  const handlePageSelect = (page: { route: string; file: string }) => {
    setSelectedPage(page);
    setSelectedFile(null);
    readFile(`${roots?.frontend_root}/${page.file}`);
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

  useEffect(() => {
    // 1. Nothing to fetch without a project name
    if (!projectName) return;

    // 2. Track timers so they can both be cancelled on unmount
    let retryTimer: ReturnType<typeof setTimeout>;
    let liveTimer: ReturnType<typeof setTimeout>;

    const attemptFetch = (isRetry = false) => {
      fetch(`http://${projectName}.localhost`)
        .then((res) => {
          if (res.ok) {
            // 3. Container is up — brief pause then switch to live iframe
            liveTimer = setTimeout(() => {
              setIframeMode("live");
              setPreviewReady(true);
            }, 200);
          } else if (!isRetry) {
            // 4. Bad response on first attempt — wait 1.5s then try once more
            retryTimer = withRetry(() => attemptFetch(true), 1500);
          } else {
            // 5. Bad response on retry — container isn't coming up, fall back to srcDoc
            setIframeMode("srcDoc");
            setPreviewReady(true);
          }
        })
        .catch(() => {
          if (!isRetry) {
            // 4. Fetch threw on first attempt — wait 1.5s then try once more
            retryTimer = withRetry(() => attemptFetch(true), 1500);
          } else {
            // 5. Fetch threw on retry — give up and fall back to srcDoc
            setIframeMode("srcDoc");
            setPreviewReady(true);
          }
        });
    };

    // 6. Kick off the first fetch immediately
    attemptFetch();

    // 7. Clean up any pending timers if projectName changes or component unmounts
    return () => {
      clearTimeout(retryTimer);
      clearTimeout(liveTimer);
    };
  }, [projectName]);


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
    <div className="flex flex-col h-full h-screen">
      <div className="flex min-h-11 items-center justify-between border-b border-white/10 bg-[var(--dv-surface-inset)] px-4">
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
              className="rounded bg-zinc-300 px-4 py-2 text-black transition hover:bg-white"
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
        <div className="w-56 shrink-0 overflow-y-auto border-r border-white/10 bg-[var(--dv-surface-inset)]">
          <FileTree
            items={[{ name: "Pages", filepath: "pages-root", children: pages.map(p => ({ name: p.route, filepath: p.file })) }]}
            selected={selectedPage?.route}
            onSelect={(item) => handlePageSelect({ route: item.name, file: item.filepath })}
          />
          <FileTree
            items={frontendGroups}
            selected={selectedFile ?? undefined}
            onSelect={(item) => handleFileSelect(item.filepath)}
          />
        </div>

        <MonacoEditor
          initialCode={fileContent}
          language={iframeMode === "srcDoc" ? "html" : "typescript"}
          onChange={(value) => writeFile(value)}
        />
        <div className="relative w-1/2">
          {!previewReady ? (
            <LoadingState message="Starting preview..." className="h-full" />
          ) : iframeMode === "live" ? (
            <iframe className="w-full h-full"
              src={`http://${projectName}.localhost/#${selectedPage ? selectedPage.route : ""}`}
              title="preview"
            />
          ) : (
            <iframe className="w-full h-full"
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
