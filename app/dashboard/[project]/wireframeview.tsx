"use client";

import { ReactNode, useContext, useState, useEffect, useRef } from "react";
import { ProjectMetaContext, ProjectContext, ServiceStatus } from "./layout";
import { useFileManager } from "./frontend/frontendmanager";
import { useContextMenu } from "@/app/components/Contextmenu";
import { WireframeMenuItem, pagesMenuItems, endpointsMenuItems } from "@/app/components/Contextmenu/wireframemenu";
import { usePageScanner } from "./helpers/FileScanner";
import { patchProjectMetadata } from "@/app/handlers/projects";


const SERVICES: { key: keyof ServiceStatus; label: string }[] = [
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend" },
  { key: "database", label: "Database" },
  { key: "container", label: "Container" },
];

const METHOD_COLORS: Record<string, string> = {
  POST:   "bg-blue-500/10 text-blue-400",
  PUT:    "bg-yellow-500/10 text-yellow-400",
  PATCH:  "bg-yellow-500/10 text-yellow-400",
  DELETE: "bg-red-500/10 text-red-400",
};

function patchRoutes(content: string, name: string, path: string): string {
  const lastImport = content.lastIndexOf("import ");
  const afterImport = content.indexOf("\n", lastImport) + 1;

  return (
    content.slice(0, afterImport) +
    `import ${name} from './${name}.jsx'\n` +
    content.slice(afterImport)
  ).replace(
    "</Routes>",
    `  <Route path="/${path}" element={<${name} />} />\n</Routes>`
  );
}

