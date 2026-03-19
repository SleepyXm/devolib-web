import { useState, useRef, useEffect } from "react";
 
interface Route {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ANY";
  path: string;
  handler: string;
  middleware?: string[];
}
 
interface LogEntry {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  status: number;
  duration: number;
  body?: string;
  response?: string;
}
 
interface RequestFlowProps {
  code: string;
}
 
export const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-400 bg-emerald-900/30",
  POST: "text-blue-400 bg-blue-900/30",
  PUT: "text-yellow-400 bg-yellow-900/30",
  DELETE: "text-red-400 bg-red-900/30",
  PATCH: "text-purple-400 bg-purple-900/30",
  ANY: "text-gray-400 bg-gray-800",
};
 
const STATUS_COLOR = (s: number) => {
  if (s >= 500) return "text-red-400";
  if (s >= 400) return "text-orange-400";
  if (s >= 300) return "text-yellow-400";
  return "text-green-400";
};
 
function MethodBadge({ method }: { method: string }) {
  const cls = METHOD_COLORS[method] ?? "text-gray-400 bg-gray-800";
  return (
    <span className={`inline-flex items-center px-1.5 py-px rounded text-[10px] font-bold font-mono ${cls}`}>
      {method}
    </span>
  );
}
 
let logIdCounter = 0;
function makeLog(route: Route): LogEntry {
  const statuses = [200, 201, 204, 400, 401, 404, 500];
  const weights = [0.5, 0.15, 0.1, 0.08, 0.05, 0.07, 0.05];
  let r = Math.random();
  let status = 200;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) { status = statuses[i]; break; }
  }
  return {
    id: `log-${++logIdCounter}`,
    timestamp: Date.now(),
    method: route.method === "ANY" ? ["GET", "POST"][Math.floor(Math.random() * 2)] : route.method,
    path: route.path,
    status,
    duration: Math.floor(Math.random() * 200) + 5,
  };
}
 
