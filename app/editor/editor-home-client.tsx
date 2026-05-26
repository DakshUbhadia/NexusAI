'use client'

import { useState } from 'react'

import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EditorNavbar } from '@/components/editor/editor-navbar'
import {
  CreateProjectDialog,
  DeleteProjectDialog,
  RenameProjectDialog,
} from '@/components/editor/project-dialogs'
import { ProjectSidebar } from '@/components/editor/project-sidebar'
import type { EditorProjectLists } from '@/lib/editor-projects'

import { useProjectActions } from '@/hooks/useProjectActions'

interface EditorHomeClientProps extends EditorProjectLists {
  readonly activeProjectId?: string
}

function findProjectById(projectId: string | undefined, projects: readonly { id: string; name: string }[]) {
  if (!projectId) {
    return undefined
  }

  return projects.find((project) => project.id === projectId)
}

export function EditorHomeClient(props: EditorHomeClientProps) {
  const { ownedProjects, sharedProjects, activeProjectId } = props
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const projectActions = useProjectActions({ activeProjectId })

  const selectedOwnedProject = findProjectById(
    projectActions.dialogState.projectId,
    ownedProjects
  )
  const selectedDeleteProject =
    projectActions.dialogState.type === 'delete'
      ? ownedProjects.find((project) => project.id === projectActions.dialogState.projectId)
      : undefined

  return (
    <>
      <EditorNavbar
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
      />

      <ProjectSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCreateProject={projectActions.openCreateDialog}
        onDeleteProject={(project) => projectActions.openDeleteDialog(project.id, project.name)}
        onRenameProject={(project) => projectActions.openRenameDialog(project.id, project.name)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
      />

      <main className="min-h-screen bg-background pt-(--topbar-height) text-foreground">
        <section className="flex min-h-[calc(100vh-var(--topbar-height))] items-center justify-center px-6 py-8">
          <div className="flex max-w-2xl flex-col items-center text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-(--text-primary) md:text-4xl">
              Create a project or open an existing one
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-(--text-secondary) md:text-lg">
              Start a new architecture workspace, or choose a project from the sidebar.
            </p>

            <Button className="mt-8 gap-2" onClick={projectActions.openCreateDialog} size="lg" type="button">
              <Plus className="size-4" />
              New Project
            </Button>
          </div>
        </section>
      </main>

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
    </>
  )
}
