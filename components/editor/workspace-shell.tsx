'use client'

import { useState } from 'react'

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Save,
  LayoutTemplate,
  Share2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import {
  CreateProjectDialog,
  DeleteProjectDialog,
  RenameProjectDialog,
} from '@/components/editor/project-dialogs'
import { AiSidebar } from '@/components/editor/ai-sidebar'
import { CollaborativeCanvas } from '@/components/editor/canvas/collaborative-canvas'
import { ProjectSidebar } from '@/components/editor/project-sidebar'
import { LiveblocksRoomProvider } from '@/components/editor/providers/liveblocks-room-provider'
import { ShareDialog } from '@/components/editor/share-dialog'
import { StarterTemplatesModal } from '@/components/editor/starter-templates-modal'
import { Button } from '@/components/ui/button'
import { CreepyButton } from '@/components/ui/creepy-button'
import type { EditorProjectLists } from '@/lib/editor-projects'

import { useProjectActions } from '@/hooks/useProjectActions'
import type { CanvasSaveStatus } from '@/hooks/useCanvasAutosave'
import type { CanvasTemplate, CanvasTemplateImportRequest } from '@/components/editor/starter-templates'

interface WorkspaceShellProps extends EditorProjectLists {
  readonly currentProjectId: string
  readonly currentRoomId: string
  readonly projectName: string
  readonly projectSpecs: readonly {
    id: string
    createdAt: string
    filename: string
  }[]
}

function findOwnedProject(projectId: string | undefined, ownedProjects: readonly { id: string; name: string }[]) {
  if (!projectId) {
    return undefined
  }

  return ownedProjects.find((project) => project.id === projectId)
}

function getSaveButtonLabel(status: CanvasSaveStatus, errorMessage: string | null): string {
  if (status === 'saving') {
    return 'Saving'
  }

  if (status === 'saved') {
    return 'Saved'
  }

  if (status === 'error') {
    return errorMessage ?? 'Save error'
  }

  return 'Save'
}

