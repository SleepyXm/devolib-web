
"use client";

import { useState } from "react";
import { useContextMenu } from "@/app/components/Contextmenu";
import { useWireframe } from "../wireframehooks";
import { SectionPanel, PageRow, DbSection, CreateModal, EndpointSection, groupEndpointsByFile, GroupRow, GroupSection} from "./wireframecomponents";
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
    <div className="flex flex-col w-full p-6 gap-6 h-full text-foreground">
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
          groupRoot={groupRoot}
          onGroupRootChange={setGroupRoot}
          groupWorkspace={groupWorkspace}
          onGroupWorkspaceChange={setGroupWorkspace}
        />
      )}

      <div className="dv-wireframe-container-wrapper">
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

        <SectionPanel title="Folders" onContextMenu={(e) => { setActiveSection("groups"); handleContextMenu(e); }}>
          {groups.length === 0
          ? <p className="text-sm text-muted-foreground">No folders found.</p>
          : groups.map((g, i) => <GroupSection key={i} group={g} />)
          }
        </SectionPanel>

        <LogsPanel />
      </div>

      {contextMenu.show && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClick} />
          <div
            className="fixed z-50 bg-[#f8f4ec] border border-[#00000060] rounded shadow-lg py-1"
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