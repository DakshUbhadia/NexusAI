'use client'

import { SignIn } from "@clerk/nextjs"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  SPLINE_SCRIPT_SRC,
  SPLINE_AUTH_URL,
  SPLINE_AUTH_IFRAME_URL,
} from "@/types/spline-viewer"
import ForceSignOut from "@/components/auth/ForceSignOut"

/* ─────────────────────────────────────────────────────────────
   Animated word-reveal for the hero headline
───────────────────────────────────────────────────────────── */
function SplitTextReveal({
  text,
  className,
  delay = 0,
}: Readonly<{
  text: string
  className?: string
  delay?: number
}>) {
  const words = text.split(" ")
  const wordParts = words.reduce<{ word: string; start: number }[]>((acc, word) => {
    const prev = acc.at(-1)
    const start = acc.length === 0 ? 0 : prev!.start + prev!.word.length + 1
    acc.push({ word, start })
    return acc
  }, [])

  return (
    <span className={className} aria-label={text}>
      {wordParts.map(({ word, start }) => (
        <span key={`${start}-${word}`} className="mr-[0.28em] inline-block overflow-hidden last:mr-0">
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0, rotateX: -40 }}
            animate={{ y: "0%", opacity: 1, rotateX: 0 }}
            transition={{
              duration: 0.75,
              delay: delay + start * 0.01,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   Animated gradient orb
───────────────────────────────────────────────────────────── */
function FloatingOrb({
  x,
  y,
  size,
  color,
  delay,
}: Readonly<{
  x: string
  y: string
  size: number
  color: string
  delay: number
}>) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-full blur-3xl"
      style={{ left: x, top: y, width: size, height: size, background: color }}
      animate={{
        scale: [1, 1.18, 0.95, 1.12, 1],
        opacity: [0.35, 0.55, 0.3, 0.5, 0.35],
        x: [0, 18, -12, 8, 0],
        y: [0, -14, 10, -6, 0],
      }}
      transition={{
        duration: 9 + delay,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

/* ─────────────────────────────────────────────────────────────
   Grid noise overlay
───────────────────────────────────────────────────────────── */
function GridOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage:
          "linear-gradient(var(--accent-primary) 1px, transparent 1px), linear-gradient(90deg, var(--accent-primary) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
  )
}

/* ─────────────────────────────────────────────────────────────
   Feature pill
───────────────────────────────────────────────────────────── */
function FeaturePill({
  icon,
  title,
  desc,
  delay,
}: Readonly<{
  icon: ReactNode
  title: string
  desc: string
  delay: number
}>) {
  return (
    <motion.div
      className="group flex items-start gap-3"
      initial={{ opacity: 0, x: -32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-(--accent-primary)/20 bg-(--accent-primary)/15 text-(--accent-primary) backdrop-blur-sm"
        whileHover={{ scale: 1.12, backgroundColor: "rgba(var(--accent-primary-rgb), 0.28)" }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        {icon}
      </motion.div>
      <div>
        <h3
          className="mb-0.5 text-[0.8rem] font-semibold tracking-wide text-(--text-primary)"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-[0.7rem] leading-relaxed text-(--text-secondary)">{desc}</p>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Typewriter cycling subtitles
───────────────────────────────────────────────────────────── */
const subtitles = [
  "AI-powered architecture for teams.",
  "From plain English to live canvas.",
  "Ship faster with Nexus AI.",
]

function CyclingSubtitle() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % subtitles.length), 3400)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="h-7 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          className="text-[0.9rem] font-light italic leading-7"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            color: "var(--accent-primary)",
            letterSpacing: "0.01em",
            opacity: 0.85,
          }}
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -22, opacity: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        >
          {subtitles[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Particle field
───────────────────────────────────────────────────────────── */
function ParticleField() {
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const base = i + 1
        const cx = `${8 + ((base * 37) % 84)}%`
        const cy = `${10 + ((base * 53) % 80)}%`
        const r = 0.9 + ((base * 29) % 14) / 10
        const delay = ((base * 11) % 50) / 10
        const dur = 4 + ((base * 17) % 40) / 10
        return { id: i, cx, cy, r, delay, dur }
      }),
    [],
  )

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden={true}
      xmlns="http://www.w3.org/2000/svg"
    >
      {particles.map((p) => (
        <motion.circle
          key={p.id}
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          fill="var(--accent-primary)"
          animate={{ opacity: [0, 0.7, 0], scale: [0.5, 1.4, 0.5] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </svg>
  )
}

function killSplineBadges() {
  document.querySelectorAll<HTMLElement>('a[href*="spline.design"]').forEach((el) => {
    el.style.setProperty("display", "none", "important")
    el.style.setProperty("opacity", "0", "important")
  })
  document.querySelectorAll("spline-viewer").forEach((viewer) => {
    if (viewer.shadowRoot) {
      viewer.shadowRoot.querySelectorAll<HTMLElement>('a[href*="spline.design"]').forEach((el) => {
        el.style.setProperty("display", "none", "important")
      })
    }
  })
}

/* ─────────────────────────────────────────────────────────────
   Main SignInPage
───────────────────────────────────────────────────────────── */
export default function SignInPage() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true)
    }, 0)

    const panels = document.querySelectorAll("[data-panel]")
    panels.forEach((el, i) => {
      ;(el as HTMLElement).style.setProperty("--panel-delay", `${i * 0.12}s`)
    })

    if (globalThis.window !== undefined) {
      window.history.pushState(null, '', window.location.href)
      const handlePopState = () => {
        // 1. URL-based callback check (catches most OAuth return paths)
        const isCallback =
          window.location.pathname.includes('/sso-callback') ||
          window.location.pathname.includes('/oauth-callback') ||
          window.location.search.includes('__clerk')
        if (isCallback) return

        // 2. Cookie-based session check: Clerk sets __client_uat the moment
        //    OAuth succeeds. If it's present, popstate fired because Clerk
        //    is cleaning up OAuth history entries — not because the user
        //    hit the back button. Let Clerk's own redirect to /editor run.
        const hasClerkSession = document.cookie
          .split(';')
          .some(c => {
            const trimmed = c.trim()
            if (trimmed.startsWith('__session=')) return true
            if (trimmed.startsWith('__client_uat=')) {
              const val = trimmed.split('=')[1]
              return val !== '0' && val !== ''
            }
            return false
          })
        if (hasClerkSession) return

        window.location.href = '/'
      }
      window.addEventListener('popstate', handlePopState)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('popstate', handlePopState)
      }
    }

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (globalThis.window !== undefined) {
      // @ts-expect-error adding custom property to globalThis for strict tracking
      if (!globalThis.__SPLINE_SETUP_DONE__ && !customElements.get("spline-viewer")) {
        // @ts-expect-error adding custom property to globalThis for strict tracking
        globalThis.__SPLINE_SETUP_DONE__ = true

        const existingScript = document.querySelector(`script[src="${SPLINE_SCRIPT_SRC}"]`)
        if (!existingScript) {
          const s = document.createElement("script")
          s.type = "module"
          s.src = SPLINE_SCRIPT_SRC
          s.async = true
          document.head.appendChild(s)
        }
      }
    }

    killSplineBadges()
    const interval = setInterval(killSplineBadges, 150)
    setTimeout(() => clearInterval(interval), 6000)

    const observer = new MutationObserver(killSplineBadges)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })

    return () => {
      clearInterval(interval)
      observer.disconnect()
    }
  }, [])

  return (
    <main className="relative h-screen overflow-hidden bg-(--auth-bg-deep) text-(--text-primary) lg:grid lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]">
      <ForceSignOut />

      <div className="absolute inset-0 z-0 lg:hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_60%,var(--accent-primary-muted),transparent_50%),radial-gradient(ellipse_at_80%_20%,var(--accent-purple-muted),transparent_50%),linear-gradient(180deg,var(--auth-bg-midnight),var(--auth-bg-deep))]" />
        <GridOverlay />
      </div>

      {/* ══════════════════════════════════════════════════════
          LEFT PANEL
      ══════════════════════════════════════════════════════ */}
      <section className="relative hidden h-screen overflow-hidden lg:block">

        {isMounted && (
          /* @ts-expect-error spline-viewer is a custom element */
          <spline-viewer
            url={SPLINE_AUTH_URL}
            className="absolute inset-0 h-full w-full"
            style={{ background: "transparent" }}
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--auth-bg-midnight)_0%,transparent_30%,transparent_70%,var(--auth-bg-deep)_100%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-56 bg-[linear-gradient(90deg,transparent,var(--auth-bg-deep))]" />

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
          style={{ height: 120, background: "linear-gradient(180deg,transparent,var(--auth-bg-deep))" }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
          style={{ height: 48, background: "var(--auth-bg-deep)" }}
          aria-hidden={true}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 z-30"
          style={{ width: 260, height: 56, background: "var(--auth-bg-deep)" }}
          aria-hidden={true}
        />

        <GridOverlay />
        <ParticleField />

        <FloatingOrb x="10%" y="20%" size={320} color="rgba(0,210,255,0.08)" delay={0} />
        <FloatingOrb x="55%" y="60%" size={260} color="rgba(139,92,246,0.07)" delay={2.5} />
        <FloatingOrb x="30%" y="75%" size={200} color="rgba(0,255,163,0.06)" delay={1.2} />

        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col px-10 py-8">

          <motion.div
            className="flex items-center gap-3 shrink-0"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative">
              <div className="absolute inset-0 scale-150 rounded-xl bg-(--accent-primary)/30 blur-xl" />
              <Image
                unoptimized={true}
                src="/logo1.png"
                alt="Nexus"
                width={1254}
                height={1254}
                className="relative size-10 object-contain drop-shadow-[0_0_24px_var(--accent-glow-cyan)]"
              />
            </div>
            <div
              className="bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary),var(--border-accent))] bg-clip-text text-xl font-bold tracking-tight text-transparent drop-shadow-[0_0_24px_var(--accent-glow-cyan)]"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Nexus AI
            </div>
          </motion.div>

          <div className="flex-1" />

          <div className="max-w-2xl mb-8 flex flex-col gap-6">

            <h1
              className="font-black leading-[0.92] tracking-[-0.04em] text-(--text-primary)"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: "clamp(1.9rem, 3vw, 3rem)",
              }}
            >
              <SplitTextReveal text="Design systems at" delay={0.3} />
              <br />
              <SplitTextReveal
                text="the speed of thought."
                delay={0.55}
                className="bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))] bg-clip-text text-transparent"
              />
            </h1>

            <div>
              <motion.p
                className="mb-2 max-w-lg text-[0.82rem] font-light leading-relaxed text-(--text-secondary)"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.85 }}
              >
                Describe your architecture in plain English. Nexus AI maps it to a shared canvas your
                whole team can refine in real time.
              </motion.p>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                <CyclingSubtitle />
              </motion.div>

              <div className="mt-5 space-y-3.5">
                <FeaturePill
                  delay={1.05}
                  title="AI Architecture Generation"
                  desc="Describe your system, AI maps it to nodes and edges on a live canvas."
                  icon={
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <FeaturePill
                  delay={1.15}
                  title="Real-time Collaboration"
                  desc="Live cursors, presence indicators, and shared node editing across your team."
                  icon={
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4" />
                    </svg>
                  }
                />
                <FeaturePill
                  delay={1.25}
                  title="Instant Spec Generation"
                  desc="Export a complete Markdown technical spec directly from the canvas graph."
                  icon={
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                />
              </div>
            </div>
          </div>

          <motion.p
            className="shrink-0 text-[0.65rem] text-(--text-secondary)"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            © 2026 Nexus AI. All rights reserved.
          </motion.p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          RIGHT PANEL
      ══════════════════════════════════════════════════════ */}
      <section className="relative flex h-screen w-full flex-col items-center overflow-hidden lg:min-w-0 lg:bg-transparent">
        <div className="pointer-events-none absolute inset-0 z-1">
          <FloatingOrb x="20%" y="15%" size={220} color="rgba(0,210,255,0.07)" delay={0.5} />
          <FloatingOrb x="60%" y="70%" size={180} color="rgba(139,92,246,0.08)" delay={1.8} />
        </div>

        <div className="relative z-1 w-full shrink-0" style={{ height: "23vh", minHeight: "165px" }}>
          <motion.div
            className="pointer-events-none absolute top-0"
            style={{
              height: "100%",
              width: "calc(100% + 300px)",
              left: "-140px",
            }}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          >
            {isMounted && (
              /* @ts-expect-error spline-viewer */
              <spline-viewer
                url={SPLINE_AUTH_IFRAME_URL}
                className="h-full w-full"
                style={{ background: "transparent" }}
              />
            )}
          </motion.div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-2 h-24 bg-[linear-gradient(180deg,transparent,var(--auth-bg-deep))]" />
        </div>

        <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-start px-4 sm:px-6">
          <motion.div
            className="pointer-events-auto w-full max-w-104"
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative w-full overflow-hidden rounded-2xl bg-(--auth-card-bg) px-5 py-5 backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-(--accent-primary)/60 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-(--border-accent)/30 to-transparent" />

              <div className="pointer-events-auto relative">
                <SignIn
                  routing="path"
                  path="/sign-in"
                  signUpUrl="/sign-up"
                  forceRedirectUrl="/editor"
                  fallbackRedirectUrl="/editor"
                  signUpForceRedirectUrl="/editor"
                  signUpFallbackRedirectUrl="/editor"
                  appearance={{
                    variables: {
                      borderRadius: "var(--radius-md)",
                      colorBackground: "transparent",
                      colorForeground: "var(--text-primary)",
                      colorInput: "var(--bg-subtle)",
                      colorInputForeground: "var(--text-primary)",
                      colorPrimary: "var(--accent-primary)",
                      colorPrimaryForeground: "var(--text-inverted)",
                      colorMutedForeground: "var(--text-secondary)",
                      colorBorder: "var(--border-default)",
                      colorRing: "var(--accent-primary)",
                      fontFamily: "'Bricolage Grotesque', var(--font-sans)",
                      spacing: "0.95rem",
                    },
                    elements: {
                      rootBox: "w-full pointer-events-auto",
                      card: "w-full border-0 bg-transparent shadow-none p-0",
                      headerTitle:
                        "text-xl font-black tracking-[-0.03em] text-[var(--text-primary)] [text-shadow:0_0_24px_var(--accent-glow-cyan)] [font-family:'Bricolage_Grotesque',sans-serif]",
                      headerSubtitle: "text-xs font-light text-[var(--text-secondary)]",
                      socialButtonsBlockButton:
                        "w-full border border-white/10 bg-white/5 text-[var(--text-primary)] transition-all duration-300 hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/10 hover:shadow-[0_0_16px_rgba(0,210,255,0.2)] backdrop-blur-sm",
                      formFieldInput:
                        "w-full border border-[var(--border-default)] bg-[var(--bg-subtle)]/80 text-[var(--text-primary)] transition-all duration-300 focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(0,210,255,0.12)] focus:bg-[var(--bg-subtle)] placeholder:text-[var(--text-secondary)]/50",
                      formFieldLabel:
                        "text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--text-secondary)] [font-family:'Bricolage_Grotesque',sans-serif]",
                      footerActionLink:
                        "font-semibold text-[var(--accent-primary)] transition-colors duration-200 hover:text-[var(--accent-secondary)]",
                      footer: "hidden",
                      formButtonPrimary:
                        "mt-1 w-full bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))] text-[var(--text-inverted)] shadow-[0_0_24px_rgba(0,210,255,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(0,210,255,0.6)] font-bold tracking-wide [font-family:'Bricolage_Grotesque',sans-serif]",
                      buttonPrimary:
                        "w-full bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))] text-[var(--text-inverted)] shadow-[0_0_24px_rgba(0,210,255,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(0,210,255,0.6)] font-bold [font-family:'Bricolage_Grotesque',sans-serif]",
                      dividerRow: "text-[var(--text-secondary)]/40",
                      dividerLine: "bg-[var(--border-default)]",
                      identityPreviewText: "text-[var(--text-secondary)]",
                      identityPreviewEditButton:
                        "text-[var(--accent-primary)] hover:text-[var(--accent-secondary)]",
                      formResendCodeLink:
                        "text-[var(--accent-primary)] hover:text-[var(--accent-secondary)]",
                      otpCodeFieldInput:
                        "border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(0,210,255,0.12)]",
                      alertText: "text-[var(--text-secondary)]",
                      formFieldSuccessText: "text-emerald-400",
                      formFieldErrorText: "text-red-400",
                    },
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  )
}