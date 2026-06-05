"use client";

import React, { useRef, useState } from "react";
import { motion, useSpring } from "framer-motion";

interface MagneticButtonProps {
  children:        React.ReactNode;
  className?:      string;
  href?:           string;
  strength?:       number;
  onClick?:        () => void;
  "aria-label"?:   string;
}

/**
 * A button that smoothly drifts toward the cursor when hovered.
 * Snaps back on mouse-leave via spring physics.
 */
export default function MagneticButton({
  children,
  className = "",
  href,
  strength = 28,
  onClick,
  "aria-label": ariaLabel,
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useSpring(0, { stiffness: 180, damping: 22 });
  const y = useSpring(0, { stiffness: 180, damping: 22 });

  const setElementRef = (element: HTMLElement | null) => {
    ref.current = element;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    x.set(dx * strength);
    y.set(dy * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  const motionProps = {
    style: { x, y },
    onMouseMove:  handleMouseMove,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: handleMouseLeave,
    onClick,
    whileTap: { scale: 0.95 },
    className: `magnetic-btn relative transition-all duration-200 ${
      isHovered ? "brightness-110" : ""
    } ${className}`,
    "aria-label": ariaLabel,
  };

  if (href) {
    return (
      <motion.a ref={setElementRef} href={href} {...motionProps}>
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button ref={setElementRef} type="button" {...motionProps}>
      {children}
    </motion.button>
  );
}