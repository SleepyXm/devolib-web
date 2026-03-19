import { useEffect, useRef, useState } from "react";

export function getLogColor(line: string) {
  if (line.startsWith("User connected")) return "text-[#50c878]"
  if (line.includes("✓")) return "text-[#50c878]"
  if (line.includes("✗") || line.toLowerCase().includes("error")) return "text-[#c85050]"
  if (line.includes("→")) return "text-[#5070c8]"
  if (line.includes("ℹ")) return "text-[#d48459]"
  if (line.includes("warning")) return "text-yellow-400"
  return "text-zinc-400"
}

export function TerminalControls({ start, connect, stop, isRunning, isConnected }: {
  start: () => void
  connect: () => void
  stop: () => void
  isRunning: boolean
  isConnected: boolean
}) {
  return (
    <div className="flex gap-2">
      <button onClick={start} disabled={isRunning} className="flex items-center gap-1.5 px-4 py-2 rounded font-mono text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "#50c878", color: "#0a1810", border: "2px solid #0b130d77" }}>▶ Start</button>
      <button onClick={connect} disabled={!isRunning || isConnected} className="flex items-center gap-1.5 px-4 py-2 rounded font-mono text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "#4a90e0", color: "#fff", border: "2px solid #2a70c0" }}>➤ Connect</button>
      <button onClick={stop} disabled={!isRunning} className="px-4 py-2 rounded font-mono text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "#fe6767", color: "#fff", border: "2px solid #47070777" }}>■</button>
    </div>
  )
}

export function Terminal({ logs, isConnected, onCommand }: {
  logs: string
  isConnected: boolean
  onCommand: (cmd: string) => void
}) {
  const [buffer, setBuffer] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // autoscroll on new output
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, buffer]);

  // focus container on mount so keydown works immediately
  useEffect(() => {
    containerRef.current?.focus();
  }, [isConnected]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isConnected) return;
    e.preventDefault();

    if (e.key === "Enter") {
      if (buffer.trim()) onCommand(buffer);
      setBuffer("");
    } else if (e.key === "Backspace") {
      setBuffer((prev) => prev.slice(0, -1));
    } else if (e.key === "c" && e.ctrlKey) {
      setBuffer("");
    } else if (e.key.length === 1) {
      setBuffer((prev) => prev + e.key);
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="flex-1 flex flex-col rounded-md text-sm font-mono outline-none overflow-hidden"
      style={{ background: "#0e1018", border: "1px solid #1e2228" }}
    >
      {/* log output */}
      <div className="flex-1 overflow-y-auto p-3 leading-relaxed">
        {logs
          ? logs.split("\n").map((line, i) => (
              <div key={i} className={getLogColor(line)}>{line}</div>
            ))
          : <span className="text-zinc-600">Waiting for container output...</span>
        }
        <div ref={bottomRef} />
      </div>

      {/* prompt line */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-t border-[#1e2228]"
        style={{ background: "#0a0c10" }}
      >
        <span className="text-[#50c878] select-none">$</span>
        <span className="text-[#c8cdd8]">{buffer}</span>
        <span className={`select-none inline-block w-2 border-b-2 border-[#50c878] mb-0.5 ${isConnected ? "animate-pulse" : "opacity-20"}`}>&nbsp;</span>
      </div>
    </div>
  )
}


export function LogOutput({ logs }: { logs: string }) {
  return (
    <div className="flex-1 overflow-y-auto rounded-md p-3 text-sm leading-relaxed" style={{ background: "#0e1018", border: "1px solid #1e2228" }}>
      {logs
        ? logs.split("\n").map((line, i) => <div key={i} className={getLogColor(line)}>{line}</div>)
        : <span className="text-zinc-600">Waiting for container output...</span>
      }
    </div>
  )
}