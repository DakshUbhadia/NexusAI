import type { ReactElement } from 'react'

export interface LoadingScreenProps {
  title: string
  description?: string
  fullScreen?: boolean
}

export function LoadingScreen({ title, description, fullScreen = true }: LoadingScreenProps): ReactElement {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-5 bg-(--bg-base) ${fullScreen ? 'h-screen' : 'h-full'}`}
      role="status"
      aria-live="polite"
    >
      {/* Spinner */}
      <div className="relative flex h-11 w-11 items-center justify-center">
        {/* Outer spinning ring */}
        <svg
          className="absolute inset-0 h-full w-full animate-spin"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animationDuration: '1.1s' }}
          aria-hidden="true"
        >
          <circle
            cx="22"
            cy="22"
            r="18"
            stroke="var(--border-default)"
            strokeWidth="2"
          />
          <path
            d="M22 4a18 18 0 0 1 18 18"
            stroke="var(--accent-primary)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {/* Inner glow dot */}
        <div
          className="h-2 w-2 rounded-full"
          style={{
            background: 'var(--accent-primary)',
            boxShadow: '0 0 8px 2px var(--accent-glow)',
          }}
        />
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-sm font-medium text-(--text-primary)" style={{ fontFamily: 'var(--font-sans)' }}>
          {title}
        </p>
        {description && (
          <p className="text-xs text-(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
