import { motion, AnimatePresence } from "framer-motion";

type ErrorProps = {
    message: string;
    onClose: () => void;
}

export default function ErrorPopup({ message, onClose }: ErrorProps) {

    return(
        <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: "10%",
            left: "38.5%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            borderRadius: "10px",
            backgroundColor: "#e26161",
            border: "1px solid #b9a0a0",
            color: "#cfcfcf"

          }}
        >
            <svg viewBox="0 0 100 100" width="24" height="36">
          <path
            d="M 50 10 L 90 90 L 10 90 Z"
            fill="rgb(255 255 255 /0.1)"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <rect
            x="47"
            y="33"
            width="6"
            height="30"
            rx="3"
            fill="#cfcfcf"
          />
          <circle
            cx="50"
            cy="75"
            r="3.5"
            fill="#cfcfcf"
          />
        </svg>
          <div className="error-popup">
            <span>{message}</span>
            <button onClick={onClose}>✕</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    );
}