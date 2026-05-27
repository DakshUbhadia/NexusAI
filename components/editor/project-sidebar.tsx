'use client'

import { useEffect } from 'react'

import { PencilLine, Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { EditorProject } from '@/lib/editor-projects'

type ProjectSidebarMode = 'overlay' | 'docked'

interface ProjectSidebarProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onCreateProject: () => void
  readonly onRenameProject: (project: EditorProject) => void
  readonly onDeleteProject: (project: EditorProject) => void
  readonly ownedProjects: readonly EditorProject[]
  readonly sharedProjects: readonly EditorProject[]
  readonly activeProjectId?: string
  readonly onOpenProject?: (project: EditorProject) => void
  readonly mode?: ProjectSidebarMode
  readonly showCloseButton?: boolean
  readonly className?: string
}

export function ProjectSidebar(props: ProjectSidebarProps) {
  const {
    isOpen,
    onClose,
    onCreateProject,
    onRenameProject,
    onDeleteProject,
    ownedProjects,
    sharedProjects,
    activeProjectId,
    onOpenProject,
    mode = 'overlay',
    showCloseButton,
    className,
  } = props
  const isDocked = mode === 'docked'
  const canClose = showCloseButton ?? !isDocked

  useEffect(() => {
    if (!isOpen || isDocked) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDocked, onClose])

  useEffect(() => {
    if (isDocked) {
      return
    }

    document.body.style.overflow = isOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, isDocked])

  const isVisible = isDocked || isOpen

  return (
    <>
      {!isDocked && isOpen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-(--bg-overlay) transition-opacity duration-200"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          'flex h-full flex-col bg-(--bg-surface) border-r border-(--border-default)',
          isDocked
            ? 'relative w-(--sidebar-width) shrink-0'
            : 'fixed bottom-0 left-0 top-0 z-50 w-60 shadow-lg transition-transform duration-300 ease-out',
          isDocked || isVisible ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <SidebarHeader onClose={onClose} showCloseButton={canClose} />
        <SidebarTabs
          activeProjectId={activeProjectId}
          onDeleteProject={onDeleteProject}
          onOpenProject={onOpenProject}
          onRenameProject={onRenameProject}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
        />
        <SidebarFooter onCreateProject={onCreateProject} />
      </aside>
    </>
  )
}

interface SidebarHeaderProps {
  readonly onClose: () => void
  readonly showCloseButton: boolean
}

export function SidebarHeader({ onClose, showCloseButton }: Readonly<SidebarHeaderProps>) {
  return (
    <div
      className={cn(
        'flex h-14 items-center justify-between',
        'border-b border-(--border-default) bg-[linear-gradient(90deg,var(--accent-primary-muted),transparent_62%)]',
        'px-4'
      )}
    >
      <h2 className="text-sm font-semibold text-(--text-primary)">Projects</h2>
      {showCloseButton ? (
        <Button
          aria-label="Close sidebar"
          className="transition-opacity duration-200 hover:bg-(--accent-primary-muted)"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      ) : (
        <div className="h-8 w-8" />
      )}
    </div>
  )
}

interface SidebarTabsProps {
  readonly ownedProjects: readonly EditorProject[]
  readonly sharedProjects: readonly EditorProject[]
  readonly activeProjectId?: string
  readonly onOpenProject?: (project: EditorProject) => void
  readonly onRenameProject: (project: EditorProject) => void
  readonly onDeleteProject: (project: EditorProject) => void
}

function SidebarTabs(props: SidebarTabsProps) {
  const {
    ownedProjects,
    sharedProjects,
    activeProjectId,
    onOpenProject,
    onRenameProject,
    onDeleteProject,
  } = props

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs className="flex h-full flex-col" defaultValue="my-projects">
        <TabsList
          className={cn(
            'mx-3 mt-3 w-[calc(100%-1.5rem)] rounded-full border border-(--border-default)',
            'bg-(--bg-base) p-1'
          )}
        >
          <TabsTrigger
            className="rounded-full px-3 py-1 text-xs text-(--text-secondary) data-[state=active]:bg-(--bg-surface) data-[state=active]:text-(--text-primary)"
            value="my-projects"
          >
            My Projects
          </TabsTrigger>
          <TabsTrigger
            className="rounded-full px-3 py-1 text-xs text-(--text-secondary) data-[state=active]:bg-(--bg-surface) data-[state=active]:text-(--text-primary)"
            value="shared"
          >
            Shared
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-3 pt-2">
          <TabsContent className="flex h-full flex-col" value="my-projects">
            <ProjectList
              activeProjectId={activeProjectId}
              emptyLabel="No projects yet"
              onDeleteProject={onDeleteProject}
              onOpenProject={onOpenProject}
              onRenameProject={onRenameProject}
              projects={ownedProjects}
            />
          </TabsContent>

          <TabsContent className="flex h-full flex-col" value="shared">
            <ProjectList
              activeProjectId={activeProjectId}
              emptyLabel="No shared projects yet"
              onOpenProject={onOpenProject}
              projects={sharedProjects}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

interface ProjectListProps {
  readonly projects: readonly EditorProject[]
  readonly activeProjectId?: string
  readonly emptyLabel?: string
  readonly onOpenProject?: (project: EditorProject) => void
  readonly onRenameProject?: (project: EditorProject) => void
  readonly onDeleteProject?: (project: EditorProject) => void
}

function ProjectList(props: ProjectListProps) {
  const {
    projects,
    activeProjectId,
    emptyLabel = 'No projects yet',
    onOpenProject,
    onRenameProject,
    onDeleteProject,
  } = props

  if (projects.length === 0) {
    return <EmptyProjectsState label={emptyLabel} />
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <div
          key={project.id}
          className={cn(
            'flex items-start justify-between gap-3 rounded-lg border px-3 py-3 transition-colors duration-200',
            project.id === activeProjectId
              ? 'border-(--border-accent) bg-(--accent-primary-muted) shadow-[var(--shadow-glow-cyan)]'
              : 'border-(--border-default) bg-(--bg-base) hover:border-(--border-strong) hover:bg-(--bg-subtle)'
          )}
        >
          {onOpenProject ? (
            <button
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
              onClick={() => onOpenProject(project)}
              type="button"
            >
              <span className="mt-1.5 h-2 w-2 rounded-full bg-(--accent-secondary) shadow-[var(--shadow-glow-cyan)]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-(--text-primary)">{project.name}</p>
                <p className="truncate text-xs text-(--text-secondary)">{project.roomId}</p>
              </div>
            </button>
          ) : (
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-(--accent-secondary) shadow-[var(--shadow-glow-cyan)]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-(--text-primary)">{project.name}</p>
                <p className="truncate text-xs text-(--text-secondary)">{project.roomId}</p>
              </div>
            </div>
          )}

          {project.owned && onRenameProject && onDeleteProject ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                aria-label={`Rename ${project.name}`}
                onClick={() => onRenameProject(project)}
                size="icon-xs"
                variant="ghost"
              >
                <PencilLine className="size-3.5" />
              </Button>
              <Button
                aria-label={`Delete ${project.name}`}
                onClick={() => onDeleteProject(project)}
                size="icon-xs"
                variant="ghost"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function EmptyProjectsState({ label = 'No projects yet' }: Readonly<{ label?: string }>) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      <p className="text-sm leading-relaxed text-(--text-secondary)">{label}</p>
    </div>
  )
}

interface SidebarFooterProps {
  readonly onCreateProject: () => void
}

export function SidebarFooter({ onCreateProject }: SidebarFooterProps) {
  return (
    <div className={cn('flex flex-col gap-2 border-t border-(--border-default) p-4')}>
      <Button className="w-full gap-2" onClick={onCreateProject} size="sm" type="button">
        <Plus className="size-4" />
        New Project
      </Button>
    </div>
  )
}
