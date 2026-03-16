export function getLogColor(line: string) {
  if (line.startsWith("User connected")) return "text-[#50c878]"
  if (line.includes("✓")) return "text-[#50c878]"
  if (line.includes("✗") || line.toLowerCase().includes("error")) return "text-[#c85050]"
  if (line.includes("→") || line.toLowerCase().includes("error")) return "text-[#5070c8]"
  if (line.includes("ℹ") || line.toLowerCase().includes("error")) return "text-[#d48459]"
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

export function TerminalInput({ command, onChange, onKeyDown, isConnected }: {
  command: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  isConnected: boolean
}) {
  return (
    <input
      type="text"
      value={command}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={isConnected ? "Type command and hit Enter" : "Connect or start container first"}
      disabled={!isConnected}
      className="w-full px-3 py-2 rounded font-mono text-sm outline-none disabled:opacity-50"
      style={{ background: "#0e1018", border: "1px solid #1e2228", color: "#c8cdd8" }}
    />
  )
}