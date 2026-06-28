'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { Loader2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

import { Button } from '@/components/ui/button'
import { EditorNavbar } from '@/components/editor/editor-navbar'
import {
  CreateProjectDialog,
  DeleteProjectDialog,
  RenameProjectDialog,
} from '@/components/editor/project-dialogs'
import { ProjectSidebar } from '@/components/editor/project-sidebar'
import { TourOverlay } from '@/components/editor/onboarding/tour-overlay'
import { TourHelpButton } from '@/components/editor/onboarding/tour-help-button'
import type { EditorProjectLists } from '@/lib/editor-projects'
import { hasSeenTour, markTourSeen } from '@/lib/onboarding/storage'

import { useProjectActions } from '@/hooks/useProjectActions'
import { useOnboardingTour } from '@/hooks/useOnboardingTour'

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
  const router = useRouter()
  const { user } = useUser()
  const userId = user?.id ?? null
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const projectActions = useProjectActions({ activeProjectId })
  const tour = useOnboardingTour(userId)

  const selectedOwnedProject = findProjectById(
    projectActions.dialogState.projectId,
    ownedProjects
  )
  const selectedDeleteProject =
    projectActions.dialogState.type === 'delete'
      ? ownedProjects.find((project) => project.id === projectActions.dialogState.projectId)
      : undefined

  // Auto-trigger home tour for first-time users with no projects
  useEffect(() => {
    if (!userId) return
    if (hasSeenTour('home', userId)) return

    if (ownedProjects.length > 0 || sharedProjects.length > 0) {
      markTourSeen('home', userId)
      markTourSeen('project', userId)
      return
    }

    // Small delay so page paints first
    const timer = setTimeout(() => {
      tour.start('home')
    }, 600)

    return () => clearTimeout(timer)
    // Only run on mount or when userId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ownedProjects.length, sharedProjects.length])

  const tourActions = useMemo<Record<string, () => void>>(() => ({}), [])

  const helpButton = useMemo(
    () => (
      <TourHelpButton
        tourId="home"
        userId={userId}
        onStart={tour.start}
      />
    ),
    [userId, tour.start],
  )

  return (
    <>
      <EditorNavbar
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
        helpButton={helpButton}
      />

      <ProjectSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCreateProject={projectActions.openCreateDialog}
        onDeleteProject={(project) => projectActions.openDeleteDialog(project.id, project.name)}
        onOpenProject={(project) => router.push(`/editor/${project.id}`)}
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

            <Button
              className="mt-8 gap-2"
              data-tour="new-project-cta"
              onClick={projectActions.openCreateDialog}
              size="lg"
              type="button"
            >
              <Plus className="size-4" />
              New Project
            </Button>
          </div>
        </section>
      </main>

      {projectActions.loadingState.isRedirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium text-zinc-400">Preparing your workspace...</p>
          </div>
        </div>
      )}

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
