"use client";

import React, { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { gsap } from "../../animations/gsapConfig";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Navbar from "../layout/Navbar";
import MagneticButton from "@/components/ui/MagneticButton";

gsap.registerPlugin(ScrollTrigger);

const SPLINE_SCRIPT_SRC =
  "https://unpkg.com/@splinetool/viewer@1.12.97/build/spline-viewer.js";

const SPLINE_URL =
  "https://prod.spline.design/qPmMywcyybNoSOi4/scene.splinecode";

const SPLINE_VIEWER_TAG = "spline-viewer";

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinWrapRef = useRef<HTMLDivElement>(null);
  const splineHostRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);

  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { stiffness: 80, damping: 20 });
  const springY = useSpring(cursorY, { stiffness: 80, damping: 20 });

  // ── Spline viewer mount ──────────────────────────────────────────────────
  useEffect(() => {
    const host = splineHostRef.current;
    if (!host || typeof window === "undefined") return;

    let cancelled = false;

    const mountViewer = () => {
      if (cancelled || !host) return;
      host.replaceChildren();

      const viewer = document.createElement(SPLINE_VIEWER_TAG);
      viewer.setAttribute("url", SPLINE_URL);
      viewer.setAttribute("events-target", "global");

      Object.assign(viewer.style, {
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: "auto",
      });

      host.appendChild(viewer);
    };

    const handleReady = () => {
      if (cancelled) return;
      if (customElements.get(SPLINE_VIEWER_TAG)) {
        mountViewer();
        return;
      }
      customElements.whenDefined(SPLINE_VIEWER_TAG).then(() => {
        if (!cancelled) mountViewer();
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src='${SPLINE_SCRIPT_SRC}']`
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = SPLINE_SCRIPT_SRC;
      script.async = true;
      script.onload = handleReady;
      document.head.appendChild(script);
    } else {
      handleReady();
    }

    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, []);

  // ── Cursor parallax ──────────────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const onMouseMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      cursorX.set(e.clientX - rect.left);
      cursorY.set(e.clientY - rect.top);
    };
    section.addEventListener("mousemove", onMouseMove);
    return () => section.removeEventListener("mousemove", onMouseMove);
  }, [cursorX, cursorY]);

  // ── Text entrance animation ──────────────────────────────────────────────
  useEffect(() => {
    const l1 = line1Ref.current;
    const l2 = line2Ref.current;
    if (!l1 || !l2) return;

    const splitLine = (el: HTMLElement) => {
      if (el.dataset.split === "1") return el.querySelectorAll<HTMLElement>(".char > span");
      el.dataset.split = "1";
      const text = el.textContent ?? "";
      el.innerHTML = text
        .split("")
        .map((ch) =>
          ch === " "
            ? `<span style="display:inline-block;width:0.28em"> </span>`
            : `<span class="char" style="display:inline-block;overflow:hidden;vertical-align:bottom"><span style="display:inline-block">${ch}</span></span>`
        )
        .join("");
      return el.querySelectorAll<HTMLElement>(".char > span");
    };

    const chars1 = splitLine(l1);
    const chars2 = splitLine(l2);

    const ctx = gsap.context(() => {
      gsap.set([l1, l2], { opacity: 1 });
      const tl = gsap.timeline({ delay: 0.1 });

      tl.fromTo(
        badgeRef.current,
        { opacity: 0, y: -16, filter: "blur(6px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "power3.out" }
      );
      tl.fromTo(
        [...chars1],
        { y: "105%", opacity: 0, rotateX: 45 },
        { y: "0%", opacity: 1, rotateX: 0, duration: 0.9, stagger: 0.018, ease: "power4.out", transformOrigin: "bottom center" },
        "-=0.2"
      );
      tl.fromTo(
        [...chars2],
        { y: "105%", opacity: 0, rotateX: 45 },
        { y: "0%", opacity: 1, rotateX: 0, duration: 0.9, stagger: 0.016, ease: "power4.out", transformOrigin: "bottom center" },
        "-=0.65"
      );

      const subEl = subtitleRef.current;
      if (subEl) {
        const words = subEl.textContent?.split(" ") ?? [];
        subEl.innerHTML = words
          .map(
            (w) =>
              `<span style="display:inline-block;overflow:hidden;vertical-align:bottom;margin-right:0.28em"><span style="display:inline-block">${w}</span></span>`
          )
          .join("");
        const wordSpans = subEl.querySelectorAll("span > span");
        tl.fromTo(
          wordSpans,
          { y: "100%", opacity: 0 },
          { y: "0%", opacity: 1, duration: 0.6, stagger: 0.04, ease: "power3.out" },
          "-=0.4"
        );
        gsap.set(subEl, { opacity: 1 });
      }

      tl.fromTo(
        ctaRef.current,
        { opacity: 0, y: 20, filter: "blur(8px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.65, ease: "power3.out" },
        "-=0.3"
      );
      tl.fromTo(
        scrollHintRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.5 },
        "+=0.4"
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // ── Scroll exit animation ────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      const section = sectionRef.current;
      if (!section) return;
      gsap.to(pinWrapRef.current, {
        scale: 0.88, opacity: 0, y: -40, filter: "blur(12px)", ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "35% top", scrub: 1.2 },
      });
      gsap.to(scrollHintRef.current, {
        opacity: 0, ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "8% top", scrub: true },
      });
    });
    return () => ctx.revert();
  }, []);

  const orbsData = [
    { cx: "15%", cy: "25%", size: 320, color: "rgba(124,58,237,0.07)", dur: 8 },
    { cx: "80%", cy: "20%", size: 260, color: "rgba(6,182,212,0.07)", dur: 11 },
    { cx: "70%", cy: "75%", size: 400, color: "rgba(99,102,241,0.05)", dur: 14 },
    { cx: "20%", cy: "70%", size: 220, color: "rgba(168,85,247,0.06)", dur: 9 },
  ];

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-screen overflow-hidden bg-black"
      style={{ perspective: "1000px" }}
    >
      {/* ── Spline background ── */}
      <div
        ref={splineHostRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      />

      {/* ── Cursor glow ── */}
      <motion.div
        className="absolute z-[2] pointer-events-none rounded-full"
        style={{
          width: 700,
          height: 700,
          left: springX,
          top: springY,
          x: "-50%",
          y: "-50%",
          background:
            "radial-gradient(circle, rgba(6,182,212,0.10) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)",
          filter: "blur(1px)",
        }}
      />

      {/* ── Ambient orbs ── */}
      {orbsData.map((orb, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: orb.cx,
            top: orb.cy,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            transform: "translate(-50%,-50%)",
            animation: `orbPulse ${orb.dur}s ease-in-out ${i * 1.5}s infinite`,
          }}
          aria-hidden="true"
        />
      ))}

      {/* ── Radial vignette ── */}
      <div
        className="absolute inset-0 z-[3] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 90% at 50% 45%, transparent 30%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.90) 100%)",
        }}
      />

      {/* ── Bottom fade ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 z-[4] pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent 0%, #07070E 100%)" }}
      />

      <Navbar />

      {/* ── Hero content ── */}
      <div
        ref={pinWrapRef}
        className="relative z-[5] flex min-h-screen flex-col items-center justify-center px-6 text-center will-change-transform"
      >
        <h1
          className="font-display font-black leading-[0.9] tracking-[-0.04em] text-white mb-6"
          style={{ fontSize: "clamp(3.2rem, 8.5vw, 8rem)" }}
        >
          <span
            ref={line1Ref}
            className="block opacity-0"
            style={{ clipPath: "inset(0 0 -15% 0)", display: "block" }}
          >
            Design Systems
          </span>
          <span
            ref={line2Ref}
            className="block opacity-0"
            style={{ clipPath: "inset(0 0 -15% 0)", display: "block" }}
          >
            <span className="gradient-text-animated">with AI</span>
          </span>
        </h1>

        <p
          ref={subtitleRef}
          className="max-w-[480px] text-base md:text-lg font-light leading-[1.65] text-white/50 mb-10 opacity-0"
        >
          Describe your architecture in plain English. Gemini generates a
          validated graph live on your shared canvas. Ship a build-ready spec
          your AI coding agent can implement end to end.
        </p>

        <div ref={ctaRef} className="flex flex-col items-center gap-6 opacity-0">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <MagneticButton
              href="/sign-in"
              className="group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white overflow-hidden btn-violet"
            >
              <span className="relative z-10">Open Workspace</span>
              <span
                className="relative z-10 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-xs group-hover:bg-white/25 transition-colors"
                aria-hidden="true"
              >
                →
              </span>
            </MagneticButton>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold btn-ghost"
            >
              See how it works
            </a>
          </div>
        </div>

        <div
          ref={scrollHintRef}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0"
          aria-hidden="true"
        >
          <span className="text-[9px] uppercase tracking-[0.35em] text-white/25">
            Scroll to explore
          </span>
          <div className="relative w-px h-12 overflow-hidden">
            <div
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-transparent via-white/40 to-transparent"
              style={{ height: "200%", animation: "scrollLine 1.8s ease-in-out infinite" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}