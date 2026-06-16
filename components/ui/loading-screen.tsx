import type { ReactElement } from 'react'

export interface LoadingScreenProps {
  title: string
  description?: string
  fullScreen?: boolean
}

export function LoadingScreen({ title, description, fullScreen = true }: LoadingScreenProps): ReactElement {
  return (
    <div className={`flex w-full items-center justify-center bg-(--bg-base) ${fullScreen ? 'h-screen' : 'h-full'}`} role="status" aria-live="polite">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-(--border-default) bg-(--bg-surface) px-6 py-6 text-center shadow-(--shadow-lg)">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-(--border-default) bg-(--bg-subtle)">
          <div className="h-6 w-6 animate-pulse rounded-full bg-(--accent-primary-muted)" />
        </div>
        <div>
          <p className="text-sm font-semibold text-(--text-primary)">{title}</p>
          {description && <p className="mt-2 text-xs text-(--text-muted)">{description}</p>}
        </div>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-(--bg-subtle)">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-(--accent-primary-muted)" />
        </div>
      </div>
    </div>
  )
}
