'use client'

import { useCallback, useMemo, useState } from 'react'

import type { TourId, TourStep } from '@/types/onboarding'
import { markTourSeen } from '@/lib/onboarding/storage'
import { homeTourSteps, projectTourSteps } from '@/lib/onboarding/tour-steps'

type TourState =
  | { status: 'idle' }
  | { status: 'active'; tourId: TourId; stepIndex: number }

function getStepsForTour(tourId: TourId): TourStep[] {
  return tourId === 'home' ? homeTourSteps : projectTourSteps
}

type UseOnboardingTourReturn = {
  /** Whether a tour is currently active */
  isActive: boolean
  /** The currently active tour ID, or null */
  activeTourId: TourId | null
  /** Current step index (0-based) */
  stepIndex: number
  /** Total number of steps in the active tour */
  totalSteps: number
  /** The current TourStep object, or null if no tour is active */
  currentStep: TourStep | null
  /** Start a specific tour */
  start: (tourId: TourId) => void
  /** Advance to the next step */
  next: () => void
  /** Go back to the previous step */
  back: () => void
  /** Skip the tour (marks as seen) */
  skip: () => void
  /** Finish the tour (marks as seen) */
  finish: () => void
}

export function useOnboardingTour(userId: string | null): UseOnboardingTourReturn {
  const [state, setState] = useState<TourState>({ status: 'idle' })

  const steps = useMemo<TourStep[]>(() => {
    if (state.status !== 'active') return []
    return getStepsForTour(state.tourId)
  }, [state])

  const currentStep = useMemo<TourStep | null>(() => {
    if (state.status !== 'active') return null
    return steps[state.stepIndex] ?? null
  }, [state, steps])

  const start = useCallback((tourId: TourId) => {
    setState({ status: 'active', tourId, stepIndex: 0 })
  }, [])

  const next = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'active') return prev
      const tourSteps = getStepsForTour(prev.tourId)
      const nextIndex = prev.stepIndex + 1
      if (nextIndex >= tourSteps.length) {
        if (userId) markTourSeen(prev.tourId, userId)
        return { status: 'idle' }
      }
      return { ...prev, stepIndex: nextIndex }
    })
  }, [userId])

  const back = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'active') return prev
      const prevIndex = Math.max(0, prev.stepIndex - 1)
      return { ...prev, stepIndex: prevIndex }
    })
  }, [])

  const skip = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'active') return prev
      if (userId) markTourSeen(prev.tourId, userId)
      return { status: 'idle' }
    })
  }, [userId])

  const finish = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'active') return prev
      if (userId) markTourSeen(prev.tourId, userId)
      return { status: 'idle' }
    })
  }, [userId])

  return {
    isActive: state.status === 'active',
    activeTourId: state.status === 'active' ? state.tourId : null,
    stepIndex: state.status === 'active' ? state.stepIndex : 0,
    totalSteps: steps.length,
    currentStep,
    start,
    next,
    back,
    skip,
    finish,
  }
}
