
"use client";

import { useState } from "react";
import { useContextMenu } from "@/app/components/Contextmenu";
import { useWireframe } from "../wireframehooks";
import { SectionPanel, PageRow, EndpointRow, DbSection, CreateModal} from "./wireframecomponents";
import LogsPanel from "./logspanel";
import { pagesMenuItems, endpointsMenuItems } from "@/app/components/Contextmenu/wireframemenu";

export default function WireframeView() {
  const {
    db_schema, endpoints, pages,
    showInput, activeSection, setActiveSection, inputValue, parentPage,
    setInputValue, setParentPage,
    openInput, closeInput, handleCreate, setShowInput, endpointType, setEndpointType
  } = useWireframe();

  const { contextMenu, handleContextMenu, handleClick } = useContextMenu();

  return (
    <div className="flex flex-col w-full p-6 gap-6 overflow-auto text-foreground">
      <h2 className="text-4xl">Wireframe View</h2>

      {showInput && (
        <CreateModal
          activeSection={activeSection!}
          inputValue={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onConfirm={handleCreate}
          onCancel={closeInput}
          pages={pages}
          parentPage={parentPage}
          onParentChange={setParentPage}
          endpointType={endpointType}
          onEndpointTypeChange={setEndpointType}
        />
      )}

      <div className="flex gap-6 flex-1 min-h-0">
        <SectionPanel title="Pages" onContextMenu={(e) => { setActiveSection("pages"); handleContextMenu(e); }}>
          {pages.length === 0
            ? <p className="text-sm text-muted-foreground">No pages found.</p>
            : pages.map((page, i) => <PageRow key={i} route={page.route} file={page.file} />)
          }
        </SectionPanel>

        <SectionPanel title="API Endpoints" onContextMenu={(e) => { setActiveSection("endpoints"); handleContextMenu(e); }}>
          {endpoints.length === 0
            ? <p className="text-sm text-muted-foreground">No endpoints found.</p>
            : endpoints.map((ep, i) => <EndpointRow key={i} method={ep.method} path={ep.path} file={ep.file} />)
          }
        </SectionPanel>

        <SectionPanel title="Database">
          {Object.keys(db_schema).length === 0
            ? <p className="text-sm text-muted-foreground">No tables found.</p>
            : <DbSection db_schema={db_schema} />
          }
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
            {(activeSection === "pages" ? pagesMenuItems : endpointsMenuItems).map((item) => (
              <button
                key={item.label}
                className="block px-4 py-2 text-sm hover:bg-muted w-full text-left"
                onClick={() => {
                  if (item.action === "add-page") openInput("pages");
                  if (item.action === "add-endpoint") openInput("endpoints");
                  handleClick();
                }}
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