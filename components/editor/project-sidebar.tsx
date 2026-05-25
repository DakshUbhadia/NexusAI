'use client'

import { useEffect } from 'react'

import { PencilLine, Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export interface ProjectSidebarProject {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly owned: boolean
}

interface ProjectSidebarProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onCreateProject: () => void
  readonly onRenameProject: (project: ProjectSidebarProject) => void
  readonly onDeleteProject: (project: ProjectSidebarProject) => void
  readonly projects: readonly ProjectSidebarProject[]
  readonly className?: string
}

export function ProjectSidebar(props: ProjectSidebarProps) {
  const {
    isOpen,
    onClose,
    onCreateProject,
    onRenameProject,
    onDeleteProject,
    projects,
    className,
  } = props

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {isOpen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          'fixed bottom-0 left-0 top-0 z-50 flex w-60 flex-col',
          'bg-(--bg-surface) border-r border-(--border-color)',
          'shadow-lg transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <SidebarHeader onClose={onClose} />
        <SidebarTabs
          onDeleteProject={onDeleteProject}
          onRenameProject={onRenameProject}
          projects={projects}
        />
        <SidebarFooter onCreateProject={onCreateProject} />
      </aside>
    </>
  )
}

export function SidebarHeader({ onClose }: Readonly<{ onClose: () => void }>) {
  return (
    <div
      className={cn(
        'flex h-14 items-center justify-between',
        'border-b border-(--border-color)',
        'px-4'
      )}
    >
      <h2 className="text-sm font-semibold text-(--text-primary)">Projects</h2>
      <Button
        aria-label="Close sidebar"
        className="transition-opacity duration-200"
        onClick={onClose}
        size="icon"
        variant="ghost"
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}

interface SidebarTabsProps {
  readonly projects: readonly ProjectSidebarProject[]
  readonly onRenameProject: (project: ProjectSidebarProject) => void
  readonly onDeleteProject: (project: ProjectSidebarProject) => void
}

function SidebarTabs(props: SidebarTabsProps) {
  const { projects, onRenameProject, onDeleteProject } = props
  const ownedProjects = projects.filter((project) => project.owned)
  const sharedProjects = projects.filter((project) => !project.owned)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs className="flex h-full flex-col" defaultValue="my-projects">
        <TabsList
          className={cn(
            'w-full rounded-none border-b border-(--border-color)',
            'bg-transparent p-0'
          )}
        >
          <TabsTrigger className="rounded-none px-3 py-2 text-xs" value="my-projects">
            My Projects
          </TabsTrigger>
          <TabsTrigger className="rounded-none px-3 py-2 text-xs" value="shared">
            Shared
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-3">
          <TabsContent className="flex h-full flex-col" value="my-projects">
            <ProjectList
              emptyLabel="No projects yet"
              onDeleteProject={onDeleteProject}
              onRenameProject={onRenameProject}
              projects={ownedProjects}
            />
          </TabsContent>

          <TabsContent className="flex h-full flex-col" value="shared">
            <ProjectList
              emptyLabel="No shared projects yet"
              projects={sharedProjects}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

interface ProjectListProps {
  readonly projects: readonly ProjectSidebarProject[]
  readonly emptyLabel?: string
  readonly onRenameProject?: (project: ProjectSidebarProject) => void
  readonly onDeleteProject?: (project: ProjectSidebarProject) => void
}

function ProjectList(props: ProjectListProps) {
  const { projects, emptyLabel = 'No projects yet', onRenameProject, onDeleteProject } = props

  if (projects.length === 0) {
    return <EmptyProjectsState label={emptyLabel} />
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <div
          key={project.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-(--border-color) bg-(--bg-base)/60 px-3 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-(--text-primary)">{project.name}</p>
            <p className="truncate text-xs text-(--text-secondary)">{project.slug}</p>
          </div>

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
    <div className={cn('flex flex-col gap-2 border-t border-(--border-color) p-4')}>
      <Button className="w-full gap-2" onClick={onCreateProject} size="sm" type="button">
        <Plus className="size-4" />
        New Project
      </Button>
    </div>
  )
}