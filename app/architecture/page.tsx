import { ArrowRight } from "lucide-react";
import { Action, content, PageHeader, Panel, Status, ui } from "@/app/UI";
import { Metadata } from "next";

export default function ArchitecturePage() {
  const { architecture } = content;
  return (
    <main className={ui.page}>
      <div className={`${ui.container} py-20`}>
        <PageHeader
          eyebrow={architecture.eyebrow}
          title={architecture.title}
          description={architecture.description}
          action={<Action href="/login">Open workspace <ArrowRight size={12} /></Action>}
        />

        <div className="mt-10 grid grid-cols-4 gap-px border border-white/10 bg-white/10 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {architecture.stages.map(([number, title, copy]) => (
            <Panel className="min-h-56 border-0 p-6" key={number}>
              <div className="flex justify-between font-mono text-[10px] text-white/35">
                <span>{number}</span><Status>{title}</Status>
              </div>
              <div className="mt-16">
                <h2 className="mb-3 text-lg font-medium">{title}</h2>
                <p className="m-0 text-sm leading-6 text-white/45">{copy}</p>
              </div>
            </Panel>
          ))}
        </div>

        <Panel inset className="mt-8 grid grid-cols-[.7fr_1.3fr] gap-10 p-8 max-md:grid-cols-1">
          <div>
            <span className={ui.micro}>Network boundary</span>
            <h2 className="mt-4 text-3xl font-medium tracking-[-.04em]">Public frontend. Private services.</h2>
          </div>
          <div className="grid gap-px bg-white/10">
            {[
              ["Project domain", "commerce-platform.localhost", "routed"],
              ["API service", "FastAPI :8000", "private"],
              ["Database", "PostgreSQL :5432", "private"],
              ["Control", "WebSocket terminal", "live"],
            ].map(([label, value, state]) => (
              <div className="grid min-h-12 grid-cols-[120px_1fr_auto] items-center gap-4 bg-[var(--dv-surface)] px-4 font-mono text-[10px] max-sm:grid-cols-1 max-sm:py-3" key={label}>
                <span className="text-white/35">{label}</span>
                <span>{value}</span>
                <Status>{state}</Status>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: "How Devolib LIDE works — architecture",
  description: "Import, scan, isolate, control. How LIDE turns a repository into an operable runtime.",
};
