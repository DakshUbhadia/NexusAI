"use client";

import { useEffect, useRef } from "react";
import { gsap } from "./gsapConfig";

/**
 * Attach the returned ref to a container.
 * A radial gradient spotlight follows the cursor inside that container.
 *
 * @param color   CSS color for the glow center  (default cyan)
 * @param size    Glow diameter in px            (default 600)
 * @param opacity Max opacity of the glow        (default 0.12)
 */
export function useMouseGlow<T extends HTMLElement = HTMLDivElement>(
  color = "rgba(6,182,212,1)",
  size  = 600,
  opacity = 0.12
) {
  const ref     = useRef<T>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container || globalThis.window === undefined) return;

    // Create glow div
    const glow       = document.createElement("div");
    glow.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 0;
      width:  ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: radial-gradient(circle, ${color} 0%, transparent 65%);
      opacity: 0;
      transform: translate(-50%, -50%);
      will-change: transform, opacity;
      transition: opacity 0.4s ease;
    `;
    container.style.position = container.style.position || "relative";
    container.insertBefore(glow, container.firstChild);
    glowRef.current = glow;

    const pos = { x: 0, y: 0 };

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x    = e.clientX - rect.left;
      const y    = e.clientY - rect.top;
      gsap.to(pos, {
        x,
        y,
        duration: 0.6,
        ease: "power2.out",
        onUpdate: () => {
          glow.style.transform = `translate(${pos.x - size / 2}px, ${pos.y - size / 2}px)`;
        },
      });
    };

    const onEnter = () => { glow.style.opacity = String(opacity); };
    const onLeave = () => { glow.style.opacity = "0"; };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseenter", onEnter);
    container.addEventListener("mouseleave", onLeave);

    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseenter", onEnter);
      container.removeEventListener("mouseleave", onLeave);
      glow.remove();
    };
  }, [color, size, opacity]);

  return ref;
}