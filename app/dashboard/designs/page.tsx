import { Action, content, PageHeader, Panel, Status, theme, ui } from "@/app/UI";

export default function DesignsPage() {
  return (
    <div className="grid gap-8">
      <PageHeader {...content.interface} />
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <Panel className="p-5">
          <span className={ui.micro}>Semantic tokens</span>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {Object.entries(theme).map(([name, value]) => (
              <div key={name}>
                <span className="block h-12 border border-white/10" style={{ background: value }} />
                <span className="mt-2 block font-mono text-[9px] text-white/35">{name}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="grid content-between gap-8 p-5">
          <div><span className={ui.micro}>Callable primitives</span><h2 className="mt-4 text-xl font-medium">Actions and state</h2></div>
          <div className="flex flex-wrap items-center gap-3">
            <Action>Primary</Action><Action tone="quiet">Quiet</Action><Status>healthy</Status><Status state="idle">waiting</Status>
          </div>
        </Panel>
      </div>
      <Panel inset className="p-5 font-mono text-xs leading-6 text-white/55">
        <span className="text-[var(--dv-accent)]">content.landing.title</span> controls the homepage copy.
        <br />
        <span className="text-[var(--dv-accent)]">theme.accent</span> and shared compositions control the visual system.
      </Panel>
    </div>
  );
}
