'use client'

import { Button } from '@/components/ui/button'

interface CanvasErrorProps {
  readonly onRetry: () => void
}

export function CanvasError({ onRetry }: CanvasErrorProps): JSX.Element {
  return (
    <div className="flex h-full w-full items-center justify-center bg-(--bg-base)">
      <div className="w-full max-w-md rounded-xl border border-(--border-default) bg-(--bg-surface) px-6 py-6 text-center shadow-(--shadow-lg)">
        <p className="text-sm font-semibold text-(--text-primary)">Collaboration unavailable</p>
        <p className="mt-3 text-xs leading-relaxed text-(--text-secondary)">
          Unable to connect to the collaborative session. Please check your connection and try again.
        </p>
        <p className="mt-3 text-xs text-(--text-muted)">Room access or network connectivity may be unavailable.</p>
        <Button className="mt-5" onClick={onRetry} type="button" variant="outline">
          Retry connection
        </Button>
      </div>
    </div>
  )
}
