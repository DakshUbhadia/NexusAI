"use client";

import { useEffect, useRef } from "react";
import { gsap } from "../../animations/gsapConfig";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MagneticButton from "../../ui/MagneticButton";
import TiltCard from "../../ui/TiltCard";

gsap.registerPlugin(ScrollTrigger);

/* ─── Feature data ────────────────────────────────────────────── */
const features = [
  {
    id: "01",
    title: "AI Architecture Generation",
    sub: "Gemini-powered",
    body: "Describe your system in plain English. A durable Trigger.dev background task calls Gemini, validates the graph against a strict Zod schema, and writes the entire node-and-edge architecture into the shared Liveblocks room — visible to every collaborator instantly.",
    color: "#A855F7",
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
        <path d="M10 16 L13 10 L16 16 L19 10 L22 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "02",
    title: "Real-Time Collaborative Canvas",
    sub: "Liveblocks + React Flow",
    body: "Simultaneous editing with live cursors, collaborator name tags, and a presence strip. Every node drag, edge connect, and label edit is broadcast to all connected teammates with sub-100ms latency.",
    color: "#06B6D4",
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="3" y="3" width="11" height="11" rx="2.5" fill="currentColor" opacity="0.85" />
        <rect x="18" y="3" width="11" height="11" rx="2.5" fill="currentColor" opacity="0.45" />
        <rect x="3" y="18" width="11" height="11" rx="2.5" fill="currentColor" opacity="0.45" />
        <rect x="18" y="18" width="11" height="11" rx="2.5" fill="currentColor" opacity="0.65" />
        <line x1="14" y1="8.5" x2="18" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1" opacity="0.6" />
        <line x1="23.5" y1="14" x2="23.5" y2="18" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: "03",
    title: "Starter Design Templates",
    sub: "4 patterns included",
    body: "Bootstrap from monolith, microservices, event-driven, or serverless blueprints. Import into the live canvas at any point — no server round-trip, no disruption to active collaborators.",
    color: "#F59E0B",
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="3" y="3" width="26" height="7" rx="2" fill="currentColor" opacity="0.85" />
        <rect x="3" y="14" width="11" height="15" rx="2" fill="currentColor" opacity="0.55" />
        <rect x="18" y="14" width="11" height="6" rx="2" fill="currentColor" opacity="0.55" />
        <rect x="18" y="23" width="11" height="6" rx="2" fill="currentColor" opacity="0.35" />
      </svg>
    ),
  },
  {
    id: "04",
    title: "Production-Grade Spec Generation",
    sub: "Build-ready output",
    body: "A second AI agent converts your final canvas into a multi-page Markdown spec: system blueprint, recommended stack, full roadmap, dev phases, and task breakdowns granular enough for Copilot, Codex, or Claude Code to execute end to end.",
    color: "#6366F1",
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="6" y="2" width="20" height="28" rx="3" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5" />
        <line x1="10" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="15" x2="22" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <line x1="10" y1="20" x2="17" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <circle cx="24" cy="26" r="5" fill="#22D3EE" />
        <path d="M22 26 L23.5 27.5 L26.5 24.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "05",
    title: "AI-Agent–Optimized Export",
    sub: "One-click handoff",
    body: "Download as .md or hit 'Copy for AI Agent' which prepends a system prompt tuned for GitHub Copilot, OpenAI Codex, and Claude Code ingestion. Your coding agent gets a complete senior-engineer brief in a single paste.",
    color: "#10B981",
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="4" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 16 L13 12 L17 16 L22 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="25" cy="25" r="6" fill="currentColor" />
        <path d="M23 25 L24.5 26.5 L27.5 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "06",
    title: "Team Access & Project Management",
    sub: "Clerk auth",
    body: "Owners assign collaborators by user ID. Collaborators can view, edit canvas, and trigger AI — but cannot delete the project or manage team membership. Every workspace is auth-gated and isolated.",
    color: "#EC4899",
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="12" r="4.5" fill="currentColor" opacity="0.85" />
        <circle cx="7" cy="15" r="3.5" fill="currentColor" opacity="0.55" />
        <circle cx="25" cy="15" r="3.5" fill="currentColor" opacity="0.55" />
        <path d="M3 28 C3 22 8 19 16 19 C24 19 29 22 29 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
  },
];

