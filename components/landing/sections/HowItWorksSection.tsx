"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { gsap } from "../../animations/gsapConfig";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MagneticButton from "../../ui/MagneticButton";

gsap.registerPlugin(ScrollTrigger);

/* ─── Steps data ──────────────────────────────────────────────── */
const steps = [
  {
    number: "01",
    phase: "Auth",
    title: "Sign in",
    headline: "Your workspace,\nyour rules.",
    body: "Clerk-powered authentication locks every project to its owner. Add collaborators by user ID — they get canvas access and AI triggers but never deletion rights.",
    accent: "#06B6D4",
    tags: ["Clerk", "Protected routes", "RBAC"],
  },
  {
    number: "02",
    phase: "Dashboard",
    title: "Create a project",
    headline: "Own your\narchitecture.",
    body: "A responsive card dashboard shows every project you own or collaborate on. Create a new one and you're automatically assigned as owner with a UUID-linked record in Postgres.",
    accent: "#8B5CF6",
    tags: ["Project management", "PostgreSQL", "Prisma"],
  },
  {
    number: "03",
    phase: "Workspace",
    title: "Enter the canvas",
    headline: "Three columns.\nInfinite possibility.",
    body: "A full-viewport editor opens: left sidebar for project metadata, central React Flow canvas for your architecture, right panel for your AI prompt. Your teammates' cursors are already moving.",
    accent: "#6366F1",
    tags: ["React Flow", "Three-column UI", "Liveblocks"],
  },
  {
    number: "04",
    phase: "Templates",
    title: "Start from a blueprint",
    headline: "Don't start\nfrom scratch.",
    body: "Pick from monolith, microservices, event-driven, or serverless starter templates stored as React Flow JSON snapshots. They load into the live room client-side — no server round-trip.",
    accent: "#F59E0B",
    tags: ["Monolith", "Microservices", "Event-driven", "Serverless"],
  },
  {
    number: "05",
    phase: "AI Generation",
    title: "Describe your system",
    headline: "Plain English.\nProduction graph.",
    body: "Type a natural-language description. A durable Trigger.dev task fires Gemini, validates the structured response against the CanvasGraph Zod schema, then writes every node and edge into the shared Liveblocks room atomically.",
    accent: "#A855F7",
    tags: ["Gemini AI", "Trigger.dev", "Zod validation"],
  },
  {
    number: "06",
    phase: "Live Collab",
    title: "Watch it evolve live",
    headline: "Every teammate\nsees it happen.",
    body: "The validated graph materializes on every connected canvas simultaneously. Live cursors, colored presence strips, and name tags show exactly who's architecting alongside you — in real time.",
    accent: "#EC4899",
    tags: ["Liveblocks", "Live cursors", "Presence"],
  },
  {
    number: "07",
    phase: "Refinement",
    title: "Edit together",
    headline: "Drag. Connect.\nRefine as a team.",
    body: "Any collaborator can restructure the graph — drag nodes, add edges, rename services. Changes auto-save to Vercel Blob and are linked to your Prisma project record for durable reloads.",
    accent: "#10B981",
    tags: ["Vercel Blob", "Auto-save", "Collaborative editing"],
  },
  {
    number: "08",
    phase: "Spec Gen",
    title: "Trigger the spec",
    headline: "One click.\nA full engineering plan.",
    body: "When the team signs off, trigger spec generation. The route handler returns 202 Accepted immediately, keeping the UI fully responsive while a second durable agent does the heavy lifting in the background.",
    accent: "#22D3EE",
    tags: ["Background task", "202 Accepted", "Non-blocking"],
  },
  {
    number: "09",
    phase: "Output",
    title: "Your spec arrives",
    headline: "Blueprint.\nRoadmap. Stack. Done.",
    body: "Gemini synthesizes a multi-page Markdown spec: system blueprint, recommended tech stack, full implementation roadmap, step-by-step dev phases, and task breakdowns granular enough for any AI agent to execute.",
    accent: "#818CF8",
    tags: ["Blueprint", "Tech stack", "Roadmap", "Dev phases"],
  },
  {
    number: "10",
    phase: "Storage",
    title: "Persisted forever",
    headline: "Uploaded.\nLinked. Yours.",
    body: "The Markdown artifact uploads to Vercel Blob. A ProjectSpec record in PostgreSQL links it to your project permanently — accessible to every team member at any time.",
    accent: "#34D399",
    tags: ["Vercel Blob", "PostgreSQL", "Prisma"],
  },
  {
    number: "11",
    phase: "Handoff",
    title: "Hand off to your AI agent",
    headline: "From spec to\nshipped code.",
    body: "View in the built-in spec viewer, download as .md, or hit 'Copy for AI Agent' to prepend a system prompt tuned for Copilot, Codex, and Claude Code. Your AI coding agent gets a full senior-engineer brief from a single paste.",
    accent: "#F472B6",
    tags: ["Copilot", "Codex", "Claude Code", "One-click"],
  },
];

