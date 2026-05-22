'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, X } from 'lucide-react'
import { useEffect } from 'react'

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function ProjectSidebar({
  isOpen,
  onClose,
  className,
}: ProjectSidebarProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50',
          'w-60',
          'flex flex-col',
          'bg-[var(--bg-surface)] border-r border-[var(--border-color)]',
          'transition-transform duration-300 ease-out',
          'shadow-lg',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <SidebarHeader onClose={onClose} />
        <SidebarTabs />
        <SidebarFooter />
      </aside>
    </>
  )
}

export function SidebarHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'h-14',
        'px-4',
        'border-b border-[var(--border-color)]'
      )}
    >
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Projects
      </h2>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        title="Close sidebar"
        className="transition-opacity duration-200"
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}

export function SidebarTabs() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Tabs
        defaultValue="my-projects"
        className="flex flex-col h-full"
      >
        <TabsList
          className={cn(
            'w-full rounded-none border-b border-[var(--border-color)]',
            'bg-transparent',
            'p-0'
          )}
        >
          <TabsTrigger
            value="my-projects"
            className="text-xs px-3 py-2 rounded-none"
          >
            My Projects
          </TabsTrigger>
          <TabsTrigger
            value="shared"
            className="text-xs px-3 py-2 rounded-none"
          >
            Shared
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent
            value="my-projects"
            className="h-full flex flex-col"
          >
            <EmptyProjectsState />
          </TabsContent>

          <TabsContent
            value="shared"
            className="h-full flex flex-col"
          >
            <EmptyProjectsState label="No shared projects yet" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function EmptyProjectsState({ label = 'No projects yet' }: { label?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {label}
      </p>
    </div>
  )
}

export function SidebarFooter() {
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        'p-4',
        'border-t border-[var(--border-color)]'
      )}
    >
      <Button
        variant="default"
        size="sm"
        className={cn(
          'w-full',
          'gap-2'
        )}
      >
        <Plus className="size-4" />
        New Project
      </Button>
    </div>
  )
}
