'use client'

import { useEffect, useMemo, useRef, useState, type ComponentType, type WheelEvent as ReactWheelEvent } from 'react'
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from 'framer-motion'
import {
  FolderOpen,
  LayoutGrid,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
  Command,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MaskedAvatars } from '@/components/ui/masked-avatars'
import { cn } from '@/lib/utils'
import type { EditorProject } from '@/lib/editor-projects'
import type { CollaboratorProfile } from '@/types/collaborators'

type ProjectSidebarMode = 'overlay' | 'docked'
type ProjectTab = 'my-projects' | 'shared'

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

// --- Motion Variants ---

const sidebarVariants: Variants = {
  hidden: {
    width: 0,
    opacity: 0,
    marginLeft: 0,
    marginRight: 0,
    transition: { type: 'spring', stiffness: 420, damping: 42, bounce: 0 },
  },
  visible: {
    width: '22rem',
    opacity: 1,
    marginLeft: '0.75rem',
    marginRight: '0.75rem',
    transition: { type: 'spring', stiffness: 420, damping: 42, bounce: 0 },
  },
}

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } },
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.045, delayChildren: 0.05 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.02, staggerDirection: -1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 280, damping: 24 },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.96,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
}

// --- Root Component ---

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
  // FIX [sidebar L154]: useReducedMotion kept for future use — consumed directly where needed
  useReducedMotion()

  // Escape key handler
  useEffect(() => {
    if (!isOpen || isDocked) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDocked, onClose])

  // Scroll-lock on overlay mode
  useEffect(() => {
    if (isDocked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = prev }
  }, [isOpen, isDocked])

  const totalProjects = ownedProjects.length + sharedProjects.length
  const activeOwnedCount = ownedProjects.filter((p) => p.id === activeProjectId).length

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {!isDocked && isOpen && (
          <motion.div
            key="sidebar-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-[3px]"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="project-sidebar"
            data-tour="project-sidebar-panel"
            role="complementary"
            aria-label="Projects sidebar"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={sidebarVariants}
            className={cn(
              'flex min-h-0 flex-col overflow-hidden',
              'rounded-2xl border border-zinc-800/40 bg-zinc-950/95 text-zinc-100 shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl',
              isDocked
                ? 'relative shrink-0 h-[calc(100%-1.5rem)] my-3'
                : 'fixed bottom-3 left-0 top-3 z-50 h-[calc(100%-1.5rem)]',
              className
            )}
          >
            {/* Atmospheric top-glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-indigo-500/30 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 h-48 w-full bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.06),transparent_65%)]"
            />

            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <SidebarHeader
                activeCount={activeOwnedCount}
                onClose={onClose}
                projectCount={totalProjects}
                showCloseButton={canClose}
              />
              <SidebarTabs
                activeProjectId={activeProjectId}
                onDeleteProject={onDeleteProject}
                onOpenProject={onOpenProject}
                onRenameProject={onRenameProject}
                ownedProjects={ownedProjects}
                sharedProjects={sharedProjects}
              />
              <SidebarFooter onCreateProject={onCreateProject} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

// --- Sidebar Header ---

interface SidebarHeaderProps {
  readonly onClose: () => void
  readonly showCloseButton: boolean
  readonly projectCount: number
  readonly activeCount: number
}

export function SidebarHeader({ onClose, showCloseButton, projectCount, activeCount }: SidebarHeaderProps) {
  return (
    <div className="shrink-0 border-b border-zinc-800/50 px-4 pt-4 pb-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-zinc-800/70 bg-zinc-900/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            <Sparkles className="size-2.5 text-indigo-400" aria-hidden="true" />
            <span>Workspace</span>
          </div>

          <div className="flex items-center gap-2.5">
            <h2 className="text-[1.15rem] font-semibold tracking-tight text-zinc-100 leading-none">
              Projects
            </h2>
            <motion.span
              key={projectCount}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 360, damping: 22 }}
              className="inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-400"
            >
              {projectCount}
            </motion.span>
          </div>

          <p className="mt-1.5 text-xs text-zinc-600 leading-none">
            {activeCount > 0
              ? `${activeCount} active`
              : 'Open, organize, and collaborate.'}
          </p>
        </div>

        {showCloseButton && (
          <Button
            aria-label="Close sidebar"
            className="size-8 shrink-0 cursor-pointer rounded-xl border border-zinc-800/70 bg-zinc-900/40 text-zinc-500 shadow-none transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-0"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}

// --- Sidebar Tabs ---

interface SidebarTabsProps {
  readonly ownedProjects: readonly EditorProject[]
  readonly sharedProjects: readonly EditorProject[]
  readonly activeProjectId?: string
  readonly onOpenProject?: (project: EditorProject) => void
  readonly onRenameProject: (project: EditorProject) => void
  readonly onDeleteProject: (project: EditorProject) => void
}

function SidebarTabs(props: SidebarTabsProps) {
  const { ownedProjects, sharedProjects, activeProjectId, onOpenProject, onRenameProject, onDeleteProject } = props
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<ProjectTab>('my-projects')
  const searchRef = useRef<HTMLInputElement>(null)

  const normalizedQuery = query.trim().toLowerCase()
  const filteredOwned = useMemo(() => filterProjects(ownedProjects, normalizedQuery), [ownedProjects, normalizedQuery])
  const filteredShared = useMemo(() => filterProjects(sharedProjects, normalizedQuery), [sharedProjects, normalizedQuery])

  // ⌘K / Ctrl+K shortcut focuses the search input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3.5 pt-3.5 pb-0">
      {/* Search */}
      <div className="relative mb-3.5 flex items-center">
        <Search
          className="pointer-events-none absolute left-3 size-3.5 shrink-0 text-zinc-600"
          aria-hidden="true"
        />
        <input
          ref={searchRef}
          aria-label="Search projects"
          data-tour="project-search"
          className="w-full rounded-xl border border-zinc-800/60 bg-zinc-900/40 py-2.5 pl-9 pr-14 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-all duration-200 focus:border-indigo-500/50 focus:bg-zinc-900/60 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12),0_0_14px_rgba(99,102,241,0.06)]"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects…"
          value={query}
          type="search"
          autoComplete="off"
          spellCheck="false"
        />
        <AnimatePresence>
          {query ? (
            <motion.button
              key="clear"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.12 }}
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 flex size-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="size-3" aria-hidden="true" />
            </motion.button>
          ) : (
            <kbd
              key="shortcut"
              aria-hidden="true"
              className="pointer-events-none absolute right-3 inline-flex h-5 select-none items-center gap-px rounded border border-zinc-800 bg-zinc-900 px-1.5 text-[9px] font-medium text-zinc-600"
            >
              <Command className="size-2.5" />K
            </kbd>
          )}
        </AnimatePresence>
      </div>

      {/* Segmented Tab Control */}
      <Tabs
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        defaultValue="my-projects"
        onValueChange={(v) => setTab(v as ProjectTab)}
        value={tab}
      >
        <TabsList
          className="relative flex h-9 w-full rounded-full border border-zinc-800/50 bg-zinc-900/50 p-1"
          data-tour="project-tabs"
          role="tablist"
          aria-label="Project categories"
        >
          {(['my-projects', 'shared'] as const).map((value) => {
            const isActive = tab === value
            const Icon = value === 'my-projects' ? FolderOpen : Users
            const label = value === 'my-projects' ? 'Mine' : 'Shared'
            const count = value === 'my-projects' ? ownedProjects.length : sharedProjects.length

            return (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  'relative flex flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium text-zinc-500 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-0 cursor-pointer',
                  'data-[state=active]:text-zinc-100'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-full border border-zinc-700/40 bg-zinc-800/70 shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="relative z-10 size-3" aria-hidden="true" />
                <span className="relative z-10">{label}</span>
                <span
                  className={cn(
                    'relative z-10 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums transition-colors',
                    isActive
                      ? 'bg-zinc-700/60 text-zinc-300'
                      : 'bg-zinc-950/50 text-zinc-600'
                  )}
                >
                  {count}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent
          className="sidebar-scrollbar mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain touch-pan-y px-0.5 pt-4 pb-2 outline-none"
          value="my-projects"
          onWheel={handleSidebarWheel}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <SectionHeader
            icon={LayoutGrid}
            label="Owned"
            resultCount={filteredOwned.length}
          />
          <ProjectList
            activeProjectId={activeProjectId}
            emptyLabel={query ? 'No matching projects' : 'No projects yet'}
            onDeleteProject={onDeleteProject}
            onOpenProject={onOpenProject}
            onRenameProject={onRenameProject}
            projects={filteredOwned}
          />
        </TabsContent>

        <TabsContent
          className="sidebar-scrollbar mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain touch-pan-y px-0.5 pt-4 pb-2 outline-none"
          value="shared"
          onWheel={handleSidebarWheel}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <SectionHeader
            icon={Users}
            label="Shared with me"
            resultCount={filteredShared.length}
          />
          <ProjectList
            activeProjectId={activeProjectId}
            emptyLabel={query ? 'No matching shared projects' : 'Nothing shared yet'}
            onOpenProject={onOpenProject}
            projects={filteredShared}
          />
        </TabsContent>
      </Tabs>

      <style jsx global>{`
        .sidebar-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          transition: scrollbar-color 0.3s;
        }
        .sidebar-scrollbar:hover {
          scrollbar-color: rgba(63, 63, 70, 0.45) transparent;
        }
        .sidebar-scrollbar::-webkit-scrollbar { width: 4px; }
        .sidebar-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scrollbar::-webkit-scrollbar-thumb {
          border-radius: 9999px;
          background-color: transparent;
          transition: background-color 0.3s;
        }
        .sidebar-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(63, 63, 70, 0.45);
        }
      `}</style>
    </div>
  )
}

function filterProjects(projects: readonly EditorProject[], query: string) {
  if (!query) return projects
  return projects.filter((p) =>
    [p.name, p.roomId, p.id]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(query))
  )
}


function handleSidebarWheel<T extends HTMLElement>(event: ReactWheelEvent<T>) {
  const element = event.currentTarget
  const lineHeight = 16
  let deltaY = event.deltaY
  let deltaX = event.deltaX

  if (event.deltaMode === 1) {
    deltaY *= lineHeight
    deltaX *= lineHeight
  } else if (event.deltaMode === 2) {
    deltaY *= element.clientHeight
    deltaX *= element.clientWidth
  }

  if (deltaY === 0 && deltaX === 0) {
    return
  }

  const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight)
  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth)

  if (deltaY !== 0 && maxScrollTop > 0) {
    const nextTop = Math.max(0, Math.min(maxScrollTop, element.scrollTop + deltaY))
    if (nextTop !== element.scrollTop) {
      element.scrollTop = nextTop
      event.preventDefault()
    }
  }

  if (deltaX !== 0 && maxScrollLeft > 0) {
    const nextLeft = Math.max(0, Math.min(maxScrollLeft, element.scrollLeft + deltaX))
    if (nextLeft !== element.scrollLeft) {
      element.scrollLeft = nextLeft
      event.preventDefault()
    }
  }
}