const N       = features.length;
const FAN_DEG = 16;   // degrees between adjacent cards
const RADIUS  = 1800; // arc radius — pivot far below viewport

// A card stays "in focus" (border lit) from center until it has rotated
// 20° past center on the left side. At FAN_DEG=16°/card that is ~1.25 card slots.
const FOCUS_LEFT_DEG = 20; // degrees past center before glow drops
const FOCUS_LEFT_SLOTS = FOCUS_LEFT_DEG / FAN_DEG; // ≈ 1.25

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = Number.parseInt(h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/* ─── Arc Carousel ────────────────────────────────────────────── */
function ArcCarousel() {
  const wrapRef       = useRef<HTMLDivElement>(null);
  const cardRefs      = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs       = useRef<(HTMLDivElement | null)[]>([]);
  const labelTitleRef = useRef<HTMLSpanElement>(null);
  const labelSubRef   = useRef<HTMLSpanElement>(null);
  const labelDotRef   = useRef<HTMLSpanElement>(null);
  const lastActive    = useRef(-1);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    /* ── Core layout function ─────────────────────────────────── */
    const applyFan = (activeFloat: number) => {
      cardRefs.current.forEach((card, i) => {
        if (!card) return;

        // offset: negative = left of center (already passed), positive = right (upcoming)
        const offset   = i - activeFloat;
        const angleDeg = offset * FAN_DEG;
        const angleRad = angleDeg * (Math.PI / 180);

        // Arc position — pivot is RADIUS px below center of stage
        const x = RADIUS * Math.sin(angleRad);
        const y = RADIUS * (1 - Math.cos(angleRad));

        const absOff = Math.abs(offset);

        // Cards to the left dim more aggressively, but only AFTER crossing the
        // 20° focus threshold (FOCUS_LEFT_SLOTS card-widths past center).
        const isLeft          = offset < 0;
        const pastFocusOnLeft = isLeft && absOff > FOCUS_LEFT_SLOTS;

        const scale = isLeft
          ? Math.max(0.70, 1 - absOff * 0.10)
          : Math.max(0.74, 1 - absOff * 0.085);

        const opacity = pastFocusOnLeft
          ? Math.max(0.08, 0.40 - (absOff - FOCUS_LEFT_SLOTS) * 0.14)
          : isLeft
            ? Math.max(0.55, 1 - absOff * 0.10) // still in focus zone — keep bright
            : Math.max(0.22, 1 - absOff * 0.26);

        const zIndex = Math.round(200 - absOff * 20);

        // A card is "in focus" if it is at center OR within the left focus window
        const inFocus = offset >= -FOCUS_LEFT_SLOTS && offset <= 0.5;

        const feat           = features[i];
        const borderOpacity  = inFocus ? 0.55 : 0.10;
        const glowOpacity    = inFocus ? 0.18 : 0;

        gsap.set(card, {
          x,
          y: -y,
          rotation: angleDeg,
          scale,
          opacity,
          zIndex,
          transformOrigin: `50% calc(100% + ${RADIUS}px)`,
        });

        // Update card border glow
        const inner = card.querySelector<HTMLElement>(".card-inner");
        if (inner) {
          inner.style.borderColor = `rgba(${hexToRgb(feat.color)}, ${borderOpacity})`;
          inner.style.boxShadow   = inFocus
            ? `0 0 0 1px rgba(${hexToRgb(feat.color)},${glowOpacity}), 0 32px 80px rgba(0,0,0,0.65), 0 0 60px rgba(${hexToRgb(feat.color)},0.18)`
            : `0 16px 48px rgba(0,0,0,0.45)`;
        }
      });

      // Update label & dots when active index changes
      const activeIdx = Math.round(activeFloat);
      const clamped   = Math.max(0, Math.min(N - 1, activeIdx));
      if (clamped !== lastActive.current) {
        lastActive.current = clamped;
        const feat = features[clamped];
        if (labelTitleRef.current) labelTitleRef.current.textContent = feat.title;
        if (labelSubRef.current)   labelSubRef.current.textContent   = feat.sub;
        if (labelDotRef.current)   labelDotRef.current.style.background = feat.color;
        dotRefs.current.forEach((d, j) => {
          if (!d) return;
          d.style.background = j === clamped ? features[j].color : "rgba(255,255,255,0.15)";
          d.style.transform  = j === clamped ? "scale(1.6)" : "scale(1)";
        });
      }
    };

    applyFan(0);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrap,
        start: "top top",
        end: () => `+=${(N - 1) * Math.round(window.innerHeight * 0.9)}`,
        pin: wrap,
        pinSpacing: true,
        scrub: 0.9,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          applyFan(self.progress * (N - 1));
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden"
      style={{ height: "100vh", background: "#07070E" }}
    >
      {/* Ambient center glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 54%, rgba(124,58,237,0.09) 0%, transparent 70%)",
        }}
      />

      {/* Cards stage */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: "1400px" }}
      >
        {features.map((feat, i) => (
          <div
            key={feat.id}
            ref={(el) => { cardRefs.current[i] = el; }}
            className="absolute will-change-transform"
            style={{ width: 320, height: 410 }}
          >
            {/*
              TiltCard wraps the visual card content.
              The outer div is GSAP-controlled (position, rotation, scale, opacity)
              and must NOT be a Tilt target — tilt only the inner card face.
            */}
            <TiltCard
              tiltMaxAngleDeg={7}
              glareEnabled={true}
              className="w-full h-full"
            >
              <div
                className="card-inner w-full h-full rounded-3xl flex flex-col p-7 gap-3 relative overflow-hidden transition-[border-color,box-shadow] duration-500"
                style={{
                  background: "rgba(12,12,22,0.88)",
                  backdropFilter: "blur(24px)",
                  border: `1px solid rgba(${hexToRgb(feat.color)}, 0.12)`,
                }}
              >
                {/* Top shimmer line */}
                <div
                  className="absolute top-0 left-6 right-6 h-px"
                  style={{
                    background: `linear-gradient(to right, transparent, ${feat.color}44, transparent)`,
                  }}
                />

                {/* Icon + badge */}
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: `rgba(${hexToRgb(feat.color)}, 0.12)`,
                      color: feat.color,
                      border: `1px solid rgba(${hexToRgb(feat.color)}, 0.2)`,
                    }}
                  >
                    {feat.icon}
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.22em] px-2.5 py-1 rounded-full"
                    style={{
                      background: `rgba(${hexToRgb(feat.color)}, 0.08)`,
                      color: feat.color,
                      border: `1px solid rgba(${hexToRgb(feat.color)}, 0.18)`,
                    }}
                  >
                    {feat.sub}
                  </span>
                </div>

                {/* Number */}
                <span
                  className="font-display font-black leading-none select-none"
                  style={{
                    fontSize: "4.5rem",
                    color: `rgba(${hexToRgb(feat.color)}, 0.11)`,
                    lineHeight: 1,
                  }}
                  aria-hidden="true"
                >
                  {feat.id}
                </span>

                {/* Text */}
                <div className="flex-1 flex flex-col justify-end gap-2 mt-auto">
                  <h3
                    className="font-display text-base font-bold leading-snug"
                    style={{ color: "#F0EEFF" }}
                  >
                    {feat.title}
                  </h3>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.38)" }}
                  >
                    {feat.body}
                  </p>
                </div>

                {/* Bottom accent */}
                <div
                  className="h-px w-full rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${feat.color}44, transparent)`,
                  }}
                />
              </div>
            </TiltCard>
          </div>
        ))}
      </div>

      {/* Bottom label */}
      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2">
          <span
            ref={labelDotRef}
            className="w-1.5 h-1.5 rounded-full transition-all duration-400"
            style={{ background: features[0].color }}
          />
          <span
            ref={labelSubRef}
            className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-semibold"
          >
            {features[0].sub}
          </span>
        </div>
        <span ref={labelTitleRef} className="text-sm font-semibold text-white/55">
          {features[0].title}
        </span>
        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-1">
          {features.map((f, i) => (
            <div
              key={f.id}
              ref={(el) => { dotRefs.current[i] = el; }}
              className="w-1 h-1 rounded-full transition-all duration-300"
              style={{ background: i === 0 ? f.color : "rgba(255,255,255,0.15)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Stat counter ────────────────────────────────────────────── */
function StatCounter({
  to,
  label,
  suffix = "",
}: {
  to: number;
  label: string;
  suffix?: string;
}) {
  const numRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = numRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: to,
        duration: 2,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = Math.round(obj.val) + suffix;
        },
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });
    });
    return () => ctx.revert();
  }, [to, suffix]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        ref={numRef}
        className="font-display text-4xl md:text-5xl font-bold gradient-text tabular-nums"
      >
        0{suffix}
      </span>
      <span className="text-xs uppercase tracking-[0.2em] text-white/30 text-center">
        {label}
      </span>
    </div>
  );
}

