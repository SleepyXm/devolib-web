import { useState, useContext } from "react";
import { ProjectMetaContext } from "@/app/dashboard/[project]/layout";

export const METHOD_COLORS: Record<string, string> = {
  GET: "bg-[var(--dv-success)]/10 text-[#afc3b5]",
  POST: "bg-white/[.06] text-white/60",
  PUT: "bg-[var(--dv-warning)]/10 text-[#c1b48f]",
  DELETE: "bg-[var(--dv-danger)]/10 text-[#cda4a4]",
  PATCH: "bg-[#9d8fa4]/10 text-[#b5a4bb]",
  ANY: "text-gray-400 bg-gray-800",
};

function MethodBadge({ method }: { method: string }) {
  const cls = METHOD_COLORS[method] ?? "text-gray-400 bg-gray-800";
  return (
    <span className={`inline-flex items-center px-1.5 py-px rounded text-[10px] font-bold font-mono ${cls}`}>
      {method}
    </span>
  );
}

export default function RequestFlow() {
  const { endpoints } = useContext(ProjectMetaContext)!;
  const [selectedEndpoint, setSelectedEndpoint] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "flow">("overview");

  const selected = endpoints[selectedEndpoint] ?? null;

  const flowSteps = selected ? [
    { label: "Client",    icon: "◎", color: "border-gray-600 text-gray-300" },
    { label: "Router",    icon: "⊕", color: "border-white/30 text-white/65" },
    { label: selected.file, icon: "◆", color: "border-[var(--dv-success)]/40 text-[#afc3b5]" },
    { label: "Response",  icon: "◎", color: "border-gray-600 text-gray-300" },
  ] : [];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border border-white/10 bg-[var(--dv-surface-inset)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 flex-shrink-0">
        <span className="text-xs text-gray-500 uppercase tracking-widest mr-1 dark:text-white">Routes</span>
        <span className="text-xs text-gray-600">{endpoints.length} endpoints</span>
        <div className="ml-auto flex rounded overflow-hidden border border-gray-700">
          {(["overview", "flow"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs transition-colors capitalize ${
                activeTab === tab ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {endpoints.length > 0 && (
          <div className="w-48 flex-shrink-0 border-r border-gray-700 overflow-y-auto bg-gray-950">
            {endpoints.map((ep, i) => (
              <button
                key={i}
                onClick={() => { setSelectedEndpoint(i); setActiveTab("flow"); }}
                className={`w-full flex flex-col gap-0.5 px-2 py-2 border-b border-gray-800/60 text-left hover:bg-white/5 transition-colors ${
                  selectedEndpoint === i ? "border-l-2 border-l-white/40 bg-white/5" : ""
                }`}
              >
                <MethodBadge method={ep.method} />
                <span className="text-gray-300 text-[11px] leading-tight truncate">{ep.path}</span>
                <span className="text-gray-300 text-[11px] leading-tight truncate">{ep.handler}</span>
                <span className="text-gray-600 text-[10px] truncate">{ep.file}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {endpoints.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600 select-none">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M6 10h24M6 18h16M6 26h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-xs">No endpoints detected yet</p>
            </div>
          )}

          {/* Overview */}
          {endpoints.length > 0 && activeTab === "overview" && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-2">
                {endpoints.map((ep, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedEndpoint(i); setActiveTab("flow"); }}
                    className={`flex flex-col gap-1 p-2.5 rounded border text-left transition-colors hover:bg-white/5 ${
                      selectedEndpoint === i
                        ? "border-white/25 bg-white/[.05]"
                        : "border-gray-700 bg-gray-800/40"
                    }`}
                  >
                    <MethodBadge method={ep.method} />
                    <span className="text-gray-200 text-[11px] truncate">{ep.path}</span>
                    <span className="text-gray-600 text-[10px] truncate">{ep.file}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Flow */}
          {endpoints.length > 0 && activeTab === "flow" && selected && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="rounded border border-gray-700 bg-gray-800/60 p-3">
                <div className="flex items-center gap-2">
                  <MethodBadge method={selected.method} />
                  <span className="text-gray-200 text-sm">{selected.path}</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">{selected.file}</div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">Request flow</p>
                {flowSteps.map((step, i, arr) => (
                  <div key={i} className="flex flex-col items-start ml-2">
                    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded border ${step.color} bg-gray-900/60 text-xs`}>
                      <span>{step.icon}</span>
                      <span>{step.label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="ml-3 w-px h-4 border-l border-dashed border-gray-700" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
