import { useContext } from "react";
import { ProjectLogsContext } from "../../layout";

export default function LogsPanel() {
  const { logs, clearLogs } = useContext(ProjectLogsContext)!;

  const directionSymbol = {
    inbound: "←",
    outbound: "→",
    self: "⇓",
  };

  return (
    <div className="flex flex-col flex-1 bg-white">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-zinc-400 p-2 bg-[#111318] overflow-hidden rounded-t-lg w-full">
          Logs
        </p>
        {logs.length > 0 && (
          <button
            onClick={clearLogs}
            className="text-xs text-muted-foreground bg-[#111318] h-full text-zinc-400 hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      <div className="border border-[#c9bfab] bg-card flex flex-col gap-1 flex-1 overflow-auto">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No logs yet.</p>
        ) : (
          [...logs].reverse().map((log, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs p-3 border-b hover:bg-muted/50 transition-colors"
            >
              <span
                className={`font-mono px-1.5 py-0.5 rounded shrink-0 uppercase ${
                  log.direction === "self"
                    ? "bg-red-500/10 text-red-400"
                    : log.direction === "inbound"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-blue-500/10 text-blue-400"
                }`}
              >
                {directionSymbol[log.direction]} {log.direction}
              </span>
              <span
                className={`shrink-0 font-mono px-1.5 py-0.5 rounded ${
                  log.source === "frontend"
                    ? "bg-purple-500/10 text-purple-400"
                    : log.source === "backend"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-orange-500/10 text-orange-400"
                }`}
              >
                {log.source}
              </span>
              {log.status && (
                <span className="text-muted-foreground shrink-0">
                  {log.status}
                </span>
              )}
              <span className="font-mono truncate">{log.message}</span>
              <span className="text-muted-foreground/40 ml-auto shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
