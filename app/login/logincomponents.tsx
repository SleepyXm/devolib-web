import type { ReactNode } from "react";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { GithubIcon } from "@/app/components/assets/icons";
import { ui } from "@/app/UI";

export function AuthInput({
  label,
  type,
  placeholder,
  value,
  onChange,
  extra,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  extra?: ReactNode;
}) {
  const Icon = label.includes("Email") ? Mail : label.includes("User") ? UserRound : LockKeyhole;
  return (
    <label className="grid gap-2">
      <span className="flex justify-between font-mono text-[10px] uppercase tracking-[.08em] text-white/40">
        {label}{extra}
      </span>
      <span className="relative">
        <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          className={`${ui.field} pl-9`}
          required
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
      </span>
    </label>
  );
}

export function AuthDivider() {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 font-mono text-[9px] uppercase text-white/25 before:h-px before:bg-white/10 after:h-px after:bg-white/10">
      or continue with
    </div>
  );
}

export function GithubButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 items-center justify-center gap-2 border border-white/10 bg-[var(--dv-surface-inset)] font-mono text-[10px] uppercase tracking-[.08em] text-white/55 transition hover:border-white/25 hover:text-white"
    >
      <span className="h-3.5 w-3.5"><GithubIcon /></span> GitHub
    </button>
  );
}
