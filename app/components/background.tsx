"use client";

import { useState } from "react";
import SmoothScroll from "./scrollsmooth";

export default function Background({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  return (
    <div data-theme={dark ? "dark" : "light"}>
      <div className="dv-wrap">
        <div className="dv-dot-grid" />
        <div className="dv-glow dv-glow-1" />
        <div className="dv-glow dv-glow-2" />
        <div className="dv-glow dv-glow-3" />

        {/* page content */}
        {children}
      </div>
    </div>
  );
}