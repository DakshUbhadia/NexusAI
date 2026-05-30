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
import { ShareDialog } from '@/components/editor/share-dialog'
import { StarterTemplatesModal } from '@/components/editor/starter-templates-modal'
import { Button } from '@/components/ui/button'
import type { EditorProjectLists } from '@/lib/editor-projects'

import { useProjectActions } from '@/hooks/useProjectActions'
import type { CanvasSaveStatus } from '@/hooks/useCanvasAutosave'
import type { CanvasTemplate, CanvasTemplateImportRequest } from '@/components/editor/starter-templates'

interface WorkspaceShellProps extends EditorProjectLists {
  readonly currentRoomId: string
  readonly projectName: string
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
  const { currentRoomId, projectName, ownedProjects, sharedProjects } = props
  const router = useRouter()
  const projectActions = useProjectActions({ activeProjectId: currentRoomId })
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
  const isOwner = ownedProjects.some((project) => project.id === currentRoomId)
  const handleTemplateImport = (template: CanvasTemplate): void => {
    setTemplateImportRequest((current) => ({
      requestId: (current?.requestId ?? 0) + 1,
      template,
    }))
  }

  return (
    <>
      <div className="min-h-screen bg-(--bg-base) text-(--text-primary)">
        <nav className="fixed inset-x-0 top-0 z-40 flex h-(--topbar-height) items-center justify-between border-b border-(--border-default) bg-(--bg-overlay) px-3 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-label={projectSidebarOpen ? 'Close project panel' : 'Open project panel'}
              className="shrink-0 hover:bg-(--accent-primary-muted)"
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
              className="gap-2"
              disabled={!canvasSaveNow || canvasSaveStatus === 'saving'}
              onClick={() => {
                void canvasSaveNow?.()
              }}
              title={canvasSaveErrorMessage ?? undefined}
              type="button"
              variant="outline"
            >
              {canvasSaveStatus === 'saving' ? (
                <LoaderCircle className="size-4 animate-spin text-(--accent-primary)" />
              ) : canvasSaveStatus === 'saved' ? (
                <CheckCircle2 className="size-4 text-(--state-success)" />
              ) : canvasSaveStatus === 'error' ? (
                <AlertCircle className="size-4 text-(--state-error)" />
              ) : (
                <Save className="size-4" />
              )}
              <span className="max-w-64 truncate">
                {getSaveButtonLabel(canvasSaveStatus, canvasSaveErrorMessage)}
              </span>
            </Button>
            <Button className="gap-2" onClick={() => setTemplatesOpen(true)} type="button" variant="outline">
              <LayoutTemplate className="size-4" />
              Templates
            </Button>
            <Button className="gap-2" onClick={() => setShareDialogOpen(true)} type="button" variant="outline">
              <Share2 className="size-4" />
              Share
            </Button>
            <Button
              className="gap-2"
              onClick={() => setAiSidebarOpen((current) => !current)}
              type="button"
              variant="outline"
            >
              {aiSidebarOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
              AI Panel
            </Button>
          </div>
        </nav>

        <main className="pt-(--topbar-height)">
          <div className="flex h-[calc(100dvh-var(--topbar-height))] min-h-0">
            {projectSidebarOpen ? (
              <ProjectSidebar
                activeProjectId={currentRoomId}
                isOpen={true}
                mode="docked"
                onClose={() => setProjectSidebarOpen(false)}
                onCreateProject={projectActions.openCreateDialog}
                onDeleteProject={(project) => projectActions.openDeleteDialog(project.id, project.name)}
                onOpenProject={(project) => router.push(`/editor/${project.id}`)}
                onRenameProject={(project) => projectActions.openRenameDialog(project.id, project.name)}
                ownedProjects={ownedProjects}
                sharedProjects={sharedProjects}
                showCloseButton={true}
              />
            ) : null}

            <section className="relative flex min-w-0 flex-1 overflow-hidden bg-(--bg-base)">
              <CollaborativeCanvas
                onSaveErrorMessageChange={setCanvasSaveErrorMessage}
                onSaveNowChange={(saveNow) => setCanvasSaveNow(() => saveNow)}
                onSaveStatusChange={setCanvasSaveStatus}
                roomId={currentRoomId}
                templateImportRequest={templateImportRequest}
              />
            </section>
            <AiSidebar onOpenChange={setAiSidebarOpen} open={aiSidebarOpen} />
          </div>
        </main>
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
        projectId={currentRoomId}
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