type JourneyVisualHandle = {
  setProgress: (value: number) => void;
};

type JourneyVisualProps = {
  className?: string;
};

type LayoutNode = {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
};

type StepLayout = {
  nodes: LayoutNode[];
  badge: string;
};

/* ─── User-friendly node labels per step ──────────────────────── */
const stepLayouts: StepLayout[] = [
  {
    nodes: [
      { id: "n1", label: "Clerk", color: "#06B6D4", x: 0.52, y: 0.2 },
      { id: "n2", label: "Login", color: "#22D3EE", x: 0.35, y: 0.38 },
      { id: "n3", label: "Safe", color: "#0EA5E9", x: 0.69, y: 0.38 },
      { id: "n4", label: "Access", color: "#06B6D4", x: 0.52, y: 0.62 },
      { id: "n5", label: "Your Work", color: "#38BDF8", x: 0.42, y: 0.8 },
      { id: "n6", label: "Team", color: "#67E8F9", x: 0.64, y: 0.8 },
    ],
    badge: "Signing in…",
  },
  {
    nodes: [
      { id: "n1", label: "Postgres", color: "#8B5CF6", x: 0.5, y: 0.18 },
      { id: "n2", label: "Prisma", color: "#A78BFA", x: 0.28, y: 0.42 },
      { id: "n3", label: "Projects", color: "#C4B5FD", x: 0.5, y: 0.42 },
      { id: "n4", label: "Create", color: "#DDD6FE", x: 0.72, y: 0.42 },
      { id: "n5", label: "Save", color: "#7C3AED", x: 0.38, y: 0.72 },
      { id: "n6", label: "Owner", color: "#A855F7", x: 0.62, y: 0.72 },
    ],
    badge: "Loading projects…",
  },
  {
    nodes: [
      { id: "n1", label: "React Flow", color: "#6366F1", x: 0.2, y: 0.5 },
      { id: "n2", label: "Liveblocks", color: "#818CF8", x: 0.5, y: 0.5 },
      { id: "n3", label: "Prompt", color: "#4F46E5", x: 0.8, y: 0.5 },
      { id: "n4", label: "Board", color: "#A5B4FC", x: 0.5, y: 0.22 },
      { id: "n5", label: "Meta", color: "#4338CA", x: 0.5, y: 0.78 },
      { id: "n6", label: "Shared", color: "#6366F1", x: 0.32, y: 0.72 },
    ],
    badge: "Workspace open…",
  },
  {
    nodes: [
      { id: "n1", label: "Templates", color: "#F59E0B", x: 0.2, y: 0.24 },
      { id: "n2", label: "JSON", color: "#FBBF24", x: 0.8, y: 0.24 },
      { id: "n3", label: "Start", color: "#D97706", x: 0.2, y: 0.72 },
      { id: "n4", label: "Pick", color: "#F59E0B", x: 0.8, y: 0.72 },
      { id: "n5", label: "Load", color: "#B45309", x: 0.5, y: 0.5 },
      { id: "n6", label: "Ready", color: "#FCD34D", x: 0.5, y: 0.82 },
    ],
    badge: "Picking a template…",
  },
  {
    nodes: [
      { id: "n1", label: "Gemini", color: "#A855F7", x: 0.5, y: 0.18 },
      { id: "n2", label: "Trigger.dev", color: "#9333EA", x: 0.5, y: 0.36 },
      { id: "n3", label: "Idea", color: "#C084FC", x: 0.28, y: 0.58 },
      { id: "n4", label: "Check", color: "#7E22CE", x: 0.5, y: 0.58 },
      { id: "n5", label: "Draft", color: "#A855F7", x: 0.72, y: 0.58 },
      { id: "n6", label: "Graph", color: "#6B21A8", x: 0.5, y: 0.82 },
    ],
    badge: "AI generating…",
  },
  {
    nodes: [
      { id: "n1", label: "Liveblocks", color: "#EC4899", x: 0.18, y: 0.3 },
      { id: "n2", label: "You", color: "#F9A8D4", x: 0.82, y: 0.3 },
      { id: "n3", label: "Team", color: "#DB2777", x: 0.18, y: 0.7 },
      { id: "n4", label: "Live", color: "#BE185D", x: 0.5, y: 0.5 },
      { id: "n5", label: "Board", color: "#EC4899", x: 0.5, y: 0.82 },
      { id: "n6", label: "Here", color: "#F472B6", x: 0.82, y: 0.7 },
    ],
    badge: "3 users live…",
  },
  {
    nodes: [
      { id: "n1", label: "Vercel Blob", color: "#10B981", x: 0.2, y: 0.25 },
      { id: "n2", label: "Drag", color: "#34D399", x: 0.8, y: 0.25 },
      { id: "n3", label: "Edit", color: "#059669", x: 0.5, y: 0.5 },
      { id: "n4", label: "Save", color: "#10B981", x: 0.2, y: 0.75 },
      { id: "n5", label: "Done", color: "#047857", x: 0.8, y: 0.75 },
      { id: "n6", label: "Team", color: "#6EE7B7", x: 0.5, y: 0.84 },
    ],
    badge: "Auto-saving…",
  },
  {
    nodes: [
      { id: "n1", label: "API", color: "#22D3EE", x: 0.5, y: 0.16 },
      { id: "n2", label: "Queue", color: "#06B6D4", x: 0.5, y: 0.38 },
      { id: "n3", label: "Build", color: "#0891B2", x: 0.26, y: 0.6 },
      { id: "n4", label: "Worker", color: "#22D3EE", x: 0.74, y: 0.6 },
      { id: "n5", label: "Spec", color: "#0E7490", x: 0.5, y: 0.82 },
      { id: "n6", label: "Ready", color: "#67E8F9", x: 0.5, y: 0.66 },
    ],
    badge: "Processing…",
  },
  {
    nodes: [
      { id: "n1", label: "Gemini", color: "#818CF8", x: 0.5, y: 0.16 },
      { id: "n2", label: "Blueprint", color: "#6366F1", x: 0.2, y: 0.42 },
      { id: "n3", label: "Stack", color: "#8B5CF6", x: 0.5, y: 0.42 },
      { id: "n4", label: "Roadmap", color: "#A78BFA", x: 0.8, y: 0.42 },
      { id: "n5", label: "Tasks", color: "#7C3AED", x: 0.5, y: 0.74 },
      { id: "n6", label: "Done", color: "#C4B5FD", x: 0.5, y: 0.86 },
    ],
    badge: "Spec ready…",
  },
  {
    nodes: [
      { id: "n1", label: "Vercel Blob", color: "#34D399", x: 0.5, y: 0.18 },
      { id: "n2", label: "Upload", color: "#10B981", x: 0.28, y: 0.5 },
      { id: "n3", label: "Postgres", color: "#059669", x: 0.72, y: 0.5 },
      { id: "n4", label: "Saved", color: "#34D399", x: 0.5, y: 0.8 },
      { id: "n5", label: "Linked", color: "#6EE7B7", x: 0.5, y: 0.6 },
      { id: "n6", label: "Yours", color: "#A7F3D0", x: 0.5, y: 0.88 },
    ],
    badge: "Persisting…",
  },
  {
    nodes: [
      { id: "n1", label: "Copilot", color: "#F472B6", x: 0.5, y: 0.16 },
      { id: "n2", label: "Claude", color: "#DB2777", x: 0.2, y: 0.44 },
      { id: "n3", label: "View", color: "#EC4899", x: 0.5, y: 0.44 },
      { id: "n4", label: "Copy", color: "#F9A8D4", x: 0.8, y: 0.44 },
      { id: "n5", label: "Build", color: "#F472B6", x: 0.5, y: 0.76 },
      { id: "n6", label: "Ship", color: "#FBCFE8", x: 0.5, y: 0.88 },
    ],
    badge: "Ready for handoff…",
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = Number.parseInt(h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function lerpColor(a: string, b: string, t: number) {
  const parse = (hex: string) => {
    const v = Number.parseInt(hex.replace("#", ""), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };

  const ca = parse(a);
  const cb = parse(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function setInnerHtml(el: HTMLElement | null, html: string) {
  if (!el) return;
  el.innerHTML = html;
}

function animateStepContent(
  index: number,
  refs: {
    bigNumRef: React.RefObject<HTMLSpanElement | null>;
    phaseRef: React.RefObject<HTMLSpanElement | null>;
    stepNumRef: React.RefObject<HTMLSpanElement | null>;
    headlineRef: React.RefObject<HTMLHeadingElement | null>;
    bodyRef: React.RefObject<HTMLParagraphElement | null>;
    tagsRef: React.RefObject<HTMLDivElement | null>;
    accentBarRef: React.RefObject<HTMLDivElement | null>;
    dotTrackRef: React.RefObject<HTMLDivElement | null>;
  }
) {
  const step = steps[index];
  const rgb = hexToRgb(step.accent);

  if (refs.bigNumRef.current) refs.bigNumRef.current.textContent = step.number;

  if (refs.phaseRef.current) {
    refs.phaseRef.current.textContent = step.phase;
    refs.phaseRef.current.style.color = step.accent;
  }

  if (refs.stepNumRef.current) {
    refs.stepNumRef.current.textContent = `${step.number} / ${String(steps.length).padStart(2, "0")}`;
    refs.stepNumRef.current.style.color = step.accent;
  }

  if (refs.headlineRef.current) {
    setInnerHtml(
      refs.headlineRef.current,
      step.headline
        .split("\n")
        .map(
          (line) =>
            `<span class="block overflow-hidden"><span class="hline block">${line}</span></span>`
        )
        .join("")
    );
  }

  if (refs.bodyRef.current) refs.bodyRef.current.textContent = step.body;

  if (refs.tagsRef.current) {
    setInnerHtml(
      refs.tagsRef.current,
      step.tags
        .map(
          (t) =>
            `<span class="tag-chip inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] mr-2 mb-2" style="background:rgba(${rgb},0.10);color:${step.accent};border:1px solid rgba(${rgb},0.22)">${t}</span>`
        )
        .join("")
    );
  }

  if (refs.accentBarRef.current) {
    refs.accentBarRef.current.style.background = `linear-gradient(to right, ${step.accent}, transparent)`;
  }

  const dots = refs.dotTrackRef.current?.querySelectorAll<HTMLElement>(".journey-dot");
  if (dots) {
    dots.forEach((dot, i) => {
      dot.style.background = i <= index ? steps[i].accent : "rgba(255,255,255,0.1)";
      dot.style.transform = i === index ? "scale(1.5)" : "scale(1)";
    });
  }

  if (refs.headlineRef.current) {
    gsap.fromTo(
      refs.headlineRef.current.querySelectorAll(".hline"),
      { y: "100%", opacity: 0 },
      { y: "0%", opacity: 1, duration: 0.35, stagger: 0.04, ease: "power3.out", overwrite: true }
    );
  }

  if (refs.bodyRef.current) {
    gsap.fromTo(
      refs.bodyRef.current,
      { opacity: 0.2, y: 6 },
      { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", overwrite: true }
    );
  }

  if (refs.tagsRef.current) {
    gsap.fromTo(
      refs.tagsRef.current.querySelectorAll(".tag-chip"),
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.25, stagger: 0.035, ease: "back.out(1.4)", overwrite: true }
    );
  }
}

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const stepNumRef = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const accentBarRef = useRef<HTMLDivElement>(null);
  const dotTrackRef = useRef<HTMLDivElement>(null);
  const bigNumRef = useRef<HTMLSpanElement>(null);
  const visualRef = useRef<JourneyVisualHandle>(null);
  const workspaceHref = "/sign-in";

  const activeIndexRef = useRef(0);

  const renderCurrentStep = useCallback((index: number) => {
    animateStepContent(index, {
      bigNumRef,
      phaseRef,
      stepNumRef,
      headlineRef,
      bodyRef,
      tagsRef,
      accentBarRef,
      dotTrackRef,
    });
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const pinned = pinnedRef.current;
    if (!section || !pinned) return;

    renderCurrentStep(0);

    const total = steps.length;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${(total - 1) * window.innerHeight}`,
        pin: pinned,
        pinSpacing: true,
        anticipatePin: 1,
        id: "journey-pin",
      });

      gsap.to(progressRef.current, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${(total - 1) * window.innerHeight}`,
          scrub: 0.25,
        },
      });

      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${(total - 1) * window.innerHeight}`,
        scrub: 0.35,
        onUpdate: (self) => {
          const raw = self.progress * (total - 1);
          const index = clamp(Math.floor(raw + 0.0001), 0, total - 1);

          if (index !== activeIndexRef.current) {
            activeIndexRef.current = index;
            renderCurrentStep(index);
          }

          visualRef.current?.setProgress(raw);
        },
      });
    });

    return () => ctx.revert();
  }, [renderCurrentStep]);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative"
      style={{ height: `${steps.length * 100}vh` }}
      aria-labelledby="how-it-works-headline"
    >
      <div
        ref={pinnedRef}
        className="w-full h-screen overflow-hidden flex flex-col"
        style={{ background: "#07070E" }}
      >
        <div className="relative h-0.5 w-full bg-white/5 shrink-0">
          <div
            ref={progressRef}
            className="absolute left-0 top-0 h-full origin-left scale-x-0"
            style={{
              background: "linear-gradient(to right, #06B6D4, #8B5CF6, #EC4899)",
              width: "100%",
            }}
          />
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
          <div className="relative flex flex-col justify-center px-10 md:px-16 xl:px-24 py-12 overflow-hidden">
            <span
              ref={bigNumRef}
              className="absolute right-0 bottom-0 font-display font-black leading-none select-none pointer-events-none"
              style={{
                fontSize: "clamp(8rem, 22vw, 20rem)",
                color: "rgba(255,255,255,0.025)",
                lineHeight: 0.85,
              }}
              aria-hidden="true"
            >
              01
            </span>

            <span
              ref={phaseRef}
              className="font-bold text-[11px] uppercase tracking-[0.35em] mb-6 block transition-colors duration-300"
              style={{ color: steps[0].accent }}
            >
              {steps[0].phase}
            </span>

            <span
              ref={stepNumRef}
              className="font-display text-[11px] font-black uppercase tracking-[0.2em] mb-4 block opacity-40"
              style={{ color: steps[0].accent }}
            >
              {steps[0].number} / {String(steps.length).padStart(2, "0")}
            </span>

            <h2
              ref={headlineRef}
              id="how-it-works-headline"
              className="font-display font-black leading-none tracking-[-0.03em] text-white mb-6"
              style={{ fontSize: "clamp(2.4rem, 4.5vw, 5rem)" }}
            >
              <span className="block overflow-hidden">
                <span className="hline block">Your workspace,</span>
              </span>
              <span className="block overflow-hidden">
                <span className="hline block">your rules.</span>
              </span>
            </h2>

            <div
              ref={accentBarRef}
              className="h-px w-24 mb-6 rounded-full transition-all duration-300"
              style={{ background: `linear-gradient(to right, ${steps[0].accent}, transparent)` }}
            />

            <p ref={bodyRef} className="text-base md:text-lg text-white/45 leading-relaxed max-w-md mb-8">
              {steps[0].body}
            </p>

            <div ref={tagsRef} className="flex flex-wrap">
              {steps[0].tags.map((t) => (
                <span
                  key={t}
                  className="tag-chip inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] mr-2 mb-2"
                  style={{
                    background: `rgba(${hexToRgb(steps[0].accent)}, 0.10)`,
                    color: steps[0].accent,
                    border: `1px solid rgba(${hexToRgb(steps[0].accent)}, 0.22)`,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-center justify-center relative px-10 py-12 border-l border-white/4">
            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-3">
              <div ref={dotTrackRef} className="flex flex-col gap-3">
                {steps.map((s, i) => (
                  <div
                    key={s.number}
                    className="journey-dot w-2 h-2 rounded-full transition-all duration-300"
                    style={{ background: i === 0 ? s.accent : "rgba(255,255,255,0.1)" }}
                    title={s.title}
                  />
                ))}
              </div>
            </div>

            <JourneyVisual ref={visualRef} />
          </div>
        </div>

        <div className="h-14 border-t border-white/4 flex items-center justify-between px-10 md:px-16 shrink-0">
          <span className="text-[11px] uppercase tracking-[0.3em] text-white/20">
            Scroll to journey through each step
          </span>
          <div className="flex items-center gap-2">
            {["#06B6D4", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B"].map((c) => (
              <div
                key={c}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: c, opacity: 0.5 }}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center py-28 px-6 text-center"
        style={{ background: "#07070E" }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(139,92,246,0.4), transparent)" }}
        />
        <p className="text-[11px] uppercase tracking-[0.35em] text-white/30 mb-4">
          Ready to build?
        </p>
        <h3 className="font-display text-3xl md:text-5xl font-black text-white tracking-[-0.03em] mb-8">
          From prompt to shipped <span className="gradient-text">in minutes</span>
        </h3>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <MagneticButton href={workspaceHref} className="px-9 py-4 rounded-full text-sm font-bold btn-violet">
            Open Workspace
          </MagneticButton>
          <MagneticButton href="#features" className="px-9 py-4 rounded-full text-sm font-bold btn-ghost">
            Explore Features
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}

const JourneyVisual = forwardRef<JourneyVisualHandle, JourneyVisualProps>(function JourneyVisual(
  _props,
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);

  useImperativeHandle(ref, () => ({
    setProgress(value: number) {
      targetProgressRef.current = clamp(value, 0, steps.length - 1);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const drawNode = (x: number, y: number, color: string, label: string, t: number) => {
      const pulse = 0.82 + 0.18 * Math.sin(t * 0.04);
      ctx.beginPath();
      ctx.arc(x, y, 22 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}22`;
      ctx.lineWidth = 1;
      ctx.stroke();

      const g = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 16);
      g.addColorStop(0, `${color}cc`);
      g.addColorStop(1, `${color}44`);
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      ctx.font = "bold 10px 'DM Sans', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, y);
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      currentProgressRef.current += (targetProgressRef.current - currentProgressRef.current) * 0.075;
      const p = currentProgressRef.current;
      const index = clamp(Math.floor(p), 0, steps.length - 1);
      const nextIndex = clamp(index + 1, 0, steps.length - 1);
      const t = p - index;

      const layout = stepLayouts[index];
      const nextLayout = stepLayouts[nextIndex] ?? layout;
      const accent = lerpColor(
        steps[index].accent,
        steps[nextIndex]?.accent ?? steps[index].accent,
        t
      );

      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(
        w * 0.5,
        h * 0.5,
        20,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.7
      );
      bg.addColorStop(0, `${accent}22`);
      bg.addColorStop(0.35, "rgba(255,255,255,0.03)");
      bg.addColorStop(1, "rgba(7,7,14,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.5;
      const orbit = Math.min(w, h) * 0.22;
      const currentNodes = layout.nodes;
      const nextNodes = nextLayout.nodes;

      for (let i = 0; i < currentNodes.length; i += 1) {
        const a = currentNodes[i];
        const b = nextNodes[i] ?? a;
        const x = (a.x + (b.x - a.x) * t) * w;
        const y = (a.y + (b.y - a.y) * t) * h;
        const color = lerpColor(a.color, b.color, t);
        drawNode(x, y, color, a.label, p + i * 0.2);
      }

      const orb = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbit * 1.8);
      orb.addColorStop(0, `${accent}44`);
      orb.addColorStop(0.25, `${accent}22`);
      orb.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = orb;
      ctx.beginPath();
      ctx.arc(cx, cy, orbit * 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 34 + 2 * Math.sin(p * 2), 0, Math.PI * 2);
      ctx.fillStyle = `${accent}55`;
      ctx.fill();

      ctx.font = "bold 11px 'DM Sans', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(steps[index].phase.toUpperCase(), cx, cy + 0.5);

      requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full max-w-sm aspect-4/5">
      <div
        className="absolute inset-0 glass-card rounded-3xl"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      />
      <canvas
        ref={canvasRef}
        className="relative w-full h-full rounded-3xl"
        style={{ mixBlendMode: "screen" }}
      />
    </div>
  );
});
