"use client";

import { useEffect, useRef } from "react";

export default function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let pointer = { x: -1000, y: -1000 };
    let frame = 0;
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const draw = () => {
      frame = 0;
      const width = canvas.width / pixelRatio;
      const height = canvas.height / pixelRatio;
      const gap = 18;
      const radius = 0.75;
      const influence = 175;

      context.clearRect(0, 0, width, height);

      for (let y = gap / 2; y < height; y += gap) {
        for (let x = gap / 2; x < width; x += gap) {
          const distance = Math.hypot(x - pointer.x, y - pointer.y);
          const proximity = Math.max(0, 1 - distance / influence);
          const eased = proximity * proximity * (3 - 2 * proximity);
          const alpha = 0.055 + eased * 0.82;

          context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          context.beginPath();
          context.arc(x, y, radius + eased * 0.45, 0, Math.PI * 2);
          context.fill();
        }
      }
    };

    const requestDraw = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    const resize = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      requestDraw();
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      requestDraw();
    };

    const handlePointerLeave = () => {
      pointer = { x: -1000, y: -1000 };
      requestDraw();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);
    window.addEventListener("resize", resize);
    resize();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