/* ─── Tech marquee ────────────────────────────────────────────── */
const techStack = [
  "React Flow", "Liveblocks", "Gemini AI", "Trigger.dev", "Vercel Blob",
  "PostgreSQL", "Clerk Auth", "Next.js 15", "TypeScript", "Zod", "Prisma ORM", "tRPC",
];

function TechMarquee() {
  const t1 = useRef<HTMLDivElement>(null);
  const t2 = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(t1.current, { x: "-50%", duration: 28, ease: "none", repeat: -1 });
      gsap.to(t2.current, {
        x: "0%",
        duration: 32,
        ease: "none",
        repeat: -1,
        startAt: { x: "-50%" },
      });
    });
    return () => ctx.revert();
  }, []);
  const doubled = [...techStack, ...techStack];
  return (
    <div
      className="relative overflow-hidden py-8 border-y border-white/4"
      aria-hidden="true"
    >
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          className={`absolute ${side}-0 top-0 bottom-0 w-32 z-10 pointer-events-none`}
          style={{
            background: `linear-gradient(to ${side === "left" ? "right" : "left"}, #07070E 0%, transparent 100%)`,
          }}
        />
      ))}
      <div className="space-y-3">
        <div ref={t1} className="flex whitespace-nowrap">
          {doubled.map((item, i) => (
            <span key={`t-${item}-${i}`} className="flex items-center gap-6 px-6">
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/20">
                {item}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
            </span>
          ))}
        </div>
        <div ref={t2} className="flex whitespace-nowrap">
          {doubled.map((item, i) => (
            <span key={`b-${item}-${i}`} className="flex items-center gap-6 px-6">
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/10">
                {item}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/5" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────────── */
export default function FeaturesSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-h]"),
        { opacity: 0, y: 32, filter: "blur(8px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="features"
      className="relative bg-[#07070E]"
      aria-labelledby="features-headline"
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(124,58,237,0.07) 0%, transparent 65%)",
        }}
      />

      {/* Header */}
      <div
        ref={headerRef}
        className="relative max-w-6xl mx-auto px-6 md:px-10 pt-28 pb-16 text-center"
      >
        <div data-h className="mb-4">
          <span className="inline-block text-[10px] uppercase tracking-[0.35em] font-bold text-[#8B5CF6] px-3.5 py-1.5 rounded-full border border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.05)]">
            Platform Capabilities
          </span>
        </div>
        <h2
          id="features-headline"
          data-h
          className="font-display text-4xl md:text-6xl font-black tracking-[-0.03em] text-white mb-5"
        >
          Everything your team needs
          <br />
          <span className="gradient-text">to ship faster</span>
        </h2>
        <p
          data-h
          className="text-base md:text-lg text-white/40 max-w-xl mx-auto leading-relaxed"
        >
          From a plain-English prompt to a build-ready technical spec — all in
          one unified AI workspace.
        </p>
      </div>

      {/* Arc carousel */}
      <ArcCarousel />

      {/* Stats */}
      <div
        ref={statsRef}
        className="relative max-w-6xl mx-auto px-6 md:px-10 py-20"
      >
        <div
          className="glass-card rounded-3xl px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          <StatCounter to={4}   label="System Templates" />
          <StatCounter to={2}   label="Durable AI Agents" />
          <StatCounter to={100} suffix="%" label="Real-Time Sync" />
          <StatCounter to={11}  label="Steps to Ship" />
        </div>
      </div>

      {/* Marquee */}
      <TechMarquee />

      {/* CTA */}
      <div className="relative max-w-6xl mx-auto px-6 md:px-10 py-20 text-center">
        <MagneticButton
          href="#how-it-works"
          className="px-9 py-4 rounded-full text-sm font-bold btn-violet"
          aria-label="See how Nexus AI works"
        >
          See How It Works →
        </MagneticButton>
      </div>
    </section>
  );
}