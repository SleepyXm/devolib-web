import { PackageManager,  QueuedPackage } from "../models/depshelper";

export function InstallingIndicator({ installingPm }: { installingPm: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-zinc-600">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#50c878]"
            style={{ animation: `installPulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
      <span className="text-[11px]">installing via {installingPm}...</span>
      <style>{`
        @keyframes installPulse {
          0%, 100% { opacity: 0.2; transform: translateY(0); }
          50%       { opacity: 1;   transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

export function PackageManagerTabs({ pm, onChange }: { pm: PackageManager; onChange: (pm: PackageManager) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-zinc-600 uppercase tracking-widest">package manager</span>
      <div className="flex gap-1">
        {(["npm", "pip", "yarn", "cargo"] as PackageManager[]).map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-3 py-1 rounded text-[11px] border transition-colors ${
              pm === p
                ? "bg-zinc-800 border-zinc-600 text-zinc-100"
                : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PackageInput({ value, isDev, onChange, onToggleDev, onAdd, onKeyDown }: {
  value: string;
  isDev: boolean;
  onChange: (v: string) => void;
  onToggleDev: (v: boolean) => void;
  onAdd: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="package name or name@version…"
        className="flex-1 bg-[#0a0c10] border border-[#1e2228] rounded px-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600"
      />
      <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 cursor-pointer select-none whitespace-nowrap">
        <input type="checkbox" checked={isDev} onChange={e => onToggleDev(e.target.checked)} className="accent-[#50c878]" />
        --dev
      </label>
      <button
        onClick={onAdd}
        disabled={!value.trim()}
        className="px-3 py-1.5 rounded text-xs font-bold text-zinc-400 border border-[#c9bfab] bg-[#f8f4ec] hover:border-zinc-600 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
      >
        + Add
      </button>
    </div>
  );
}

export function QueuedPackages({ queue, onRemove }: { queue: QueuedPackage[]; onRemove: (i: number) => void }) {
  if (!queue.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] text-zinc-700 uppercase tracking-widest">queued ({queue.length})</span>
      <div className="flex flex-wrap gap-1.5">
        {queue.map((pkg, i) => (
          <div key={i} className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#1e2228] bg-[#0e1018] text-xs">
            {pkg.dev && (
              <span className="text-[9px] px-1 rounded border border-[#2a2a4a] text-[#5060a8] bg-[#1a1a2e]">dev</span>
            )}
            <span className="text-zinc-300">{pkg.name}</span>
            <button onClick={() => onRemove(i)} className="text-zinc-700 hover:text-red-400 text-sm leading-none transition-colors">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CommandPreview({ preview }: { preview: string | null }) {
  return (
    <div className="text-[11px] px-2.5 py-1.5 rounded border border-[#1e2228] bg-[#070a0d] text-zinc-600 truncate">
      {preview
        ? <><span className="text-zinc-400">$ </span><span className="text-[#5070c8]">{preview}</span></>
        : "add packages above to preview the command"
      }
    </div>
  );
}

export function InstallButton({ onClick, disabled, queueLength }: {
  onClick: () => void;
  disabled: boolean;
  queueLength: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      style={{ background: "#50c878", color: "#0a1810", border: "2px solid #0b130d77" }}
    >
      ▶ Install {queueLength > 0 && `(${queueLength})`}
    </button>
  );
}