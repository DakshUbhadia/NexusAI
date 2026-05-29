'use client'

import { useState } from 'react'

import { UserButton } from '@clerk/nextjs'
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  LayoutTemplate,
  Share2,
  Sparkles,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import {
  CreateProjectDialog,
  DeleteProjectDialog,
  RenameProjectDialog,
} from '@/components/editor/project-dialogs'
import { CollaborativeCanvas } from '@/components/editor/canvas/collaborative-canvas'
import { ProjectSidebar } from '@/components/editor/project-sidebar'
import { ShareDialog } from '@/components/editor/share-dialog'
import { StarterTemplatesModal } from '@/components/editor/starter-templates-modal'
import { Button } from '@/components/ui/button'
import type { EditorProjectLists } from '@/lib/editor-projects'
import { cn } from '@/lib/utils'

import { useProjectActions } from '@/hooks/useProjectActions'
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

export function WorkspaceShell(props: WorkspaceShellProps) {
  const { currentRoomId, projectName, ownedProjects, sharedProjects } = props
  const router = useRouter()
  const projectActions = useProjectActions({ activeProjectId: currentRoomId })
  const [projectSidebarOpen, setProjectSidebarOpen] = useState(false)
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false)
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
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-8 w-8',
                  userButtonPopoverCard: 'border border-(--border-default)',
                },
              }}
            />
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
                roomId={currentRoomId}
                templateImportRequest={templateImportRequest}
              />
            </section>

            <aside
              className={cn(
                'h-full w-(--panel-width) shrink-0 border-l border-(--border-default) bg-(--bg-overlay) backdrop-blur-xl',
                aiSidebarOpen ? 'block' : 'hidden'
              )}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-(--border-default) bg-[linear-gradient(90deg,var(--accent-purple-muted),transparent)] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-(--text-primary)">AI Copilot</p>
                    <p className="text-xs text-(--text-muted)">Placeholder panel</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-(--border-default) bg-(--bg-surface)">
                    <Sparkles className="size-4 text-(--accent-primary)" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-4 px-4 py-4">
                  <div className="rounded-lg border border-(--border-default) bg-(--bg-surface) p-4 shadow-(--shadow-md)">
                    <p className="text-sm font-semibold text-(--text-primary)">Chat surface pending</p>
                    <p className="mt-2 text-xs leading-relaxed text-(--text-secondary)">
                      The toggle is wired. Messaging and generation are intentionally out of scope here.
                    </p>
                  </div>
                  <div className="rounded-lg border border-(--border-default) bg-(--bg-base) p-4">
                    <p className="text-xs font-semibold tracking-[0.18em] text-(--text-muted)">FUTURE HOOKS</p>
                    <p className="mt-2 text-xs leading-relaxed text-(--text-secondary)">
                      Prompt composer, run status, and architecture guidance will attach to this sidebar.
                    </p>
                  </div>
                  <div className="mt-auto rounded-lg border border-(--border-default) bg-(--bg-surface-elevated) p-3">
                    <p className="text-xs text-(--text-muted)">No active run</p>
                    <div className="mt-3 h-1.5 rounded-full bg-(--bg-subtle)">
                      <div className="h-full w-1/3 rounded-full bg-(--accent-secondary)" />
                    </div>
                  </div>
                </div>
              </div>
            </aside>
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
