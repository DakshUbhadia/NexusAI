"use client";

import Tilt from "react-parallax-tilt";
import { ReactNode } from "react";
import { clsx } from "clsx";

interface TiltCardProps {
  children:         ReactNode;
  className?:       string;
  tiltMaxAngleDeg?: number;
  glareEnabled?:    boolean;
}

export default function TiltCard({
  children,
  className,
  tiltMaxAngleDeg = 6,
  glareEnabled    = true,
}: TiltCardProps) {
  return (
    <Tilt
      tiltMaxAngleX={tiltMaxAngleDeg}
      tiltMaxAngleY={tiltMaxAngleDeg}
      glareEnable={glareEnabled}
      glareMaxOpacity={0.06}
      glareColor="#A78BFA"
      glarePosition="all"
      glareBorderRadius="16px"
      transitionSpeed={1200}
      perspective={1000}
      scale={1.02}
      className={clsx("shimmer-border", className)}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </Tilt>
  );
}