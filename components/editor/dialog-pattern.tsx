import React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogPatternProps extends React.ComponentProps<'div'> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  children: React.ReactNode
}

export function DialogPattern(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { open, onOpenChange, className, children, ...props }: DialogPatternProps
) {
  return (
    <div
      className={cn(
        'rounded-lg',
        'bg-[var(--bg-base)]',
        'border border-[var(--border-color)]',
        'shadow-lg',
        'overflow-hidden',
        'max-w-md w-full',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogPatternHeader({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        'px-6 py-5',
        'border-b border-[var(--border-color)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogPatternTitle({
  className,
  children,
  ...props
}: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn(
        'text-base font-semibold',
        'text-[var(--text-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

export function DialogPatternDescription({
  className,
  children,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'text-sm',
        'text-[var(--text-secondary)]',
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
}

export function DialogPatternBody({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'px-6 py-5',
        'max-h-[calc(100vh-300px)]',
        'overflow-y-auto',
        'text-[var(--text-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogPatternFooter({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3',
        'px-6 py-4',
        'border-t border-[var(--border-color)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogPatternClose({
  onClick,
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center',
        'rounded-md',
        'text-[var(--text-secondary)]',
        'hover:text-[var(--text-primary)]',
        'hover:bg-[var(--bg-secondary)]',
        'transition-colors duration-200',
        'h-8 w-8',
        'focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]'
      )}
      onClick={onClick}
      title="Close dialog"
      {...props}
    >
      <X className="size-4" />
    </button>
  )
}
