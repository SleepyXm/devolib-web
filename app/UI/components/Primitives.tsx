import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { ui } from "../styles";

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type ActionProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  tone?: "primary" | "quiet" | "danger";
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Action({
  children,
  className,
  href,
  tone = "primary",
  ...props
}: ActionProps) {
  const tones = {
    primary: "border-[var(--dv-accent)] bg-[var(--dv-accent)] text-black hover:bg-white",
    quiet: "border-white/15 bg-white/[.03] text-white hover:border-white/30",
    danger: "border-[var(--dv-danger)]/35 bg-[var(--dv-danger)]/10 text-[#d3aaaa] hover:bg-[var(--dv-danger)] hover:text-black",
  };
  const classes = cx(
    "inline-flex min-h-10 items-center justify-center gap-2 border px-4 font-mono text-[10px] font-semibold uppercase tracking-[.08em] transition disabled:cursor-not-allowed disabled:opacity-40",
    tones[tone],
    className,
  );
  return href ? (
    <Link href={href} className={classes}>{children}</Link>
  ) : (
    <button className={classes} {...props}>{children}</button>
  );
}

export function Panel({
  children,
  className,
  inset = false,
}: {
  children: ReactNode;
  className?: string;
  inset?: boolean;
}) {
  return <div className={cx(inset ? ui.panelInset : ui.panel, className)}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.14em] text-[var(--dv-accent)] before:h-px before:w-5 before:bg-current">
      {children}
    </span>
  );
}

export function Status({
  children,
  state = "live",
}: {
  children: ReactNode;
  state?: "live" | "idle" | "offline";
}) {
  const dot = {
    live: "bg-[var(--dv-success)]",
    idle: "bg-[var(--dv-warning)]",
    offline: "bg-[var(--dv-danger)]",
  };
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.08em] text-white/45">
      <i className={cx("h-1.5 w-1.5 rounded-full", dot[state])} />
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-8 border-b border-white/10 pb-6 max-md:items-start max-md:flex-col">
      <div className="grid max-w-3xl gap-3">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="m-0 text-4xl font-medium tracking-[-.045em] max-sm:text-3xl">{title}</h1>
        {description && <p className="m-0 text-sm text-white/50">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Panel inset className="grid min-h-60 place-items-center border-dashed p-8 text-center">
      <div className="grid max-w-md gap-4">
        <h2 className="m-0 text-xl font-medium">{title}</h2>
        <p className="m-0 text-sm leading-6 text-white/45">{children}</p>
        {action && <div>{action}</div>}
      </div>
    </Panel>
  );
}