// --- Section Header ---

interface SectionHeaderProps {
  readonly icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  readonly label: string
  readonly resultCount: number
}

function SectionHeader({ icon: Icon, label, resultCount }: Readonly<SectionHeaderProps>) {
  return (
    <div className="mb-2 flex items-center gap-2 px-1">
      <Icon className="size-3 text-zinc-600" aria-hidden="true" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        {label}
      </span>
      <span className="ml-auto text-[10px] tabular-nums text-zinc-700">
        {resultCount}
      </span>
    </div>
  )
}

// --- Project List ---

interface ProjectListProps {
  readonly projects: readonly EditorProject[]
  readonly activeProjectId?: string
  readonly emptyLabel?: string
  readonly onOpenProject?: (project: EditorProject) => void
  readonly onRenameProject?: (project: EditorProject) => void
  readonly onDeleteProject?: (project: EditorProject) => void
}

function ProjectList({
  projects,
  activeProjectId,
  emptyLabel = 'No projects yet',
  onOpenProject,
  onRenameProject,
  onDeleteProject,
}: Readonly<ProjectListProps>) {
  if (projects.length === 0) {
    return <EmptyProjectsState label={emptyLabel} />
  }

  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-0.5 pb-2"
      role="list"
    >
      {projects.map((project) => {
        const isActive = project.id === activeProjectId
        const meta = getProjectMeta(project)

        return (
          <motion.li
            key={project.id}
            variants={itemVariants}
            layout
          >
            <ProjectCard
              project={project}
              meta={meta}
              isActive={isActive}
              onOpenProject={onOpenProject}
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
            />
          </motion.li>
        )
      })}
    </motion.ul>
  )
}

