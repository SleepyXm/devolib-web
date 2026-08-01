import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X, AlertTriangle } from "lucide-react";

export default function Popup({
  message,
  onClose,
  type = "error",
}: {
  message: string;
  onClose: () => void;
  type?: "error" | "success";
}) {
  const success = type === "success";
  const Icon = success ? CheckCircle2 : AlertTriangle;
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          className={`fixed left-1/2 top-20 z-[200] flex -translate-x-1/2 items-center gap-3 border px-4 py-3 text-xs shadow-2xl backdrop-blur-xl ${
            success ? "border-[var(--dv-success)]/30 bg-[var(--dv-success)]/10" : "border-red-300/30 bg-red-300/10"
          }`}
        >
          <Icon size={14} className={success ? "text-[var(--dv-success)]" : "text-red-200"} />
          <span>{message}</span>
          <button onClick={onClose} aria-label="Close"><X size={12} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
