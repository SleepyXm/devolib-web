import { useState } from "react"
 
type Tab = "wireframe" | "frontend" | "backend" | "database" | "container"
 
export default function DevoLib() {
  const [activeTab, setActiveTab] = useState<Tab>("wireframe")
  const [activeSide, setActiveSide] = useState("Projects")
 
  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg border font-mono"
      style={{ height: "680px", background: "#111318", borderColor: "#0a0c10" }}
    >
      {/* ── TOPBAR ── */}
      <div
        className="flex items-center gap-4 flex-shrink-0 px-4"
        style={{ height: 40, background: "#111318", borderBottom: "1px solid #1e2228" }}
      >
        <div
          className="text-sm font-black tracking-wide flex-shrink-0 px-2 leading-snug"
          style={{ color: "#e8e0d0", border: "2px solid #e8e0d0", paddingTop: 2, paddingBottom: 2 }}
        >
          DevoLib
        </div>
        <nav className="ml-auto flex gap-5">
          {["Home", "dave", "Dashboard", "Sign out"].map((item) => (
            <span
              key={item}
              className="text-xs cursor-pointer font-sans transition-colors"
              style={{ color: item === "Dashboard" ? "#e8e0d0" : "#444a55" }}
            >
              {item}
            </span>
          ))}
        </nav>
      </div>
 
      {/* ── SERVICE BAR ── */}
      <div
        className="flex items-center gap-0.5 flex-shrink-0 px-3"
        style={{ height: 38, background: "#1a1e24", borderBottom: "1px solid #0e1014" }}
      >
        {(
          [
            { id: "frontend", label: "Frontend", dot: "red" },
            { id: "backend", label: "Backend", dot: "red" },
            { id: "database", label: "Database", dot: "red" },
            { id: "wireframe", label: "WireFrame", dot: null },
            { id: "container", label: "Container", dot: "green" },
          ] as { id: Tab; label: string; dot: string | null }[]
        ).map(({ id, label, dot }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-3 rounded font-mono text-xs border transition-colors"
            style={{
              height: 26,
              color: activeTab === id ? "#e8e0d0" : "#3a4050",
              background: activeTab === id ? "#222830" : "transparent",
              borderColor: activeTab === id ? "#2e3540" : "transparent",
            }}
          >
            {dot && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: dot === "red" ? "#c85050" : "#50c878",
                  boxShadow: activeTab === id
                    ? dot === "red"
                      ? "0 0 4px rgba(200,80,80,0.6)"
                      : "0 0 4px rgba(80,200,120,0.6)"
                    : "none",
                }}
              />
            )}
            {label}
          </button>
        ))}
      </div>
 
      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">
 
        {/* ── SIDEBAR ── */}
        <div
          className="flex flex-col flex-shrink-0 py-2"
          style={{ width: 120, background: "#1a1e24", borderRight: "1px solid #0e1014" }}
        >
          <div
            className="font-sans text-xs font-bold uppercase tracking-widest px-3 pb-1 pt-2"
            style={{ color: "#2a2e38", fontSize: 9 }}
          >
            Navigation
          </div>
          {["Dashboard", "Projects", "Designs", "Profile"].map((item) => (
            <button
              key={item}
              onClick={() => setActiveSide(item)}
              className="text-left px-3 py-1.5 font-sans text-xs transition-colors border-l-2"
              style={{
                color: activeSide === item ? "#e8e0d0" : "#3a4050",
                background: activeSide === item ? "#222830" : "transparent",
                borderLeftColor: activeSide === item ? "#50c878" : "transparent",
              }}
            >
              {item}
            </button>
          ))}
        </div>
 
        {/* ── MAIN CONTENT ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
 
          {/* WIREFRAME */}
          {activeTab === "wireframe" && (
            <DotGrid>
              <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
                <WfPanel title="Pages">
                  <WfRow><span style={{ color: "#1a6888" }}>/</span><span className="ml-auto font-sans" style={{ fontSize: 10, color: "#b0a898" }}>src/App.jsx</span></WfRow>
                  <WfRow><span style={{ color: "#1a6888" }}>/bomboclat</span><span className="ml-auto font-sans" style={{ fontSize: 10, color: "#b0a898" }}>Bomboclat.jsx</span></WfRow>
                </WfPanel>
                <WfPanel title="API Endpoints">
                  <WfRow><MethodBadge>GET</MethodBadge><span style={{ color: "#1a6888" }}> /api/health</span><span className="ml-auto font-sans" style={{ fontSize: 10, color: "#b0a898" }}>main.py</span></WfRow>
                  <WfRow><MethodBadge variant="post">POST</MethodBadge><span style={{ color: "#1a6888" }}> /api/auth</span></WfRow>
                </WfPanel>
                <WfPanel title="Database">
                  <WfTableName>aygirl</WfTableName>
                  <WfRow><span style={{ color: "#1a1e24" }}>id</span><span className="ml-auto font-sans" style={{ fontSize: 10, color: "#b0a898" }}>integer · NN</span></WfRow>
                  <WfRow><span style={{ color: "#1a1e24" }}>whoinnamihouse</span><span className="ml-auto font-sans" style={{ fontSize: 10, color: "#b0a898" }}>varchar</span></WfRow>
                  <WfTableName>testtable1</WfTableName>
                  <WfRow><span style={{ color: "#1a1e24" }}>id</span><span className="ml-auto font-sans" style={{ fontSize: 10, color: "#b0a898" }}>integer · NN</span></WfRow>
                  <WfRow><span style={{ color: "#1a1e24" }}>test2</span><span className="ml-auto font-sans" style={{ fontSize: 10, color: "#b0a898" }}>varchar</span></WfRow>
                </WfPanel>
                <WfPanel title="Logs">
                  <WfRow>
                    <LogTag variant="self">SELF</LogTag>
                    <LogTag className="ml-1">logd</LogTag>
                    <span className="ml-1.5 font-sans" style={{ fontSize: 10, color: "#555048" }}>logd started</span>
                    <span className="ml-auto font-sans" style={{ fontSize: 10, color: "#b0a898" }}>19:40:29</span>
                  </WfRow>
                  <WfRow><span className="font-sans" style={{ fontSize: 10, color: "#b0a898" }}>Waiting for events...</span></WfRow>
                </WfPanel>
              </div>
            </DotGrid>
          )}
 
          {/* FRONTEND / PROJECTS */}
          {activeTab === "frontend" && (
            <DotGrid>
              <div className="flex gap-2 mb-3.5 items-center">
                <input
                  className="flex-1 rounded text-xs px-2.5 py-1.5 font-mono outline-none"
                  placeholder="Enter project name"
                  style={{ background: "#fff", border: "1px solid #ccc4b4", color: "#1a1e24" }}
                />
                {["FastAPI", "React", "PostgreSQL"].map((s) => (
                  <select key={s} className="rounded text-xs px-2 py-1.5 font-mono" style={{ background: "#fff", border: "1px solid #ccc4b4", color: "#555048" }}>
                    <option>{s}</option>
                  </select>
                ))}
                <DarkBtn>Create Project</DarkBtn>
              </div>
              <ProjectCard name="indicator-test" status="stopped" stack={["PostgreSQL", "FastAPI", "React"]} />
              <ProjectCard name="auth-service" status="running" stack={["PostgreSQL", "Express", "React"]} />
            </DotGrid>
          )}
 
          {/* DATABASE */}
          {activeTab === "database" && (
            <DotGrid>
              <div className="flex gap-2 mb-3.5 items-center">
                <input
                  className="rounded text-xs px-2.5 py-1.5 font-mono outline-none"
                  placeholder="Table name..."
                  style={{ width: 220, background: "#fff", border: "1px solid #ccc4b4", color: "#1a1e24" }}
                />
                <DarkBtn>Add New Table</DarkBtn>
              </div>
              <DbTable name="aygirl" cols={[{ name: "id", type: "integer · NN" }, { name: "whoinnamihouse", type: "character varying" }]} />
              <DbTable name="testtable1" cols={[{ name: "id", type: "integer · NN" }, { name: "test2", type: "character varying" }, { name: "test3", type: "character varying" }]} />
            </DotGrid>
          )}
 
          {/* CONTAINER */}
          {activeTab === "container" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div
                className="flex gap-2 flex-shrink-0 px-4 py-2.5"
                style={{ background: "#1a1e24", borderBottom: "1px solid #0e1014" }}
              >
                <CtrlBtn variant="start">▶ Start</CtrlBtn>
                <CtrlBtn variant="connect">▶ Connect</CtrlBtn>
                <CtrlBtn variant="stop">■</CtrlBtn>
              </div>
              <div
                className="flex flex-col flex-1 gap-2.5 p-3.5"
                style={{
                  backgroundColor: "#f0ebe0",
                  backgroundImage: "radial-gradient(circle, #c8c0b0 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              >
                <div
                  className="flex-1 rounded-md p-3 text-xs leading-relaxed overflow-y-auto"
                  style={{ background: "#0e1018", border: "1px solid #1e2228", color: "#c8cdd8" }}
                >
                  <div style={{ color: "#50c878" }}>User connected at 2026-03-15T19:40:29.633886!</div>
                  <div style={{ color: "#3a4050" }}>container started — auth-service</div>
                  <div style={{ color: "#3a4050" }}>mounting volumes...</div>
                  <div style={{ color: "#50c878" }}>✓ frontend ready on :3000</div>
                  <div style={{ color: "#50c878" }}>✓ backend ready on :8000</div>
                  <div style={{ color: "#50c878" }}>✓ database connected</div>
                  <div className="mt-2">
                    <span style={{ color: "#4a5068" }}>root@container:~#</span>{" "}
                    <span style={{ color: "#c8cdd8" }}>█</span>
                  </div>
                </div>
                <input
                  className="flex-shrink-0 rounded px-3 py-2 text-xs font-mono outline-none"
                  placeholder="Type command and hit Enter"
                  style={{ background: "#fff", border: "1px solid #ccc4b4", color: "#1a1e24" }}
                />
              </div>
            </div>
          )}
 
          {/* BACKEND */}
          {activeTab === "backend" && (
            <DotGrid className="flex items-center justify-center">
              <div
                className="rounded-md px-8 py-5 font-sans text-xs"
                style={{ background: "#fff", border: "1px solid #d8d0c0", color: "#888070" }}
              >
                Backend editor — select a file to begin
              </div>
            </DotGrid>
          )}
 
        </div>
      </div>
    </div>
  )
}
 
