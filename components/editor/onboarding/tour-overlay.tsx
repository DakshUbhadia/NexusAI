'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react'

import type { TourStep } from '@/types/onboarding'

// ─── Constants ────────────────────────────────────────────────────────

const RECT_PADDING = 8
const TOOLTIP_GAP = 14
const TOOLTIP_WIDTH = 340
const MAX_FIND_ATTEMPTS = 8
const FIND_RETRY_DELAY_MS = 80
const ACTION_SETTLE_DELAY_MS = 350

// Purely cosmetic — tuning these never touches tour stepping behaviour.
const ARROW_SIZE = 14
const CONFETTI_COUNT = 16

type TargetRect = {
  top: number
  left: number
  width: number
  height: number
}

// ─── Props ────────────────────────────────────────────────────────────

type TourOverlayProps = {
  readonly step: TourStep | null
  readonly stepIndex: number
  readonly totalSteps: number
  readonly actions: Record<string, () => void>
  readonly onNext: () => void
  readonly onBack: () => void
  readonly onSkip: () => void
  readonly onFinish: () => void
}

// ─── Rect Finder ──────────────────────────────────────────────────────
// Unchanged from the original — same retry/poll behaviour.

function findTargetRect(
  target: string,
  attempt: number,
  onFound: (rect: TargetRect) => void,
  onNotFound: () => void,
): void {
  const el = document.querySelector(`[data-tour="${target}"]`)
  if (el) {
    const domRect = el.getBoundingClientRect()
    onFound({
      top: domRect.top,
      left: domRect.left,
      width: domRect.width,
      height: domRect.height,
    })
    return
  }

  if (attempt < MAX_FIND_ATTEMPTS) {
    setTimeout(() => {
      findTargetRect(target, attempt + 1, onFound, onNotFound)
    }, FIND_RETRY_DELAY_MS)
    return
  }

  onNotFound()
}

// ─── Tooltip Positioning ──────────────────────────────────────────────
// Unchanged from the original — same math, same clamping.

function computeTooltipPosition(
  rect: TargetRect,
  placement: TourStep['placement'],
): React.CSSProperties {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const styles: React.CSSProperties = {}

  let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
  left = Math.max(16, Math.min(left, vw - TOOLTIP_WIDTH - 16))

  switch (placement) {
    case 'bottom':
      styles.top = rect.top + rect.height + TOOLTIP_GAP
      styles.left = left
      break
    case 'top':
      styles.bottom = vh - rect.top + TOOLTIP_GAP
      styles.left = left
      break
    case 'left':
      styles.top = Math.max(16, rect.top + rect.height / 2 - 100)
      styles.right = vw - rect.left + TOOLTIP_GAP
      break
    case 'right':
      styles.top = Math.max(16, rect.top + rect.height / 2 - 100)
      styles.left = rect.left + rect.width + TOOLTIP_GAP
      break
    default:
      styles.top = vh / 2 - 100
      styles.left = vw / 2 - TOOLTIP_WIDTH / 2
      break
  }

  if (styles.top !== undefined) {
    styles.top = Math.max(16, Math.min(styles.top as number, vh - 220))
  }
  if (styles.bottom !== undefined) {
    styles.bottom = Math.max(16, Math.min(styles.bottom as number, vh - 220))
  }

  return styles
}


function getConnectorStyle(
  placement: TourStep['placement'],
): React.CSSProperties | null {
  const half = ARROW_SIZE / 2
  const base: React.CSSProperties = {
    position: 'absolute',
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    transform: 'rotate(45deg)',
    background: 'var(--bg-surface-elevated)',
  }

  switch (placement) {
    case 'top':
      // Tooltip sits above the target — beak points down, on the bottom edge.
      return {
        ...base,
        bottom: -half,
        left: '50%',
        marginLeft: -half,
        borderBottom: '1px solid var(--border-strong)',
        borderRight: '1px solid var(--border-strong)',
      }
    case 'bottom':
      // Tooltip sits below the target — beak points up, on the top edge.
      return {
        ...base,
        top: -half,
        left: '50%',
        marginLeft: -half,
        borderTop: '1px solid var(--border-strong)',
        borderLeft: '1px solid var(--border-strong)',
      }
    case 'left':
      // Tooltip sits left of the target — beak points right, on the right edge.
      return {
        ...base,
        right: -half,
        top: '50%',
        marginTop: -half,
        borderTop: '1px solid var(--border-strong)',
        borderRight: '1px solid var(--border-strong)',
      }
    case 'right':
      // Tooltip sits right of the target — beak points left, on the left edge.
      return {
        ...base,
        left: -half,
        top: '50%',
        marginTop: -half,
        borderBottom: '1px solid var(--border-strong)',
        borderLeft: '1px solid var(--border-strong)',
      }
    default:
      return null
  }
}

