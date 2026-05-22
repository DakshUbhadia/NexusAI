'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react'

interface EditorNavbarProps {
  isOpen: boolean
  onToggleSidebar: () => void
  className?: string
}

export function EditorNavbar({
  isOpen,
  onToggleSidebar,
  className,
}: EditorNavbarProps) {
  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-40',
        'flex items-center justify-between',
        'h-[var(--topbar-height)]',
        'bg-[var(--bg-surface)] border-b border-[var(--border-color)]',
        'px-3',
        className
      )}
    >
      <NavbarLeft isOpen={isOpen} onToggleSidebar={onToggleSidebar} />
      <NavbarCenter />
      <NavbarRight />
    </nav>
  )
}

export function NavbarLeft({
  isOpen,
  onToggleSidebar,
}: {
  isOpen: boolean
  onToggleSidebar: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        title={isOpen ? 'Close sidebar' : 'Open sidebar'}
        className="transition-opacity duration-200"
      >
        {isOpen ? (
          <PanelLeftClose className="size-4" />
        ) : (
          <PanelLeftOpen className="size-4" />
        )}
      </Button>
    </div>
  )
}

export function NavbarCenter() {
  return <div className="flex-1 flex items-center justify-center" />
}

export function NavbarRight() {
  return <div className="flex items-center gap-2" />
}