// ── Sub-components ──
 
function DotGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex-1 overflow-y-auto p-4 ${className}`}
      style={{
        backgroundColor: "#f0ebe0",
        backgroundImage: "radial-gradient(circle, #c8c0b0 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      {children}
    </div>
  )
}
 
function WfPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md overflow-hidden" style={{ background: "#fff", border: "1px solid #d8d0c0" }}>
      <div
        className="px-2.5 py-1.5 font-sans font-bold uppercase tracking-widest"
        style={{ fontSize: 9, background: "#111318", borderBottom: "1px solid #1e2228", color: "#8a90a0" }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}
 
function WfRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono"
      style={{ color: "#888070", borderBottom: "1px solid #f0ebe0" }}
    >
      {children}
    </div>
  )
}
 
function WfTableName({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-2.5 py-1 font-sans font-bold uppercase tracking-wider"
      style={{ fontSize: 9, color: "#888070", background: "#f8f4ec", borderBottom: "1px solid #e8e0d0" }}
    >
      {children}
    </div>
  )
}
 
function MethodBadge({ children, variant = "get" }: { children: React.ReactNode; variant?: "get" | "post" }) {
  return (
    <span
      className="font-sans font-bold rounded px-1"
      style={{
        fontSize: 9,
        background: variant === "post" ? "#eef8e8" : "#dff0f8",
        color: variant === "post" ? "#1a6840" : "#1a6888",
        border: `1px solid ${variant === "post" ? "#a0c8a0" : "#b0d8ec"}`,
        padding: "1px 5px",
      }}
    >
      {children}
    </span>
  )
}
 
function LogTag({ children, variant, className = "" }: { children: React.ReactNode; variant?: "self"; className?: string }) {
  return (
    <span
      className={`font-sans rounded px-1 ${className}`}
      style={{
        fontSize: 9,
        padding: "1px 5px",
        background: variant === "self" ? "#eef8f2" : "#f0ebe0",
        color: variant === "self" ? "#1a6840" : "#888070",
        border: `1px solid ${variant === "self" ? "#a0c8a8" : "#ccc4b4"}`,
      }}
    >
      {children}
    </span>
  )
}
 
function ProjectCard({ name, status, stack }: { name: string; status: "running" | "stopped"; stack: string[] }) {
  return (
    <div className="rounded-md overflow-hidden mb-2.5" style={{ background: "#fff", border: "1px solid #d8d0c0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ background: "#f8f4ec", borderBottom: "1px solid #e8e0d0" }}>
        <span className="text-sm font-black tracking-wide" style={{ color: "#1a1e24" }}>{name}</span>
        <span
          className="font-sans text-xs px-2 py-0.5 rounded border"
          style={{
            color: status === "running" ? "#1a6a40" : "#888070",
            background: status === "running" ? "#eef8f2" : "#fff",
            borderColor: status === "running" ? "#90c8a0" : "#ccc4b4",
          }}
        >
          {status}
        </span>
        <span className="ml-auto font-sans text-xs" style={{ color: "#888070" }}>
          Stack: {stack.join(", ")}
        </span>
      </div>
      <div className="flex gap-1.5 flex-wrap px-3.5 py-2.5">
        {stack.map((s) => (
          <span key={s} className="font-sans text-xs px-2 py-0.5 rounded border" style={{ color: "#555048", background: "#f0ebe0", borderColor: "#ccc4b4" }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}
 
function DbTable({ name, cols }: { name: string; cols: { name: string; type: string }[] }) {
  return (
    <div className="rounded-md overflow-hidden mb-2.5" style={{ background: "#fff", border: "1px solid #d8d0c0" }}>
      <div className="flex items-center px-3.5 py-2.5 gap-2.5" style={{ background: "#f8f4ec", borderBottom: "1px solid #e8e0d0" }}>
        <span className="text-sm font-black tracking-wide" style={{ color: "#1a1e24" }}>{name}</span>
        <div className="ml-auto flex gap-1.5">
          <button className="font-mono text-xs px-2.5 py-0.5 rounded cursor-pointer" style={{ background: "#50c878", color: "#0a1810", border: "none" }}>Add Column</button>
          <button className="font-mono text-xs px-2.5 py-0.5 rounded cursor-pointer" style={{ background: "#7050c0", color: "#fff", border: "none" }}>Add Row</button>
        </div>
      </div>
      <div className="px-3.5 py-2.5 flex flex-col gap-1">
        {cols.map((col) => (
          <div key={col.name} className="flex items-center rounded px-2.5 py-1.5 text-xs font-mono" style={{ background: "#fff", border: "1px solid #d8d0c0", color: "#1a1e24" }}>
            {col.name}
            <span className="ml-auto font-sans" style={{ fontSize: 10, color: "#b0a898" }}>{col.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
 
function DarkBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-mono text-xs font-bold px-3.5 py-1.5 rounded cursor-pointer tracking-wide"
      style={{ background: "#111318", color: "#e8e0d0", border: "none" }}
    >
      {children}
    </button>
  )
}
 
function CtrlBtn({ children, variant }: { children: React.ReactNode; variant: "start" | "connect" | "stop" }) {
  const styles = {
    start: { background: "#50c878", color: "#0a1810", borderColor: "#30a858" },
    connect: { background: "#4a90e0", color: "#fff", borderColor: "#2a70c0" },
    stop: { background: "#c85050", color: "#fff", borderColor: "#a03030" },
  }
  return (
    <button
      className="flex items-center gap-1 px-3 py-1 rounded font-mono text-xs font-bold cursor-pointer border"
      style={styles[variant]}
    >
      {children}
    </button>
  )
}