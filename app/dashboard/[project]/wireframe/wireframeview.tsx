"use client";

import { ReactNode, useContext, useState, useEffect, useRef } from "react";
import { ProjectMetaContext, ProjectContext } from "../layout";
import { useContextMenu } from "@/app/components/Contextmenu";
import { WireframeMenuItem, pagesMenuItems, endpointsMenuItems } from "@/app/components/Contextmenu/wireframemenu";
import { patchProjectMetadata } from "@/app/handlers/projects";
import LogsPanel from "../helpers/logspanel";
import { SectionPanel, EndpointRow, PageRow, DbSection, CreateModal } from "./wireframecomponents";
import { patchRoutes } from "./wireframehelpers";


export default function WireframeView() {
  const { db_schema, endpoints, pages, setPages } =
    useContext(ProjectMetaContext)!;
  const { projectWS, projectName, projectId } =
    useContext(ProjectContext)!;

  const [showInput, setShowInput] = useState(false);
  const { contextMenu, handleContextMenu, handleClick } = useContextMenu();
  const [activeSection, setActiveSection] = useState<
    "pages" | "endpoints" | null
  >(null);
  const [inputValue, setInputValue] = useState("");
  const [routesFileContent, setRoutesFileContent] = useState<string | null>(
    null,
  );

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

    projectWS.sendCommand(
      JSON.stringify({
        type: "READ_FILE",
        path: `/app/workspace/frontend/${projectName}/src/Routes.jsx`,
      }),
    );
  }, [projectWS, projectName]);

  const handleCreate = async () => {
    if (!inputValue || !projectName || !projectId || !projectWS) return;

    const name = inputValue.charAt(0).toUpperCase() + inputValue.slice(1);
    const path = inputValue.toLowerCase();

    if (activeSection === "pages") {
      projectWS.sendCommand(
        JSON.stringify({
          type: "WRITE_FILE",
          path: `/app/workspace/frontend/${projectName}/src/${name}.jsx`,
          content: `export default function ${name}() {
  return(
    <>
      <h1>Welcome to your ${name} page</h1>
    </>
  );
}`,
        }),
      );

      // Patch Routes if we already have content
      if (routesFileContent) {
        projectWS.sendCommand(
          JSON.stringify({
            type: "WRITE_FILE",
            path: `/app/workspace/frontend/${projectName}/src/Routes.jsx`,
            content: patchRoutes(routesFileContent, name, path),
          }),
        );
      }

      // Update metadata
      const newPages = [
        ...pages,
        { route: `/${path}`, file: `src/${name}.jsx` },
      ];
      setPages(newPages);

      await patchProjectMetadata(projectId, { pages: newPages });
    }

    setShowInput(false);
    setInputValue("");
  };

  return (
    <div className="flex flex-col w-full p-6 gap-6 overflow-auto text-foreground">
      {showInput && (
        <CreateModal
          activeSection={activeSection!}
          inputValue={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onConfirm={handleCreate}
          onCancel={() => setShowInput(false)}
        />
      )}

      <div className="flex gap-6 flex-1 min-h-0">
        <SectionPanel
          title="Pages"
          onContextMenu={(e) => {
            setActiveSection("pages");
            handleContextMenu(e);
          }}
        >
          {pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pages found.</p>
          ) : (
            pages.map((page, i) => (
              <PageRow key={i} route={page.route} file={page.file} />
            ))
          )}
        </SectionPanel>

        <SectionPanel
          title="API Endpoints"
          onContextMenu={(e) => {
            setActiveSection("endpoints");
            handleContextMenu(e);
          }}
        >
          {endpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No endpoints found.</p>
          ) : (
            endpoints.map((ep, i) => (
              <EndpointRow
                key={i}
                method={ep.method}
                path={ep.path}
                file={ep.file}
              />
            ))
          )}
        </SectionPanel>

        <SectionPanel title="Database">
          {Object.keys(db_schema).length === 0 ? (
            <p className="text-sm text-muted-foreground">No tables found.</p>
          ) : (
            <DbSection db_schema={db_schema} />
          )}
        </SectionPanel>

        <LogsPanel />
      </div>

      {contextMenu.show && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClick} />
          <div
            className="fixed z-50 bg-card border rounded shadow-lg py-1"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            {(activeSection === "pages"
              ? pagesMenuItems
              : endpointsMenuItems
            ).map((item) => (
              <button
                key={item.label}
                className="block px-4 py-2 text-sm hover:bg-muted w-full text-left"
                onClick={() => handleMenuAction(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