// ─── Completion Confetti ───────────────────────────────────────────────
// A short, restrained burst anchored on the finish button. Generated once
// per finish, purely cosmetic — never gates or delays onFinish.

type ConfettiParticle = {
  id: number
  x: number
  y: number
  rotate: number
  scale: number
  color: string
}

function makeConfetti(): ConfettiParticle[] {
  const colors = ['#06b6d4', '#22d3ee', '#67e8f9', '#0891b2']
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / CONFETTI_COUNT + Math.random() * 0.4
    const distance = 42 + Math.random() * 40
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 8,
      rotate: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.6,
      color: colors[i % colors.length],
    }
  })
}

// ─── Main Component ───────────────────────────────────────────────────

export function TourOverlay({
  step,
  stepIndex,
  totalSteps,
  actions,
  onNext,
  onBack,
  onSkip,
  onFinish,
}: TourOverlayProps): ReactElement | null {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const prevStepIdRef = useRef<string | null>(null)
  const shouldReduceMotion = useReducedMotion()

  // Cosmetic-only state — never read by the stepping logic below.
  const [isCelebrating, setIsCelebrating] = useState(false)
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([])

  const isLastStep = stepIndex === totalSteps - 1
  const isCentered = !step?.target

  // Mount guard for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // On step change: fire action callbacks and find target element
  useEffect(() => {
    if (!step) return
    // Skip if same step
    if (prevStepIdRef.current === step.id) return
    prevStepIdRef.current = step.id
    setIsCelebrating(false) // cosmetic reset only

    let timeoutId: NodeJS.Timeout

    // Fire onEnterAction after a delay to let sidebars animate
    if (step.onEnterActionId && actions[step.onEnterActionId]) {
      timeoutId = setTimeout(() => {
        actions[step.onEnterActionId as string]()
      }, ACTION_SETTLE_DELAY_MS)
    }

    if (!step.target) {
      setTargetRect(null)
      return () => {
        if (timeoutId) clearTimeout(timeoutId)
      }
    }

    let isSubscribed = true
    
    // Give it a little time to mount the target if it isn't mounted yet
    const timer = setTimeout(() => {
      findTargetRect(
        step.target!,
        0,
        (rect) => {
          if (isSubscribed) setTargetRect(rect)
        },
        () => {
          // Target not found after retries — auto-advance
          if (isSubscribed) {
            setTargetRect(null)
            onNext()
          }
        },
      )
    }, step.onEnterActionId ? ACTION_SETTLE_DELAY_MS : 100)

    return () => {
      isSubscribed = false
      if (timeoutId) clearTimeout(timeoutId)
      clearTimeout(timer)
    }
  }, [step, actions, onNext])

  // Continuous rect polling for smooth animation tracking
  useEffect(() => {
    if (!step?.target) return
    let frameId: number

    const poll = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el) {
        const rect = el.getBoundingClientRect()
        setTargetRect((prev) => {
          if (!prev || prev.top !== rect.top || prev.left !== rect.left || prev.width !== rect.width || prev.height !== rect.height) {
            return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
          }
          return prev
        })
      }
      frameId = requestAnimationFrame(poll)
    }

    frameId = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(frameId)
  }, [step])

  // Keyboard support
  useEffect(() => {
    if (!step) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip()
        return
      }
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (isLastStep) {
          setIsCelebrating(true) // cosmetic only — mirrors the button's flourish
          onFinish()
        } else {
          onNext()
        }
        return
      }
      if (e.key === 'ArrowLeft' && stepIndex > 0) {
        e.preventDefault()
        onBack()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [step, stepIndex, isLastStep, onNext, onBack, onSkip, onFinish])

  // Fire onExitAction when leaving a step
  const handleNext = useCallback(() => {
    if (step?.onExitActionId && actions[step.onExitActionId]) {
      actions[step.onExitActionId]()
    }
    if (isLastStep) {
      setConfetti(makeConfetti()) // cosmetic only
      setIsCelebrating(true)
      onFinish()
    } else {
      onNext()
    }
  }, [step, actions, isLastStep, onFinish, onNext])

  const handleBack = useCallback(() => {
    onBack()
  }, [onBack])

  const handleSkip = useCallback(() => {
    if (step?.onExitActionId && actions[step.onExitActionId]) {
      actions[step.onExitActionId]()
    }
    onSkip()
  }, [step, actions, onSkip])

  // Padded rect for spotlight cutout
  const paddedRect = useMemo<TargetRect | null>(() => {
    if (!targetRect) return null
    return {
      top: targetRect.top - RECT_PADDING,
      left: targetRect.left - RECT_PADDING,
      width: targetRect.width + RECT_PADDING * 2,
      height: targetRect.height + RECT_PADDING * 2,
    }
  }, [targetRect])

  const tooltipPos = useMemo(() => {
    if (!step) return { top: 0, left: 0 }
    if (isCentered || !paddedRect) {
      return {
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - TOOLTIP_WIDTH / 2,
      }
    }
    return computeTooltipPosition(paddedRect, step.placement)
  }, [step, isCentered, paddedRect])

  const connectorStyle = useMemo(
    () => (step && !isCentered ? getConnectorStyle(step.placement) : null),
    [step, isCentered],
  )

  if (!step || !mounted) return null

  const animDuration = shouldReduceMotion ? 0 : 0.3
  const animConfig = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 320, damping: 28 }

  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface-elevated)'

  const overlay = (
    <AnimatePresence>
      {step && (
        <motion.div
          key="tour-overlay"
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: animDuration }}
        >
          {/* Keyframes for the spotlight's signature motion — scoped under
              a "tour-" prefix to avoid colliding with anything else on the page. */}
          <style>{`
            @keyframes tourRingRotate { to { transform: rotate(360deg); } }
            @keyframes tourBreathe {
              0%, 100% { opacity: .5; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.04); }
            }
          `}</style>

          {/* Screen reader announcement */}
          <div
            aria-live="polite"
            className="sr-only"
            role="status"
          >
            {`Step ${stepIndex + 1} of ${totalSteps}: ${step.title}. ${step.body}`}
          </div>

          {/* Backdrop */}
          {isCentered || !paddedRect ? (
            // Full-screen vignette for centered steps
            <div
              className="absolute inset-0 backdrop-blur-sm"
              style={{
                background:
                  'radial-gradient(circle at 50% 45%, rgba(15,23,30,0.75), rgba(2,6,10,0.92))',
              }}
              onClick={handleSkip}
              aria-hidden="true"
            />
          ) : (
            <>
              {/* Four dim panels around the spotlight cutout */}
              <div
                className="absolute bg-black/70 backdrop-blur-[2px]"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  height: Math.max(0, paddedRect.top),
                }}
                aria-hidden="true"
              />
              <div
                className="absolute bg-black/70 backdrop-blur-[2px]"
                style={{
                  top: paddedRect.top + paddedRect.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                aria-hidden="true"
              />
              <div
                className="absolute bg-black/70 backdrop-blur-[2px]"
                style={{
                  top: paddedRect.top,
                  left: 0,
                  width: Math.max(0, paddedRect.left),
                  height: paddedRect.height,
                }}
                aria-hidden="true"
              />
              <div
                className="absolute bg-black/70 backdrop-blur-[2px]"
                style={{
                  top: paddedRect.top,
                  left: paddedRect.left + paddedRect.width,
                  right: 0,
                  height: paddedRect.height,
                }}
                aria-hidden="true"
              />

              {/* Crisp outline — always present, including reduced-motion */}
              <motion.div
                className="absolute rounded-xl pointer-events-none"
                style={{
                  top: paddedRect.top,
                  left: paddedRect.left,
                  width: paddedRect.width,
                  height: paddedRect.height,
                  boxShadow:
                    '0 0 0 2px var(--accent-primary), 0 0 24px var(--accent-glow), 0 0 48px rgba(6,182,212,0.15)',
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={animConfig}
                aria-hidden="true"
              />
            </>
          )}

          {/* Tooltip Card */}
          <motion.div
            className="absolute flex flex-col rounded-2xl border border-(--border-strong) bg-(--bg-surface-elevated) shadow-[0_24px_60px_rgba(0,0,0,0.7),0_0_32px_rgba(6,182,212,0.1)] backdrop-blur-xl"
            style={{
              width: TOOLTIP_WIDTH,
              ...tooltipPos,
            }}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.95 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            transition={animConfig}
          >
            {/* Connector beak, pointing back at the target */}
            {connectorStyle && <div style={connectorStyle} aria-hidden="true" />}

            {/* Top glow accent */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-(--accent-primary)/40 to-transparent"
            />

            {/* Content */}
            <div className="px-5 pt-5 pb-4">
              {/* Step counter */}
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-(--border-default) bg-(--bg-subtle) px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                  Step {stepIndex + 1} of {totalSteps}
                </span>
                <button
                  type="button"
                  onClick={handleSkip}
                  aria-label="Skip tour"
                  className={`group flex h-6 w-6 items-center justify-center rounded-lg text-(--text-muted) transition-colors hover:bg-(--bg-subtle) hover:text-(--text-secondary) cursor-pointer ${focusRing}`}
                >
                  <X className="size-3.5 transition-transform duration-200 group-hover:rotate-90" />
                </button>
              </div>

              {/* Title — a quiet typographic accent, not a new animation */}
              <h3 className="bg-gradient-to-br from-(--text-primary) to-(--accent-primary) bg-clip-text text-base font-semibold tracking-tight text-transparent">
                {step.title}
              </h3>

              {/* Body */}
              <p className="mt-2 text-sm leading-relaxed text-(--text-secondary)">
                {step.body}
              </p>
            </div>

            {/* Footer with actions */}
            <div className="flex items-center justify-between border-t border-(--border-default) px-5 py-3.5">
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === stepIndex
                        ? 'w-5 bg-(--accent-primary)'
                        : i < stepIndex
                          ? 'w-1.5 bg-(--accent-primary)/40'
                          : 'w-1.5 bg-(--border-strong)'
                    }`}
                    style={i === stepIndex ? { boxShadow: '0 0 8px var(--accent-glow)' } : undefined}
                    aria-hidden="true"
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <motion.button
                    type="button"
                    onClick={handleBack}
                    aria-label="Previous step"
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                    className={`flex h-8 items-center gap-1.5 rounded-xl border border-(--border-default) bg-(--bg-surface) px-3 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--border-strong) hover:bg-(--bg-subtle) hover:text-(--text-primary) cursor-pointer ${focusRing}`}
                  >
                    <ArrowLeft className="size-3" />
                    Back
                  </motion.button>
                )}

                <div className="relative">
                  <motion.button
                    type="button"
                    onClick={handleNext}
                    aria-label={isLastStep ? 'Finish tour' : 'Next step'}
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                    className={`flex h-8 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold cursor-pointer ${focusRing}`}
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-primary), #0891b2)',
                      color: 'var(--text-inverted)',
                      boxShadow: '0 2px 12px var(--accent-glow)',
                    }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {isLastStep ? (
                        <motion.span
                          key="finish"
                          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1.5"
                        >
                          <Sparkles className="size-3" />
                          Got it!
                        </motion.span>
                      ) : (
                        <motion.span
                          key="next"
                          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1.5"
                        >
                          Next
                          <ArrowRight className="size-3" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  {/* Completion flourish — a short burst anchored on the
                      button, the second (and last) deliberate bold moment. */}
                  {isCelebrating && confetti.length > 0 && !shouldReduceMotion && (
                    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                      {confetti.map((p) => (
                        <motion.span
                          key={p.id}
                          className="absolute left-1/2 top-1/2 size-1.5 rounded-full"
                          style={{ background: p.color }}
                          initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
                          animate={{ opacity: 0, x: p.x, y: p.y, scale: p.scale, rotate: p.rotate }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(overlay, document.body)
}