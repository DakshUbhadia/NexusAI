'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

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
import { useUser } from '@clerk/nextjs'

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
import { TourOverlay } from '@/components/editor/onboarding/tour-overlay'
import { TourHelpButton } from '@/components/editor/onboarding/tour-help-button'
import { Button } from '@/components/ui/button'
import type { EditorProjectLists } from '@/lib/editor-projects'
import { hasSeenTour, markTourSeen } from '@/lib/onboarding/storage'

import { useProjectActions } from '@/hooks/useProjectActions'
import { useOnboardingTour } from '@/hooks/useOnboardingTour'
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

  const { user } = useUser()
  const userId = user?.id ?? null
  const tour = useOnboardingTour(userId)

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

  // Auto-trigger project tour for first-time workspace visitors
  useEffect(() => {
    if (!userId) return
    if (hasSeenTour('project', userId)) return

    const createdAt = user?.createdAt
    const isOldAccount = createdAt ? (Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000) : false
    
    // If they already have multiple projects or their account is older than 24h, skip the tour
    if (isOldAccount || ownedProjects.length + sharedProjects.length > 1) {
      markTourSeen('project', userId)
      return
    }

    const timer = setTimeout(() => {
      tour.start('project')
    }, 800)

    return () => clearTimeout(timer)
    // Only run on mount or when userId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user?.createdAt, ownedProjects.length, sharedProjects.length])

  // Tour action map — connects step action IDs to workspace state changes
  const tourActions = useMemo<Record<string, () => void>>(() => ({
    'open-project-sidebar': () => setProjectSidebarOpen(true),
    'close-project-sidebar': () => setProjectSidebarOpen(false),
    'open-ai-sidebar': () => setAiSidebarOpen(true),
    'close-ai-sidebar': () => setAiSidebarOpen(false),
  }), [])

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

          <div className="flex items-center gap-2">
            <Button
              className="gap-2 cursor-pointer"
              data-tour="save-button"
              disabled={!canvasSaveNow || canvasSaveStatus === 'saving'}
              onClick={() => {
                void canvasSaveNow?.()
              }}
              title={canvasSaveErrorMessage ?? undefined}
              type="button"
              variant="outline"
            >
              {saveStatusIcon}
              <span className="max-w-64 truncate">
                {getSaveButtonLabel(canvasSaveStatus, canvasSaveErrorMessage)}
              </span>
            </Button>
            <Button className="gap-2 cursor-pointer" data-tour="templates-button" onClick={() => setTemplatesOpen(true)} type="button" variant="outline">
              <LayoutTemplate className="size-4" />
              Templates
            </Button>
            <Button className="gap-2 cursor-pointer" data-tour="share-button" onClick={() => setShareDialogOpen(true)} type="button" variant="outline">
              <Share2 className="size-4" />
              Share
            </Button>
            <Button
              className="gap-2 cursor-pointer"
              data-tour="ai-panel-toggle"
              onClick={() => setAiSidebarOpen((current) => !current)}
              type="button"
              variant="outline"
            >
              {aiSidebarOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
              AI Panel
            </Button>
            <TourHelpButton
              tourId="project"
              userId={userId}
              onStart={tour.start}
            />
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

      {/* Onboarding Tour Overlay */}
      <TourOverlay
        step={tour.currentStep}
        stepIndex={tour.stepIndex}
        totalSteps={tour.totalSteps}
        actions={tourActions}
        onNext={tour.next}
        onBack={tour.back}
        onSkip={tour.skip}
        onFinish={tour.finish}
      />
    </>
  )
}