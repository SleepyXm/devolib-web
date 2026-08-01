import { ArrowRight, Container, ScanSearch, TerminalSquare } from "lucide-react";
import { Action, content, Eyebrow, ProductPreview, ui } from "./UI";

const icons = [ScanSearch, Container, TerminalSquare];

export default function Home() {
  const { landing } = content;
  return (
    <main className={ui.page}>
      <section className="min-h-screen py-[clamp(5rem,9vw,8rem)]">
        <div className={ui.container}>
          <div className="grid max-w-4xl gap-6">
            <Eyebrow>{landing.eyebrow}</Eyebrow>
            <h1 className="m-0 text-[clamp(3rem,7vw,6.4rem)] font-medium leading-[.94] tracking-[-.055em]">
              {landing.title.map((line) => <span className="block" key={line}>{line}</span>)}
            </h1>
            <p className="m-0 max-w-2xl text-lg leading-8 text-white/55">{landing.description}</p>
            <div className="flex flex-wrap gap-3">
              <Action href="/login">Launch workspace <ArrowRight size={13} /></Action>
              <Action href="/architecture" tone="quiet">How it works</Action>
            </div>
            <div className="flex flex-wrap font-mono text-[10px] uppercase text-white/35">
              {landing.facts.map((fact) => (
                <span className="border-l border-white/10 px-4 first:border-0 first:pl-0" key={fact}>{fact}</span>
              ))}
            </div>
          </div>

          <div className="mt-[clamp(4rem,9vw,7rem)]">
            <ProductPreview />
            <div className="grid grid-cols-3 gap-px border border-t-0 border-white/10 bg-white/10 max-md:grid-cols-1">
              {landing.capabilities.map(([title, copy], index) => {
                const Icon = icons[index];
                return (
                  <article className="grid min-h-36 content-between gap-5 bg-[var(--dv-surface)] p-5" key={title}>
                    <Icon size={16} className="text-[var(--dv-accent)]" />
                    <div>
                      <h2 className="mb-2 text-sm font-medium">{title}</h2>
                      <p className="m-0 text-xs leading-5 text-white/45">{copy}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