export function WorkspaceShell(props: WorkspaceShellProps) {
  const { currentProjectId, currentRoomId, projectName, ownedProjects, projectSpecs, sharedProjects } = props
  const router = useRouter()
  const projectActions = useProjectActions({ activeProjectId: currentProjectId })
  const [projectSidebarOpen, setProjectSidebarOpen] = useState(false)
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false)
  const [canvasSaveNow, setCanvasSaveNow] = useState<(() => Promise<void>) | null>(null)
  const [canvasSaveErrorMessage, setCanvasSaveErrorMessage] = useState<string | null>(null)
  const [canvasSaveStatus, setCanvasSaveStatus] = useState<CanvasSaveStatus>('idle')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templateImportRequest, setTemplateImportRequest] =
    useState<CanvasTemplateImportRequest | null>(null)

  const selectedOwnedProject = findOwnedProject(
    projectActions.dialogState.projectId,
    ownedProjects
  )
  const selectedDeleteProject =
    projectActions.dialogState.type === 'delete'
      ? ownedProjects.find((project) => project.id === projectActions.dialogState.projectId)
      : undefined
  const isOwner = ownedProjects.some((project) => project.id === currentProjectId)

  const handleTemplateImport = (template: CanvasTemplate): void => {
    setTemplateImportRequest((current) => ({
      requestId: (current?.requestId ?? 0) + 1,
      template,
    }))
  }

  const saveStatusIcon = (() => {
    if (canvasSaveStatus === 'saving') {
      return <LoaderCircle className="size-4 animate-spin text-(--accent-primary)" />
    }

    if (canvasSaveStatus === 'saved') {
      return <CheckCircle2 className="size-4 text-(--state-success)" />
    }

    if (canvasSaveStatus === 'error') {
      return <AlertCircle className="size-4 text-(--state-error)" />
    }

    return <Save className="size-4" />
  })()

  return (
    <>
      <div className="min-h-screen bg-(--bg-base) text-(--text-primary)">
        <nav className="fixed inset-x-0 top-0 z-40 flex h-(--topbar-height) items-center justify-between border-b border-(--border-default) bg-(--bg-overlay) px-3 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-label={projectSidebarOpen ? 'Close project panel' : 'Open project panel'}
              className="shrink-0 cursor-pointer hover:bg-(--accent-primary-muted)"
              onClick={() => setProjectSidebarOpen((current) => !current)}
              size="icon"
              type="button"
              variant="ghost"
            >
              {projectSidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-(--accent-secondary) shadow-(--shadow-glow-cyan)" />
                <p className="truncate text-sm font-semibold text-(--text-primary)">{projectName}</p>
              </div>
              <p className="truncate text-xs text-(--text-muted)">Room {currentRoomId}</p>
            </div>
          </div>

<<<<<<< Updated upstream
          <div className="flex items-center gap-2">
            <Button
              className="gap-2 cursor-pointer"
=======
          <div className="flex items-center gap-1.5">
            {/* Save */}
            <button
              data-tour="save-button"
>>>>>>> Stashed changes
              disabled={!canvasSaveNow || canvasSaveStatus === 'saving'}
              onClick={() => { void canvasSaveNow?.() }}
              title={canvasSaveErrorMessage ?? undefined}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-zinc-900 border border-zinc-800 cursor-pointer transition-all duration-100 ease-[cubic-bezier(0,0,0.58,1)] shadow-[0_3px_0_0_rgba(6,182,212,0.5)] hover:translate-y-[1px] hover:shadow-[0_2px_0_0_rgba(6,182,212,0.5)] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-[0_3px_0_0_rgba(6,182,212,0.3)]"
            >
              {saveStatusIcon}
              <span className="max-w-40 truncate">
                {getSaveButtonLabel(canvasSaveStatus, canvasSaveErrorMessage)}
              </span>
<<<<<<< Updated upstream
            </Button>
            <Button className="gap-2 cursor-pointer" onClick={() => setTemplatesOpen(true)} type="button" variant="outline">
              <LayoutTemplate className="size-4" />
              Templates
            </Button>
            <Button className="gap-2 cursor-pointer" onClick={() => setShareDialogOpen(true)} type="button" variant="outline">
              <Share2 className="size-4" />
              Share
            </Button>
            <Button
              className="gap-2 cursor-pointer"
=======
            </button>

            {/* Templates */}
            <button
              data-tour="templates-button"
              onClick={() => setTemplatesOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-zinc-900 border border-zinc-800 cursor-pointer transition-all duration-100 ease-[cubic-bezier(0,0,0.58,1)] shadow-[0_3px_0_0_rgba(6,182,212,0.5)] hover:translate-y-[1px] hover:shadow-[0_2px_0_0_rgba(6,182,212,0.5)] active:translate-y-[3px] active:shadow-none"
            >
              <LayoutTemplate className="size-3.5" />
              Templates
            </button>

            {/* Share — CreepyButton (eyeball + tilt) */}
            <CreepyButton
              data-tour="share-button"
              onClick={() => setShareDialogOpen(true)}
              type="button"
              className="min-w-0 h-[30px]"
              coverClassName="bg-zinc-900 border border-cyan-500/50 text-zinc-200 text-xs font-medium px-3 py-1.5 gap-1.5 tracking-normal flex items-center justify-center rounded-lg"
            >
              <Share2 className="size-3.5 shrink-0" />
              Share
            </CreepyButton>

            {/* AI Panel */}
            <button
              data-tour="ai-panel-toggle"
>>>>>>> Stashed changes
              onClick={() => setAiSidebarOpen((current) => !current)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-zinc-900 border border-zinc-800 cursor-pointer transition-all duration-100 ease-[cubic-bezier(0,0,0.58,1)] shadow-[0_3px_0_0_rgba(124,109,250,0.55)] hover:translate-y-[1px] hover:shadow-[0_2px_0_0_rgba(124,109,250,0.55)] active:translate-y-[3px] active:shadow-none"
            >
              {aiSidebarOpen ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
              AI Panel
<<<<<<< Updated upstream
            </Button>
=======
            </button>

            <TourHelpButton
              tourId="project"
              userId={userId}
              onStart={tour.start}
            />
>>>>>>> Stashed changes
          </div>
        </nav>

        <main className="pt-(--topbar-height)">
          <div className="flex h-[calc(100dvh-var(--topbar-height))] min-h-0">
            <LiveblocksRoomProvider roomId={currentRoomId}>
              <section className="relative flex min-w-0 flex-1 overflow-hidden bg-(--bg-base)">
                <CollaborativeCanvas
                  projectId={currentProjectId}
                  onSaveErrorMessageChange={setCanvasSaveErrorMessage}
                  onSaveNowChange={(saveNow) => setCanvasSaveNow(() => saveNow)}
                  onSaveStatusChange={setCanvasSaveStatus}
                  templateImportRequest={templateImportRequest}
                />
              </section>

              <AiSidebar
                projectId={currentProjectId}
                projectSpecs={projectSpecs}
                roomId={currentRoomId}
                onOpenChange={setAiSidebarOpen}
                open={aiSidebarOpen}
              />
            </LiveblocksRoomProvider>
          </div>
        </main>

        <ProjectSidebar
          activeProjectId={currentProjectId}
          isOpen={projectSidebarOpen}
          mode="overlay"
          onClose={() => setProjectSidebarOpen(false)}
          onCreateProject={projectActions.openCreateDialog}
          onDeleteProject={(project) => projectActions.openDeleteDialog(project.id, project.name)}
          onOpenProject={(project) => router.push(`/editor/${project.id}`)}
          onRenameProject={(project) => projectActions.openRenameDialog(project.id, project.name)}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
          showCloseButton={true}
        />
      </div>

      <CreateProjectDialog
        isLoading={projectActions.loadingState.isLoading}
        onNameChange={projectActions.setFormName}
        onOpenChange={(open) => {
          if (!open) {
            projectActions.closeDialog()
          }
        }}
        onSubmit={projectActions.submitCreateProject}
        open={projectActions.dialogState.type === 'create'}
        projectName={projectActions.formState.name}
        projectRoomIdPreview={projectActions.formState.roomIdPreview}
        projectSlug={projectActions.formState.slug}
        projectSlugPreview={projectActions.formState.slug}
        slugSpecialCharacters={projectActions.formState.specialCharacters}
      />

      <RenameProjectDialog
        currentProjectName={selectedOwnedProject?.name ?? 'this project'}
        isLoading={projectActions.loadingState.isLoading}
        onNameChange={projectActions.setFormName}
        onOpenChange={(open) => {
          if (!open) {
            projectActions.closeDialog()
          }
        }}
        onSubmit={projectActions.submitRenameProject}
        open={projectActions.dialogState.type === 'rename'}
        projectName={projectActions.formState.name}
        projectSlug={projectActions.formState.slug}
        projectSlugPreview={projectActions.formState.slug}
        slugSpecialCharacters={projectActions.formState.specialCharacters}
      />

      <DeleteProjectDialog
        isLoading={projectActions.loadingState.isLoading}
        onOpenChange={(open) => {
          if (!open) {
            projectActions.closeDialog()
          }
        }}
        onSubmit={projectActions.submitDeleteProject}
        open={projectActions.dialogState.type === 'delete'}
        projectName={selectedDeleteProject?.name ?? 'this project'}
      />

      <ShareDialog
        isOwner={isOwner}
        onOpenChange={setShareDialogOpen}
        open={shareDialogOpen}
        projectId={currentProjectId}
        projectName={projectName}
      />

      <StarterTemplatesModal
        onImport={handleTemplateImport}
        onOpenChange={setTemplatesOpen}
        open={templatesOpen}
      />
    </>
  )
}