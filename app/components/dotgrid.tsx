"use client";

import { useEffect, useRef } from "react";

function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let mouse = { x: -9999, y: -9999 };
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const parseHex = (hex: string) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const lerpColor = (a: number[], b: number[], t: number) => [
      lerp(a[0], b[0], t),
      lerp(a[1], b[1], t),
      lerp(a[2], b[2], t),
    ];

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      const grid = 12;
      const dotR = 0.6;
      const cursorR = 160;

      const base = parseHex("#cccccc");
      const highlight = parseHex("#000000");

      ctx.clearRect(0, 0, w, h);

      const half = grid / 2;
      const cols = Math.ceil(w / grid);
      const rows = Math.ceil(h / grid);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * grid + half;
          const y = row * grid + half;

          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const t =
            dist < cursorR
              ? 0.5 + 0.5 * Math.cos((Math.PI * dist) / cursorR)
              : 0;

          const [r, g, b] = lerpColor(base, highlight, t);

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.beginPath();
          ctx.arc(x, y, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const handleMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      draw();
    };

    const handleLeave = () => {
      mouse = { x: -9999, y: -9999 };
      draw();
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);
    window.addEventListener("resize", resize);

    resize();

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas className="dv-dot-grid-canvas" ref={canvasRef} />;
}

export default DotGrid;