type ServiceView = "frontend" | "backend" | "database" | "wireframe" | "terminal"

interface ServiceTabProps {
  label: string
  active: boolean
  hasDot?: boolean
  online?: boolean
  onClick: () => void
}

export function ServiceTab({ label, active, hasDot = false, online = false, onClick }: ServiceTabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded flex items-center gap-2 ${
        active
          ? "bg-[#222830] border border-[#2e3540] text-white"
          : "bg-transparent border-transparent text-[#3a4050] transition-all hover:text-zinc-400 duration-400"
      }`}
    >
      {hasDot && (
        <span
          className={`w-2 h-2 rounded-full ${
            online ? "bg-[#50c878]" : "bg-[#c85050]"
          } ${
            active
              ? online
                ? "shadow-[0_0_4px_rgba(80,200,120,0.6)]"
                : "shadow-[0_0_4px_rgba(200,80,80,0.6)]"
              : ""
          }`}
        />
      )}
      {label}
    </button>
  )
}