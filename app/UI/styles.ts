export const ui = {
  page: "min-h-screen pt-16 text-[var(--dv-text)]",
  container: "mx-auto w-[min(calc(100%-2rem),1180px)] max-sm:w-[calc(100%-1.25rem)]",
  section: "py-20 max-sm:py-14",
  panel: "relative border border-white/10 bg-[var(--dv-surface)]",
  panelInset: "border border-white/10 bg-[var(--dv-surface-inset)]",
  micro: "font-mono text-[10px] uppercase tracking-[.12em] text-white/40",
  muted: "text-white/55",
  field:
    "min-h-11 w-full border border-white/10 bg-[var(--dv-surface-inset)] px-3 text-sm outline-none transition focus:border-[var(--dv-accent)] focus:ring-2 focus:ring-white/10",
  nav:
    "inline-flex min-h-9 items-center border border-transparent px-3 font-mono text-[10px] uppercase tracking-[.08em] text-white/45 transition hover:border-white/10 hover:bg-white/[.04] hover:text-white",
} as const;
