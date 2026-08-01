import type { ChangeEvent, ReactNode } from "react";
import { Action, Panel, ui } from "@/app/UI";

export function MetadataSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <header className="flex justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className={ui.micro}>{count} detected</span>
      </header>
      {count ? children : <Panel inset className="border-dashed p-5 text-xs text-white/40">Nothing reported yet.</Panel>}
    </section>
  );
}

export function MetadataRows({
  rows,
}: {
  rows: Array<[string, string, string?]>;
}) {
  return (
    <div className="grid gap-px border border-white/10 bg-white/10">
      {rows.map(([tag, value, detail], index) => (
        <div
          className="grid min-h-10 grid-cols-[90px_1fr_1fr] items-center gap-3 bg-[var(--dv-surface-inset)] px-3 font-mono text-[10px] max-sm:grid-cols-[70px_1fr]"
          key={`${tag}-${value}-${index}`}
        >
          <strong className="text-[var(--dv-accent)]">{tag}</strong>
          <span>{value}</span>
          {detail && <span className="text-white/35 max-sm:col-start-2">{detail}</span>}
        </div>
      ))}
    </div>
  );
}

export function DangerZone({
  value,
  onChange,
  onDelete,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDelete: () => void;
}) {
  return (
    <Panel className="grid gap-3 border-red-300/25 bg-red-300/[.04] p-5">
      <h3 className="text-sm font-medium text-red-200">Delete project runtime</h3>
      <p className="m-0 text-xs leading-5 text-white/40">
        Type DELETE to remove the project, services, and structural metadata.
      </p>
      <div className="grid grid-cols-[1fr_auto] gap-3 max-sm:grid-cols-1">
        <input
          className="min-h-10 border border-red-300/20 bg-[var(--dv-surface-inset)] px-3 text-sm outline-none"
          value={value}
          onChange={onChange}
          placeholder="DELETE"
        />
        <Action tone="danger" disabled={value !== "DELETE"} onClick={onDelete}>
          Delete permanently
        </Action>
      </div>
    </Panel>
  );
}
