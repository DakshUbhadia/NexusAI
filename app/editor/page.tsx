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
import {
  ProjectSidebar,
  type ProjectSidebarProject,
} from '@/components/editor/project-sidebar'
import { useProjectDialogs } from '@/hooks/useProjectDialogs'

const initialProjects: ProjectSidebarProject[] = [
  {
    id: 'project-1',
    name: 'Platform Blueprint',
    slug: 'platform-blueprint',
    owned: true,
  },
  {
    id: 'project-2',
    name: 'Realtime Canvas',
    slug: 'realtime-canvas',
    owned: true,
  },
  {
    id: 'project-3',
    name: 'Shared Security Review',
    slug: 'shared-security-review',
    owned: false,
  },
]

export default function EditorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectSidebarProject[]>(initialProjects)
  const projectDialogs = useProjectDialogs()

  const openCreateDialog = () => {
    projectDialogs.openCreateDialog()
  }

  const handleCreateProject = (name: string, slug: string) => {
    projectDialogs.setLoading(true)

    setProjects((currentProjects) => [
      {
        id: `project-${Date.now()}`,
        name,
        slug,
        owned: true,
      },
      ...currentProjects,
    ])

    projectDialogs.setLoading(false)
    projectDialogs.closeDialog()
  }

  const handleRenameProject = (name: string, slug: string) => {
    projectDialogs.setLoading(true)

    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectDialogs.dialogState.projectId) {
          return project
        }

        return {
          ...project,
          name,
          slug,
        }
      })
    )

    projectDialogs.setLoading(false)
    projectDialogs.closeDialog()
  }

  const handleDeleteProject = () => {
    projectDialogs.setLoading(true)

    setProjects((currentProjects) =>
      currentProjects.filter((project) => project.id !== projectDialogs.dialogState.projectId)
    )

    projectDialogs.setLoading(false)
    projectDialogs.closeDialog()
  }

  const selectedRenameProject =
    projectDialogs.dialogState.type === 'rename'
      ? projects.find((project) => project.id === projectDialogs.dialogState.projectId)
      : undefined

  const selectedDeleteProject =
    projectDialogs.dialogState.type === 'delete'
      ? projects.find((project) => project.id === projectDialogs.dialogState.projectId)
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
        onCreateProject={openCreateDialog}
        onDeleteProject={(project) => projectDialogs.openDeleteDialog(project.id, project.name)}
        onRenameProject={(project) => projectDialogs.openRenameDialog(project.id, project.name)}
        projects={projects}
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

            <Button className="mt-8 gap-2" onClick={openCreateDialog} size="lg" type="button">
              <Plus className="size-4" />
              New Project
            </Button>
          </div>
        </section>
      </main>

      <CreateProjectDialog
        isLoading={projectDialogs.loadingState.isLoading}
        onNameChange={projectDialogs.setFormName}
        onOpenChange={(open) => {
          if (!open) {
            projectDialogs.closeDialog()
          }
        }}
        onSubmit={handleCreateProject}
        open={projectDialogs.dialogState.type === 'create'}
        projectName={projectDialogs.formState.name}
        projectSlug={projectDialogs.formState.slug}
        projectSlugPreview={projectDialogs.formState.slugPreview}
        slugSpecialCharacters={projectDialogs.formState.specialCharacters}
      />

      <RenameProjectDialog
        currentProjectName={selectedRenameProject?.name ?? 'this project'}
        isLoading={projectDialogs.loadingState.isLoading}
        onNameChange={projectDialogs.setFormName}
        onOpenChange={(open) => {
          if (!open) {
            projectDialogs.closeDialog()
          }
        }}
        onSubmit={handleRenameProject}
        open={projectDialogs.dialogState.type === 'rename'}
        projectName={projectDialogs.formState.name}
        projectSlug={projectDialogs.formState.slug}
        projectSlugPreview={projectDialogs.formState.slugPreview}
        slugSpecialCharacters={projectDialogs.formState.specialCharacters}
      />

      <DeleteProjectDialog
        isLoading={projectDialogs.loadingState.isLoading}
        onOpenChange={(open) => {
          if (!open) {
            projectDialogs.closeDialog()
          }
        }}
        onSubmit={handleDeleteProject}
        open={projectDialogs.dialogState.type === 'delete'}
        projectName={selectedDeleteProject?.name ?? 'this project'}
      />
    </>
  )
}