export default function WireframeView() {
  const { db_schema, endpoints, setEndpoints, pages, setPages } = useContext(ProjectMetaContext)!;
  
  const { serviceStatus, projectWS, projectName, projectId } = useContext(ProjectContext)!;
  const { fileContent, readFile, loadFileContent } = useFileManager(projectWS);
  const scannedPages = usePageScanner(fileContent, "react_router", "Routes.jsx");
  const [showInput, setShowInput] = useState(false);
  const { contextMenu, handleContextMenu, handleClick } = useContextMenu();
  const [activeSection, setActiveSection] = useState<"pages" | "endpoints" | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputValueRef = useRef("");

  const handleMenuAction = (item: WireframeMenuItem) => {
    if (item.action === "add-page" || item.action === "add-endpoint") {
      setShowInput(true);
    }
    handleClick();
  };

  const handleCreate = () => {
  if (!inputValue || !projectName || !projectId) return;
  const name = inputValue.charAt(0).toUpperCase() + inputValue.slice(1);
  const path = inputValue.toLowerCase();

  if (activeSection === "pages") {
    inputValueRef.current = inputValue;

    projectWS?.sendCommand(JSON.stringify({
      type: "WRITE_FILE",
      path: `/app/workspace/frontend/${projectName}/src/${name}.jsx`,
      content: `export default function ${name}() {\n  return <h1>Welcome to your ${name} page</h1>\n}`
    }));

    projectWS?.sendCommand(JSON.stringify({
      type: "READ_FILE",
      path: `/app/workspace/frontend/${projectName}/src/Routes.jsx`,
    }));

    patchProjectMetadata(projectId, {
      pages: [...pages, { route: `/${path}`, file: `${name}.jsx` }]
    });
  }

  setShowInput(false);
  setInputValue("");
};

  useEffect(() => {
    setPages(scannedPages);
  }, [scannedPages]);

  useEffect(() => {
    if (!projectWS) return;
    projectWS.onOutput((data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === "FILE_CONTENT" && inputValueRef.current) {
          loadFileContent(msg.content);
        }
      } catch {
        if (data.startsWith("FILE_CONTENT:") && inputValueRef.current) {
          loadFileContent(data.replace("FILE_CONTENT:", ""));
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!fileContent || !inputValueRef.current) return;
    const name = inputValueRef.current.charAt(0).toUpperCase() + inputValueRef.current.slice(1);
    const path = inputValueRef.current.toLowerCase();

    projectWS?.sendCommand(JSON.stringify({
      type: "WRITE_FILE",
      path: `/app/workspace/frontend/${projectName}/src/Routes.jsx`,
      content: patchRoutes(fileContent, name, path),
    }));

    setInputValue("");
    inputValueRef.current = "";
  }, [fileContent]);

  return (
    <div className="flex flex-col w-full p-6 gap-6 overflow-auto text-foreground">
      {showInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg p-6 flex flex-col gap-4 w-80">
            <p className="text-sm font-semibold">
              {activeSection === "pages" ? "New Page Name" : "New Endpoint Path"}
            </p>
            <input
              autoFocus
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={activeSection === "pages" ? "Dashboard" : "/api/items"}
              className="px-3 py-2 rounded bg-background border text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowInput(false)} className="px-3 py-1.5 text-sm rounded hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground">Create</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-6 px-4 py-3 rounded-lg border bg-card">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mr-2">Services</span>
        {SERVICES.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${serviceStatus[key] ? "bg-green-500" : "bg-muted-foreground/40"}`} />
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-w-0" onContextMenu={(e) => { setActiveSection("pages"); handleContextMenu(e); }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Pages</p>
          <div className="rounded-lg border bg-card p-4 flex flex-col gap-1 flex-1 overflow-auto">
            {pages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pages found.</p>
            ) : pages.map((page, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">/</span>
                <span className="font-mono">{page.route.replace(/^\//, "") || "index"}</span>
                <span className="text-muted-foreground/40 text-xs ml-auto font-mono">{page.file}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0" onContextMenu={(e) => { setActiveSection("endpoints"); handleContextMenu(e); }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">API Endpoints</p>
          <div className="rounded-lg border bg-card p-4 flex flex-col gap-1 flex-1 overflow-auto">
            {endpoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No endpoints found.</p>
            ) : endpoints.map((ep, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className={`font-mono text-xs px-1.5 py-0.5 rounded shrink-0 uppercase ${METHOD_COLORS[ep.method] ?? "bg-green-500/10 text-green-400"}`}>
                  {ep.method}
                </span>
                <span className="font-mono truncate">{ep.path}</span>
                <span className="text-muted-foreground/40 text-xs ml-auto font-mono">{ep.file}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Database</p>
          <div className="rounded-lg border bg-card p-4 flex flex-col gap-4 flex-1 overflow-auto">
            {Object.keys(db_schema).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tables found.</p>
            ) : Object.entries(db_schema).map(([table, columns]) => (
              <div key={table}>
                <p className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">{table}</p>
                <div className="rounded border divide-y text-xs overflow-hidden">
                  {columns.map((col) => (
                    <div key={col.column} className="flex justify-between px-3 py-1.5 hover:bg-muted/50 transition-colors">
                      <span className="font-mono">{col.column}</span>
                      <span className="text-muted-foreground">{col.type}{col.nullable ? "" : " · NN"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {contextMenu.show && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClick} />
          <div className="fixed z-50 bg-card border rounded shadow-lg py-1" style={{ top: contextMenu.y, left: contextMenu.x }}>
            {(activeSection === "pages" ? pagesMenuItems : endpointsMenuItems).map((item) => (
              <button key={item.label} className="block px-4 py-2 text-sm hover:bg-muted w-full text-left" onClick={() => handleMenuAction(item)}>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col min-w-[220px] max-w-[320px] flex-1">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        {title}
      </h2>
      <div className="rounded-lg border bg-card p-4 flex flex-col gap-1 flex-1">
        {children}
      </div>
    </div>
  );
}

function StatusRow({ label, online }: { label: string; online: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span>{label}</span>
      <span
        className={`text-xs font-medium ${online ? "text-green-500" : "text-muted-foreground"}`}
      >
        {online ? "Online" : "Offline"}
      </span>
    </div>
  );
}
