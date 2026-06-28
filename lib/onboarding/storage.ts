const PREFIX = 'nexusai:onboarding'

/**
 * Check whether a user has already seen a specific tour.
 * Returns `true` during SSR to prevent auto-fire on the server.
 */
export function hasSeenTour(tourId: string, userId: string): boolean {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(`${PREFIX}:${userId}:${tourId}`) === '1'
}

/**
 * Mark a tour as seen for the given user.
 */
export function markTourSeen(tourId: string, userId: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(`${PREFIX}:${userId}:${tourId}`, '1')
}

/**
 * Reset all tour flags for the given user so tours can be replayed.
 */
export function resetTours(userId: string): void {
  if (typeof window === 'undefined') return
  for (const id of ['home', 'project'] as const) {
    window.localStorage.removeItem(`${PREFIX}:${userId}:${id}`)
  }
}
