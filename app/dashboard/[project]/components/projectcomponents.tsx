import { Status, cx } from "@/app/UI";

export function ServiceTab({
  label,
  active,
  hasDot = false,
  online = false,
  connected = false,
  onClick,
}: {
  label: string;
  active: boolean;
  hasDot?: boolean;
  online?: boolean;
  connected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex min-h-9 items-center gap-2 border px-3 font-mono text-[10px] uppercase tracking-[.06em] transition",
        active
          ? "border-white/15 bg-[var(--dv-surface-raised)] text-white"
          : "border-transparent text-white/35 hover:text-white/65",
      )}
    >
      {hasDot && <Status state={online ? (connected ? "idle" : "live") : "offline"}>{label}</Status>}
      {!hasDot && label}
    </button>
  );
}
