"use client";

import {
  useEffect,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const LenisContext = createContext<Lenis | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}

interface LenisProviderProps {
  readonly children: ReactNode;
}

export default function LenisProvider({ children }: LenisProviderProps) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const lenisInstance = new Lenis({
      duration:    1.2,
      easing:      (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
    });

    // Sync Lenis scroll events with GSAP ScrollTrigger
    lenisInstance.on("scroll", ScrollTrigger.update);

    const rafCallback = (time: number) => {
      lenisInstance.raf(time * 1000);
    };

    gsap.ticker.add(rafCallback);
    gsap.ticker.lagSmoothing(0);

    const frameId = window.requestAnimationFrame(() => {
      setLenis(lenisInstance);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      lenisInstance.off("scroll", ScrollTrigger.update);
      lenisInstance.destroy();
      gsap.ticker.remove(rafCallback);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}