// --- Project Card ---

interface ProjectCardProps {
  readonly project: EditorProject
  readonly meta: ReturnType<typeof getProjectMeta>
  readonly isActive: boolean
  readonly onOpenProject?: (project: EditorProject) => void
  readonly onRenameProject?: (project: EditorProject) => void
  readonly onDeleteProject?: (project: EditorProject) => void
}

function ProjectCard({ project, meta, isActive, onOpenProject, onRenameProject, onDeleteProject }: ProjectCardProps) {
  const isInteractive = !!onOpenProject

  return (
    <motion.div
      whileHover={isInteractive ? { x: 3 } : undefined}
      whileTap={isInteractive ? { scale: 0.985 } : undefined}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      onClick={() => onOpenProject?.(project)}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-pressed={isInteractive ? isActive : undefined}
      aria-label={isInteractive ? `Open project: ${project.name}` : undefined}
      {...(isActive ? { 'data-tour': 'active-project-card' } : {})}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpenProject?.(project)
        }
      }}
      className={cn(
        'group relative overflow-hidden rounded-xl border p-3 transition-colors duration-150',
        isInteractive ? 'cursor-pointer' : 'cursor-default',
        isActive
          ? 'border-zinc-700/60 bg-zinc-900/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
          : 'border-transparent bg-transparent hover:border-zinc-800/50 hover:bg-zinc-900/35'
      )}
    >
      <motion.div
        aria-hidden="true"
        animate={{
          scaleY: isActive ? 0.65 : 0,
          opacity: isActive ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
        className="absolute inset-y-0 left-0 w-0.5 origin-center rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]"
      />

      <div className="flex items-start justify-between gap-3 pl-2">
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                'truncate text-sm font-medium tracking-tight transition-colors',
                isActive ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-100'
              )}
            >
              {project.name}
            </p>
            {project.owned && <ProjectBadge label="Owned" />}
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="truncate text-xs text-zinc-600">{meta.updatedLabel}</p>
            {meta.maskedAvatars.length > 0 && (
              <div className="flex items-center gap-1.5">
                <MaskedAvatars
                  avatars={meta.maskedAvatars}
                  size={28}
                  border={3}
                  column={18}
                  movement={0.6}
                  ringed={false}
                  blurOnRest={false}
                  className="scale-90"
                />
                {meta.countLabel && (
                  <span className="text-[10px] font-medium tabular-nums text-zinc-600">
                    {meta.countLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          aria-label={`Actions for ${project.name}`}
        >
          {project.owned && onRenameProject && (
            <button
              aria-label={`Rename ${project.name}`}
              className="flex size-7 items-center justify-center cursor-pointer rounded-lg border border-zinc-800/70 bg-zinc-900/60 text-zinc-500 transition-all duration-150 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              onClick={(e) => { e.stopPropagation(); onRenameProject(project) }}
              type="button"
            >
              <PencilLine className="size-3" aria-hidden="true" />
            </button>
          )}
          {project.owned && onDeleteProject && (
            <button
              aria-label={`Delete ${project.name}`}
              className="flex size-7 items-center justify-center cursor-pointer rounded-lg border border-zinc-800/70 bg-zinc-900/60 text-zinc-500 transition-all duration-150 hover:border-red-900/50 hover:bg-red-950/50 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
              onClick={(e) => { e.stopPropagation(); onDeleteProject(project) }}
              type="button"
            >
              <Trash2 className="size-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// --- Project Badge ---

function ProjectBadge({ label }: Readonly<{ label: string }>) {
  return (
    <span className="shrink-0 rounded-md border border-zinc-800/80 bg-zinc-900 px-1.5 py-px text-[9px] font-semibold uppercase tracking-widest text-zinc-500">
      {label}
    </span>
  )
}

// (AvatarStack replaced by MaskedAvatars — see ProjectCard)

// --- Empty State ---

function EmptyProjectsState({ label = 'No projects yet' }: Readonly<{ label?: string }>) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      className="flex min-h-52 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/60 bg-zinc-900/10 px-4 py-8 text-center"
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-600 shadow-sm">
        <FolderOpen className="size-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold text-zinc-400">{label}</p>
      <p className="mt-1.5 max-w-45 text-[11px] leading-relaxed text-zinc-600">
        Projects let you isolate and share assets cleanly across your team.
      </p>
    </motion.div>
  )
}

// --- Sidebar Footer ---

interface SidebarFooterProps {
  readonly onCreateProject: () => void
}

export function SidebarFooter({ onCreateProject }: SidebarFooterProps) {
  return (
    <div className="shrink-0 border-t border-zinc-800/50 bg-zinc-950/80 p-4 backdrop-blur-md">
      <motion.button
        whileHover={{ y: -1, scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-2.5 text-xs font-semibold text-white outline-none transition-shadow duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:ring-offset-0"
        data-tour="sidebar-new-project"
        style={{
          background: 'linear-gradient(160deg, #6366f1 0%, #7c3aed 100%)',
          boxShadow: '0 4px 16px rgba(99,102,241,0.22), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
        onClick={onCreateProject}
        type="button"
        aria-label="Create new project"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full"
        />
        <Plus className="relative size-3.5 transition-transform duration-200 group-hover:rotate-90" aria-hidden="true" />
        <span className="relative">New Project</span>
      </motion.button>

      <p className="mt-3 text-center text-[10px] text-zinc-700 leading-relaxed">
        Review workspace limits and usage anytime.
      </p>
    </div>
  )
}

// --- Data Helpers ---

function getCollaboratorAvatarUrl(c: CollaboratorProfile): string {
  if (c.avatarUrl) return c.avatarUrl
  const displayName = c.displayName || c.email.split('@')[0] || '?'
  // Generate a consistent placeholder avatar using ui-avatars
  const encoded = encodeURIComponent(displayName)
  return `https://ui-avatars.com/api/?name=${encoded}&background=1a1a30&color=a0a0c0&size=64&bold=true&format=png`
}

function getCollaboratorName(c: CollaboratorProfile): string {
  return c.displayName || c.email.split('@')[0] || 'User'
}

function getProjectMeta(project: EditorProject) {
  const collaborators = project.collaborators ?? []
  const displayed = collaborators.slice(0, 4)
  const maskedAvatars = displayed.map((c) => ({
    avatar: getCollaboratorAvatarUrl(c),
    name: getCollaboratorName(c),
  }))
  const overflow = Math.max(0, collaborators.length - 4)
  const countLabel = overflow > 0 ? `+${overflow}` : ''
  const updatedLabel = formatRelativeTime(project.updatedAt)
  return { maskedAvatars, updatedLabel, countLabel }
}

function formatRelativeTime(dateInput?: string): string {
  if (!dateInput) return 'Updated recently'
  const ms = new Date(dateInput).getTime()
  if (Number.isNaN(ms)) return 'Updated recently'

  const deltaS = Math.round((Date.now() - ms) / 1000)
  if (deltaS < 60) return 'Just now'
  const deltaM = Math.floor(deltaS / 60)
  if (deltaM < 60) return `${deltaM}m ago`
  const deltaH = Math.floor(deltaM / 60)
  if (deltaH < 24) return `${deltaH}h ago`
  const deltaD = Math.floor(deltaH / 24)
  if (deltaD === 1) return 'Yesterday'
  if (deltaD < 7) return `${deltaD}d ago`
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}