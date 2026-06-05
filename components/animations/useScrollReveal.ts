"use client";

import { useEffect, useRef } from "react";
import { gsap, ease, dur } from "./gsapConfig";

interface ScrollRevealOptions {
  y?:           number;
  duration?:    number;
  staggerEach?: number;
  start?:       string;
  delay?:       number;
  blur?:        boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  selector: string = "[data-reveal]",
  options: ScrollRevealOptions = {}
) {
  const ref = useRef<T>(null);
  const {
    y           = 40,
    duration    = dur.base,
    staggerEach = 0.1,
    start       = "top 80%",
    delay       = 0,
    blur        = false,
  } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = el.querySelectorAll<HTMLElement>(selector);
    if (!targets.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        {
          opacity: 0, y,
          ...(blur ? { filter: "blur(8px)" } : {}),
          willChange: "transform, opacity",
        },
        {
          opacity: 1, y: 0,
          ...(blur ? { filter: "blur(0px)" } : {}),
          duration, delay,
          ease: ease.snappy,
          stagger: { each: staggerEach },
          scrollTrigger: {
            trigger: el, start,
            toggleActions: "play none none none",
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [selector, y, duration, staggerEach, start, delay, blur]);

  return ref;
}

export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const ref = useRef<T>(null);
  const { y = 32, duration = dur.base, start = "top 85%", delay = 0, blur = false } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        {
          opacity: 0, y,
          ...(blur ? { filter: "blur(8px)" } : {}),
          willChange: "transform, opacity",
        },
        {
          opacity: 1, y: 0,
          ...(blur ? { filter: "blur(0px)" } : {}),
          duration, delay,
          ease: ease.snappy,
          scrollTrigger: { trigger: el, start, toggleActions: "play none none none" },
        }
      );
    });
    return () => ctx.revert();
  }, [y, duration, start, delay, blur]);

  return ref;
}