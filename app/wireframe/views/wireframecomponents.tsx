import { SectionPanelProps, PageRowProps, EndpointRowProps, MethodBadgeProps, DbSectionProps, CreateModalProps, EndpointsByFile } from '../wireframeprops';
 

 
export function SectionPanel({ title, children, onContextMenu }: SectionPanelProps) {
  return (
    <div className="dv-wireframe-container" onContextMenu={onContextMenu}>
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 p-2 bg-[#111318] rounded-t-lg pl-4">
        {title}
      </p>
      <div className="border border-[#c9bfab] bg-white flex flex-col gap-1 flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
 
export function PageRow({ route, file }: PageRowProps) {
  return (
    <div className="flex items-center gap-2 text-sm px-6 py-3 border-b border-black/30 hover:bg-muted/50 transition-colors">
      <span className="font-mono text-[#1a6888]">{route}</span>
      <span className="text-zinc-800/70 text-xs ml-auto font-mono">{file}</span>
    </div>
  )
}
 
export function groupEndpointsByFile(endpoints: EndpointRowProps[]): EndpointsByFile {
  return endpoints.reduce((acc, ep) => {
    acc[ep.file] = acc[ep.file] ? [...acc[ep.file], ep] : [ep];
    return acc;
  }, {} as EndpointsByFile);
}

export function EndpointSection({ file, endpoints }: { file: string; endpoints: EndpointRowProps[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#7d7668] bg-[#f0ebe0] p-1 pl-4">{file}</p>
      <div className="divide-y text-xs">
        {endpoints.map((ep, i) => <EndpointRow key={i} method={ep.method} path={ep.path} file={ep.file} />)}
      </div>
    </div>
  )
}

export function EndpointRow({ method, path }: EndpointRowProps) {
  return (
    <div className="flex items-center gap-2 text-sm px-6 py-3 border-b border-black/30 hover:bg-muted/50 transition-colors">
      <MethodBadge method={method} />
      <span className="font-mono truncate text-[#1a6888]">{path}</span>
    </div>
  )
}
 
function MethodBadge({ method }: MethodBadgeProps) {
  const colors: Record<string, string> = {
    POST:   "bg-blue-500/10 text-blue-400",
    PUT:    "bg-yellow-500/10 text-yellow-400",
    PATCH:  "bg-yellow-500/10 text-yellow-400",
    DELETE: "bg-red-500/10 text-red-400",
  }
  return (
    <span className={`font-mono text-xs px-1.5 py-0.5 rounded shrink-0 uppercase ${colors[method] ?? "bg-green-300/30 border border-[#96c48f] text-green-600"}`}>
      {method}
    </span>
  )
}
 
export function DbSection({ db_schema }: DbSectionProps) {
  return (
    <>
      {Object.entries(db_schema).map(([table, columns]) => (
        <div key={table}>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7d7668] bg-[#f0ebe0] p-1 pl-4">
            {table}
          </p>
          <div className="divide-y text-xs">
            {columns.map((col) => (
              <div key={col.column} className="flex justify-between text-zinc-700 px-3 py-1.5 hover:bg-muted/50 transition-colors">
                <span className="font-mono">{col.column}</span>
                <span className="text-muted-foreground">{col.type}{col.nullable ? "" : " · NN"}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
 
export function CreateModal({ activeSection, inputValue, onChange, onConfirm, pages, parentPage, onParentChange, onEndpointTypeChange, endpointType, onCancel, groupRoot, onGroupRootChange, groupWorkspace, onGroupWorkspaceChange }: CreateModalProps) {
  return (
    <div className="dv-modal-insert">
      <div className="bg-[#111318] border rounded-lg p-6 flex flex-col gap-4 w-80">
        <p className="text-sm font-semibold text-zinc-400">
          {activeSection === "pages" ? "New Page Name" : activeSection === "groups" ? "New Folder" : "New Endpoint Path"}
        </p>
        <input
          autoFocus
          type="text"
          value={inputValue}
          onChange={onChange}
          onKeyDown={(e) => e.key === "Enter" && onConfirm()}
          placeholder={ activeSection === "pages" ? "Dashboard" : activeSection === "groups" ? "My Folder" : endpointType === "router" ? "items" : "/api/items" }
          className="px-3 py-2 rounded bg-zinc-600 border text-sm"
        />
        {activeSection === "pages" && (
          <select
            value={parentPage ? `/${parentPage.path}` : ""}
            onChange={(e) => {
              const selected = pages.find(p => p.route === e.target.value);
              onParentChange(selected ? {
                name: selected.file.replace("src/", "").replace(".jsx", ""),
                path: selected.route.replace("/", "")
              } : null);
            }}
            className="px-3 py-2 rounded bg-zinc-600 border text-sm"
          >
            <option value="">No parent (top level)</option>
            {pages.map(p => (
              <option key={p.route} value={p.route}>{p.route}</option>
            ))}
          </select>
        )}
        {activeSection === "endpoints" && (
          <select
            value={endpointType}
            onChange={(e) => onEndpointTypeChange?.(e.target.value as "endpoint" | "router")}
            className="px-3 py-2 rounded bg-zinc-600 border text-sm"
          >
            <option value="endpoint">Endpoint</option>
            <option value="router">Router</option>
          </select>
        )}

        {activeSection === "groups" && (
          <div className="flex flex-col gap-2">
            <select
            value={groupWorkspace}
            onChange={(e) => onGroupWorkspaceChange(e.target.value as "frontend" | "backend" | "database" | "workspace")}
            className="px-3 py-2 rounded bg-zinc-600 border text-sm"
            >
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="database">Database</option>
              <option value="workspace">Workspace</option>
            </select>
            <input
            type="text"
            value={groupRoot}
            onChange={(e) => onGroupRootChange(e.target.value)}
            placeholder="src/components"
            className="px-3 py-2 rounded bg-zinc-600 border text-sm"
            />
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded text-zinc-600 transition-all duration-300 hover:bg-muted hover:text-white">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-sm rounded bg-primary text-zinc-600 transition-all duration-300 hover:text-white">
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

export function GroupRow({ name, filepath }: { name: string; filepath: string }) {
  return (
    <div className="flex items-center gap-2 text-sm px-6 py-3 border-b border-black/30 hover:bg-muted/50 transition-colors">
      <span className="font-mono text-[#1a6888]">{name}</span>
      <span className="text-zinc-800/70 text-xs ml-auto font-mono">{filepath}</span>
    </div>
  )
}

export function GroupSection({ group }: { group: { label: string; root: string; files: { name: string; filepath: string }[] } }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#7d7668] bg-[#f0ebe0] p-1 pl-4">
        {group.label} <span className="normal-case text-[#b0a898]">· {group.root}</span>
      </p>
      <div className="divide-y text-xs">
        {group.files.length === 0
          ? <p className="text-zinc-400 px-6 py-3 text-xs">No files yet.</p>
          : group.files.map((f, i) => <GroupRow key={i} name={f.name} filepath={f.filepath} />)
        }
      </div>
    </div>
  )
}