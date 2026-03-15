"use client";

import { ReactNode, useContext, useState, useEffect, useRef } from "react";
import { ProjectMetaContext, ProjectContext, ServiceStatus, ProjectLogsContext } from "./layout";
import { useContextMenu } from "@/app/components/Contextmenu";
import { WireframeMenuItem, pagesMenuItems, endpointsMenuItems } from "@/app/components/Contextmenu/wireframemenu";
import { patchProjectMetadata } from "@/app/handlers/projects";
import LogsPanel from "./helpers/logspanel";



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
  const { db_schema, endpoints, pages, setPages } = useContext(ProjectMetaContext)!;
  const { serviceStatus, projectWS, projectName, projectId } = useContext(ProjectContext)!;

  const [showInput, setShowInput] = useState(false);
  const { contextMenu, handleContextMenu, handleClick } = useContextMenu();
  const [activeSection, setActiveSection] = useState<"pages" | "endpoints" | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [routesFileContent, setRoutesFileContent] = useState<string | null>(null);


  const handleMenuAction = (item: WireframeMenuItem) => {
    if (item.action === "add-page" || item.action === "add-endpoint") {
      setShowInput(true);
    }
    handleClick();
  };

  useEffect(() => {
  if (!projectWS) return;

  const handleOutput = (data: string) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === "FILE_CONTENT") {
        setRoutesFileContent(msg.content);
      }
    } catch {
      if (data.startsWith("FILE_CONTENT:")) {
        setRoutesFileContent(data.replace("FILE_CONTENT:", ""));
      }
    }
  };

  projectWS.onOutput(handleOutput);

  return () => {
    projectWS.onOutput?.(handleOutput);
  };
  }, [projectWS]);

  useEffect(() => {
  if (!projectWS || !projectName) return;

  projectWS.sendCommand(JSON.stringify({
    type: "READ_FILE",
    path: `/app/workspace/frontend/${projectName}/src/Routes.jsx`,
  }));
  }, [projectWS, projectName]);

  const handleCreate = async () => {
  if (!inputValue || !projectName || !projectId || !projectWS) return;

  const name = inputValue.charAt(0).toUpperCase() + inputValue.slice(1);
  const path = inputValue.toLowerCase();

  if (activeSection === "pages") {


    projectWS.sendCommand(JSON.stringify({
      type: "WRITE_FILE",
      path: `/app/workspace/frontend/${projectName}/src/${name}.jsx`,
      content: `export default function ${name}() {
  return(
    <>
      <h1>Welcome to your ${name} page</h1>
    </>
  );
}`
     }));

    // Patch Routes if we already have content
    if (routesFileContent) {
      projectWS.sendCommand(JSON.stringify({
        type: "WRITE_FILE",
        path: `/app/workspace/frontend/${projectName}/src/Routes.jsx`,
        content: patchRoutes(routesFileContent, name, path),
      }));
    }

    // Update metadata
    const newPages = [...pages, { route: `/${path}`, file: `src/${name}.jsx` }];
    setPages(newPages);

    await patchProjectMetadata(projectId, { pages: newPages });
  }

  setShowInput(false);
  setInputValue("");
};

  return (
    <div className="flex flex-col w-full p-6 gap-6 overflow-auto text-foreground">
      {showInput && (
        <div className="fixed inset-0 z-50 flex items-center text-zinc-400 justify-center bg-black/50">
          <div className="bg-card border rounded-lg p-6 flex flex-col gap-4 w-80 bg-[#111318]">
            <p className="text-sm font-semibold bg-[#111318] text-zinc-400">
              {activeSection === "pages" ? "New Page Name" : "New Endpoint Path"}
            </p>
            <input
              autoFocus
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={activeSection === "pages" ? "Dashboard" : "/api/items"}
              className="px-3 py-2 rounded bg-zinc-600 border text-sm transition-all duration-300"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowInput(false)} className="px-3 py-1.5 text-sm rounded hover:bg-muted hover:text-white">Cancel</button>
              <button onClick={handleCreate} className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:text-white">Create</button>
            </div>
          </div>
        </div>
      )}


      <div className="flex gap-6 flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-w-0" onContextMenu={(e) => { setActiveSection("pages"); handleContextMenu(e); }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-zinc-400 p-2 bg-[#111318] overflow-hidden rounded-t-lg pl-4">Pages</p>
          <div className="border border-[#c9bfab] bg-card flex flex-col gap-1 flex-1 overflow-auto bg-white">
            {pages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pages found.</p>
            ) : pages.map((page, i) => (
              <div key={i} className="flex items-center gap-2 text-sm px-6 py-3 border-b border-black/30 hover:bg-muted/50 transition-colors">
                <span className="text-[#1a6888]">/</span>
                <span className="font-mono text-[#1a6888]">{page.route.replace(/^\//, "") || ""}</span>
                <span className="text-zinc-800/70 text-xs ml-auto font-mono">{page.file}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0" onContextMenu={(e) => { setActiveSection("endpoints"); handleContextMenu(e); }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-zinc-400 p-2 bg-[#111318] overflow-hidden rounded-t-lg pl-4">API Endpoints</p>
          <div className="border border-[#c9bfab] bg-card flex flex-col gap-1 flex-1 overflow-auto bg-white">
            {endpoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No endpoints found.</p>
            ) : endpoints.map((ep, i) => (
              <div key={i} className="flex items-center gap-2 text-sm px-6 py-3 border-b border-black/30 hover:bg-muted/50 transition-colors">
                <span className={`font-mono text-xs px-1.5 py-0.5 rounded shrink-0 uppercase ${METHOD_COLORS[ep.method] ?? "bg-green-300/30 border border-[#96c48f] text-green-600"}`}>
                  {ep.method}
                </span>
                <span className="font-mono truncate text-[#1a6888]">{ep.path}</span>
                <span className="text-zinc-800/70 text-xs ml-auto font-mono">{ep.file}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-zinc-400 p-2 bg-[#111318] overflow-hidden rounded-t-lg pl-4">Database</p>
          <div className="border border-[#c9bfab] bg-card flex flex-col gap-1 flex-1 overflow-auto bg-white">
            {Object.keys(db_schema).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tables found.</p>
            ) : Object.entries(db_schema).map(([table, columns]) => (
              <div key={table}>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground p-1 text-[#7d7668] bg-[#f0ebe0] overflow-hidden pl-4">{table}</p>
                <div className="divide-y text-xs overflow-hidden">
                  {columns.map((col) => (
                    <div key={col.column} className="flex justify-between text-zinc-700 px-3 py-1.5 border-black/30 hover:bg-muted/50 transition-colors">
                      <span className="font-mono">{col.column}</span>
                      <span className="text-muted-foreground">{col.type}{col.nullable ? "" : " · NN"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <LogsPanel />
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
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-zinc-400 p-2 bg-[#111318] overflow-hidden rounded-t-lg">
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
