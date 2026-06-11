"use client";

import Tilt from "react-parallax-tilt";
import { ReactNode } from "react";
import { clsx } from "clsx";

interface TiltCardProps {
  readonly children:         ReactNode;
  readonly className?:       string;
  readonly tiltMaxAngleDeg?: number;
  readonly glareEnabled?:    boolean;
}

export default function TiltCard({
  children,
  className,
  tiltMaxAngleDeg = 6,
  glareEnabled    = true,
}: Readonly<TiltCardProps>) {
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