import { Box, FileCode2, Folder } from "lucide-react";
import { content } from "../content";
import { ui } from "../styles";
import { Panel, Status } from "./Primitives";

const code = [
  ["from", " fastapi ", "import", " APIRouter"],
  ["from", " app.models ", "import", " Workspace"],
  ["", "", "", ""],
  ["router", " = APIRouter(prefix=", '"/projects"', ")"],
  ["", "", "", ""],
  ["@router.post", '("/import")', "", ""],
  ["async def", " import_repository(repo: str):", "", ""],
  ["", "  workspace = ", "await", " Workspace.create(repo)"],
  ["", "  return workspace.runtime_state", "", ""],
];

export function ProductPreview() {
  const { preview } = content;
  return (
    <Panel className="overflow-hidden shadow-2xl shadow-black/30">
      <header className="flex h-11 items-center justify-between border-b border-white/10 bg-[var(--dv-surface-inset)] px-4">
        <span className="flex items-center gap-2 font-mono text-[10px]"><Box size={12} /> LIDE / 01</span>
        <span className={ui.micro}>main / {preview.project}</span>
        <Status>runtime healthy</Status>
      </header>
      <div className="grid min-h-[460px] grid-cols-[170px_1fr_240px] max-lg:grid-cols-[150px_1fr] max-sm:grid-cols-1">
        <aside className="border-r border-white/10 bg-[var(--dv-surface-inset)] py-4 max-sm:hidden">
          <span className={cxText("block px-4 pb-3", ui.micro)}>Repository</span>
          {preview.files.map((file) => (
            <div
              key={file}
              className={cxText(
                "flex h-7 items-center gap-2 px-4 font-mono text-[10px]",
                file.includes("projects.py") ? "bg-white/[.06] text-[var(--dv-accent)]" : "text-white/40",
              )}
            >
              {file.trim().includes(".") ? <FileCode2 size={11} /> : <Folder size={11} />}
              {file.trim()}
            </div>
          ))}
        </aside>
        <section className="grid min-w-0 grid-rows-[38px_1fr_120px]">
          <div className="flex border-b border-white/10 bg-[#0d1219]">
            <span className="border-r border-white/10 border-t-2 border-t-[var(--dv-accent)] px-4 py-3 font-mono text-[10px]">projects.py</span>
          </div>
          <div className="overflow-hidden bg-[#10151d] p-5 font-mono text-[11px] leading-6 text-white/60">
            {code.map((parts, index) => (
              <div key={index}>
                <span className="mr-5 inline-block w-4 text-right text-white/20">{index + 1}</span>
                <span className="text-[var(--dv-accent)]">{parts[0]}</span>{parts[1]}
                <span className="text-[var(--dv-success)]">{parts[2]}</span>{parts[3]}
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 bg-[#090d12] p-4 font-mono text-[10px] leading-5 text-white/45">
            {preview.terminal.map((line) => <div key={line}>{line}</div>)}
          </div>
        </section>
        <aside className="border-l border-white/10 bg-[var(--dv-surface-inset)] p-4 max-lg:hidden">
          <div className="mb-3 flex justify-between"><span className={ui.micro}>Services</span><span className={ui.micro}>3 / 3</span></div>
          {preview.services.map((service) => (
            <div key={service} className="flex h-10 items-center justify-between border-t border-white/10 font-mono text-[10px] text-white/55">
              {service}<Status>live</Status>
            </div>
          ))}
          <div className="mb-2 mt-6 flex justify-between"><span className={ui.micro}>Discovered routes</span><span className={ui.micro}>28</span></div>
          {preview.routes.map(([method, route]) => (
            <div key={route} className="grid grid-cols-[40px_1fr] border-t border-white/10 py-2 font-mono text-[9px] text-white/40">
              <strong className="text-[var(--dv-accent)]">{method}</strong><span>{route}</span>
            </div>
          ))}
        </aside>
      </div>
    </Panel>
  );
}

function cxText(...values: string[]) {
  return values.join(" ");
}