export default function RequestFlow({ code }: RequestFlowProps) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [parsing, setParsing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [activeTab, setActiveTab] = useState<"flow" | "logs">("flow");
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
 
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);
 
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);
 
  const parseRoutes = async () => {
    if (!code.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a route extractor. Given Python web framework code (Flask, FastAPI, Django, etc), extract all HTTP routes.
Return ONLY a JSON array of objects with: method, path, handler, middleware (array, optional).
Valid methods: GET POST PUT DELETE PATCH ANY. No markdown, no prose.`,
          messages: [{ role: "user", content: `Extract routes from:\n\n${code}` }],
        }),
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text ?? "[]";
      let parsed: Route[] = [];
      try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch {}
      setRoutes(parsed);
      setSelectedRoute(parsed[0] ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setParsing(false);
    }
  };
 
  const toggleSimulation = () => {
    if (simulating) {
      clearInterval(simIntervalRef.current!);
      simIntervalRef.current = null;
      setSimulating(false);
    } else {
      if (!routes.length) return;
      setSimulating(true);
      simIntervalRef.current = setInterval(() => {
        const route = routes[Math.floor(Math.random() * routes.length)];
        setLogs((prev) => [...prev.slice(-99), makeLog(route)]);
      }, 600);
    }
  };
 
  const clearLogs = () => setLogs([]);
 
  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 font-mono text-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 bg-gray-850 flex-shrink-0">
        <span className="text-xs text-gray-500 uppercase tracking-widest mr-1">Routes</span>
        <button
          onClick={parseRoutes}
          disabled={parsing || !code.trim()}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs transition-colors"
        >
          {parsing ? <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full" /> : null}
          {parsing ? "Parsing…" : "Parse Routes"}
        </button>
        {routes.length > 0 && (
          <>
            <button
              onClick={toggleSimulation}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                simulating
                  ? "bg-red-700 hover:bg-red-600 text-white"
                  : "bg-emerald-700 hover:bg-emerald-600 text-white"
              }`}
            >
              <span className={simulating ? "inline-block w-2 h-2 bg-white rounded-sm" : ""}>
                {!simulating && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 1.5L8.5 5L2 8.5V1.5Z" fill="white" />
                  </svg>
                )}
              </span>
              {simulating ? "Stop" : "Simulate"}
            </button>
            <button onClick={clearLogs} className="px-2 py-1 rounded text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Clear
            </button>
          </>
        )}
        {/* Tab switcher */}
        <div className="ml-auto flex rounded overflow-hidden border border-gray-700">
          {(["flow", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs transition-colors ${
                activeTab === tab ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab === "flow" ? "Flow" : `Logs${logs.length ? ` (${logs.length})` : ""}`}
            </button>
          ))}
        </div>
      </div>
 
      <div className="flex flex-1 overflow-hidden">
        {/* Route list (left sidebar) */}
        {routes.length > 0 && (
          <div className="w-48 flex-shrink-0 border-r border-gray-700 overflow-y-auto bg-gray-950">
            {routes.map((route, i) => (
              <button
                key={i}
                onClick={() => setSelectedRoute(route)}
                className={`w-full flex flex-col gap-0.5 px-2 py-2 border-b border-gray-800/60 text-left hover:bg-white/5 transition-colors ${
                  selectedRoute === route ? "bg-white/5 border-l-2 border-l-indigo-500" : ""
                }`}
              >
                <MethodBadge method={route.method} />
                <span className="text-gray-300 text-[11px] leading-tight truncate">{route.path}</span>
                <span className="text-gray-600 text-[10px] truncate">{route.handler}</span>
              </button>
            ))}
          </div>
        )}
 
        {/* Main area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {routes.length === 0 && !parsing && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600 select-none">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M6 10h24M6 18h16M6 26h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="30" cy="26" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M28.5 26h3M30 24.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <p className="text-xs">Parse routes from your code</p>
            </div>
          )}
          {parsing && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
              <span className="animate-spin inline-block w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
              <span className="text-xs">Extracting routes…</span>
            </div>
          )}
 
          {routes.length > 0 && activeTab === "flow" && selectedRoute && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Route detail */}
              <div className="rounded border border-gray-700 bg-gray-800/60 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <MethodBadge method={selectedRoute.method} />
                  <span className="text-gray-200 text-sm">{selectedRoute.path}</span>
                </div>
                <div className="text-gray-500 text-xs">Handler: <span className="text-gray-300">{selectedRoute.handler}</span></div>
                {selectedRoute.middleware?.length ? (
                  <div className="text-gray-500 text-xs">
                    Middleware:{" "}
                    {selectedRoute.middleware.map((m, i) => (
                      <span key={i} className="inline-flex items-center px-1.5 py-px rounded bg-gray-700 text-gray-300 text-[10px] mr-1">{m}</span>
                    ))}
                  </div>
                ) : null}
              </div>
 
              {/* Flow diagram */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">Request flow</p>
                {[
                  { label: "Client", icon: "◎", color: "border-gray-600 text-gray-300" },
                  { label: "Router", icon: "⊕", color: "border-indigo-600 text-indigo-300" },
                  ...(selectedRoute.middleware?.map((m) => ({
                    label: m,
                    icon: "⊘",
                    color: "border-yellow-700 text-yellow-300",
                  })) ?? []),
                  { label: selectedRoute.handler, icon: "◆", color: "border-emerald-700 text-emerald-300" },
                  { label: "Response", icon: "◎", color: "border-gray-600 text-gray-300" },
                ].map((step, i, arr) => (
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
 
          {routes.length > 0 && activeTab === "logs" && (
            <div className="flex-1 overflow-y-auto bg-gray-950 p-0">
              {logs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-700 select-none">
                  <p className="text-xs">Hit Simulate to generate traffic</p>
                </div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800/60 text-xs hover:bg-white/5 transition-colors">
                  <span className="text-gray-700 w-16 flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString("en-GB", { hour12: false })}
                  </span>
                  <MethodBadge method={log.method} />
                  <span className="flex-1 text-gray-300 truncate">{log.path}</span>
                  <span className={`font-bold ${STATUS_COLOR(log.status)}`}>{log.status}</span>
                  <span className="text-gray-600 w-14 text-right">{log.duration}ms</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}