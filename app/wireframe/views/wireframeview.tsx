
"use client";

import { useState } from "react";
import { useContextMenu } from "@/app/components/Contextmenu";
import { useWireframe } from "../wireframehooks";
import { SectionPanel, PageRow, DbSection, CreateModal, EndpointSection, groupEndpointsByFile} from "./wireframecomponents";
import LogsPanel from "./logspanel";
import { pagesMenuItems, endpointsMenuItems, groupsMenuItems } from "@/app/components/Contextmenu/wireframemenu";

export default function WireframeView() {
  const {
    db_schema, endpoints, pages, groups,
    showInput, activeSection, setActiveSection, inputValue, setInputValue,
    parentPage, setParentPage,
    openInput, closeInput, handleCreate, setShowInput, endpointType, setEndpointType,
    groupRoot, setGroupRoot, groupWorkspace, setGroupWorkspace
  } = useWireframe();

  const { contextMenu, handleContextMenu, handleClick } = useContextMenu();

  const menuItems = {
  pages: pagesMenuItems,
  endpoints: endpointsMenuItems,
  groups: groupsMenuItems,
};

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-hidden p-5 text-white">
      <div><span className="font-mono text-[10px] uppercase tracking-[.12em] text-white/35">Structural model</span><h2 className="mt-2 text-2xl font-medium">System map</h2></div>

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
          groupRoot={groupRoot}
          onGroupRootChange={setGroupRoot}
          groupWorkspace={groupWorkspace}
          onGroupWorkspaceChange={setGroupWorkspace}
        />
      )}

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto max-lg:grid-cols-1">
        <SectionPanel title="Pages" onContextMenu={(e) => { setActiveSection("pages"); handleContextMenu(e); }}>
          {pages.length === 0
            ? <p className="text-sm text-muted-foreground">No pages found.</p>
            : pages.map((page, i) => <PageRow key={i} route={page.route} file={page.file} />)
          }
        </SectionPanel>

        <SectionPanel title="API Endpoints" onContextMenu={(e) => { setActiveSection("endpoints"); handleContextMenu(e); }}>
          {endpoints.length === 0
          ? <p className="text-sm text-muted-foreground">No endpoints found.</p>
          : Object.entries(groupEndpointsByFile(endpoints)).map(([file, eps]) => (
          <EndpointSection key={file} file={file} endpoints={eps} />
          ))
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
            className="fixed z-50 border border-white/20 bg-[var(--dv-surface)] py-1 text-white shadow-2xl"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            {(menuItems[activeSection!] ?? []).map((item) => (
  <button
    key={item.label}
    className="block px-4 py-2 text-sm hover:bg-muted w-full text-left"
    onClick={() => {
      if (item.action === "add-page") openInput("pages");
      if (item.action === "add-endpoint") openInput("endpoints");
      if (item.action === "add-group") openInput("groups");
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
