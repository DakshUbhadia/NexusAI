'use client'

import type { ComponentProps } from 'react'

import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

function getDisplaySlug(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || 'project-slug'
}

interface CreateProjectDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly projectName: string
  readonly projectSlug: string
  readonly projectSlugPreview: string
  readonly onNameChange: (name: string) => void
  readonly isLoading: boolean
  readonly onSubmit: (name: string, slug: string) => void
}

export function CreateProjectDialog(props: CreateProjectDialogProps) {
  const {
    open,
    onOpenChange,
    projectName,
    projectSlug,
    projectSlugPreview,
    onNameChange,
    isLoading,
    onSubmit,
  } = props

  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = (event) => {
    event.preventDefault()

    const trimmedName = projectName.trim()
    if (!trimmedName) {
      return
    }

    onSubmit(trimmedName, projectSlug)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Start a new architecture workspace.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="project-name" className="text-sm font-medium text-(--text-primary)">
              Project name
            </label>
            <Input
              id="project-name"
              autoFocus
              disabled={isLoading}
              placeholder="My architecture workspace"
              value={projectName}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="project-slug" className="text-sm font-medium text-(--text-primary)">
              Live slug preview
            </label>
            <div
              id="project-slug"
              className="rounded-md border border-(--border-color) bg-(--bg-subtle) px-3 py-2 text-sm text-(--text-secondary)"
            >
              {projectSlugPreview || getDisplaySlug(projectName)}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !projectName.trim()}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface RenameProjectDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly currentProjectName: string
  readonly projectName: string
  readonly projectSlug: string
  readonly projectSlugPreview: string
  readonly slugSpecialCharacters: readonly string[]
  readonly onNameChange: (name: string) => void
  readonly isLoading: boolean
  readonly onSubmit: (name: string, slug: string) => void
}

export function RenameProjectDialog(props: RenameProjectDialogProps) {
  const {
    open,
    onOpenChange,
    currentProjectName,
    projectName,
    projectSlug,
    projectSlugPreview,
    slugSpecialCharacters,
    onNameChange,
    isLoading,
    onSubmit,
  } = props

  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = (event) => {
    event.preventDefault()

    const nextName = projectName.trim()
    if (nextName.length === 0) {
      return
    }

    onSubmit(nextName, projectSlug)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Rename Project</DialogTitle>
          <DialogDescription>
            Rename {currentProjectName}.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="rename-name" className="text-sm font-medium text-(--text-primary)">
              Project name
            </label>
            <Input
              id="rename-name"
              autoFocus
              disabled={isLoading}
              value={projectName}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rename-slug" className="text-sm font-medium text-(--text-primary)">
              Live slug preview
            </label>
            <div
              id="rename-slug"
              className="rounded-md border border-(--border-color) bg-(--bg-subtle) px-3 py-2 text-sm text-(--text-secondary)"
            >
              {projectSlugPreview || getDisplaySlug(projectName)}
            </div>
            {slugSpecialCharacters.length > 0 ? (
              <p className="text-xs text-amber-400">
                Special characters detected: {slugSpecialCharacters.join(' ')}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !projectName.trim()}>
              {isLoading ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteProjectDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly projectName: string
  readonly isLoading: boolean
  readonly onSubmit: () => void
}

export function DeleteProjectDialog(props: DeleteProjectDialogProps) {
  const { open, onOpenChange, projectName, isLoading, onSubmit } = props

  const handleSubmit = () => {
    onSubmit()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertCircle className="size-5" />
            Delete Project
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{projectName}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}