import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
  gsap.ticker.lagSmoothing(0);

  // Global ScrollTrigger defaults
  ScrollTrigger.defaults({
    toggleActions: "play none none none",
  });
}

export const ease = {
  smooth:   "power2.out",
  snappy:   "power3.out",
  elastic:  "elastic.out(1, 0.5)",
  back:     "back.out(1.7)",
  expo:     "expo.out",
  linear:   "none",
  circ:     "circ.out",
} as const;

export const dur = {
  fast:   0.3,
  base:   0.6,
  slow:   0.9,
  slower: 1.2,
} as const;

export const stagger = {
  tight: { each: 0.04, ease: "power2.out" },
  base:  { each: 0.08, ease: "power2.out" },
  loose: { each: 0.14, ease: "power2.out" },
} as const;

export function createFadeUp(
  targets: string | Element | Element[],
  options?: {
    trigger?:      Element | string;
    delay?:        number;
    duration?:     number;
    staggerEach?:  number;
    start?:        string;
    blur?:         boolean;
  }
) {
  const {
    trigger,
    delay       = 0,
    duration    = dur.base,
    staggerEach = 0,
    start       = "top 85%",
    blur        = false,
  } = options ?? {};

  return gsap.fromTo(
    targets,
    {
      opacity: 0,
      y: 40,
      ...(blur ? { filter: "blur(8px)" } : {}),
      willChange: "transform, opacity",
    },
    {
      opacity:  1,
      y:        0,
      ...(blur ? { filter: "blur(0px)" } : {}),
      duration,
      delay,
      ease:     ease.snappy,
      stagger:  staggerEach ? { each: staggerEach } : 0,
      scrollTrigger: trigger
        ? { trigger, start, toggleActions: "play none none none" }
        : undefined,
    }
  );
}

export { gsap, ScrollTrigger };