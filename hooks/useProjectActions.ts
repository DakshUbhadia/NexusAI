'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

export type DialogType = 'create' | 'rename' | 'delete' | null

export interface DialogState {
  type: DialogType
  projectId?: string
  projectName?: string
}

export interface UseProjectActionsOptions {
  readonly activeProjectId?: string
}

export interface UseProjectActionsReturn {
  dialogState: DialogState
  formState: {
    name: string
    slug: string
    roomIdPreview: string
    specialCharacters: string[]
  }
  loadingState: {
    isLoading: boolean
    isRedirecting: boolean
  }
  openCreateDialog: () => void
  openRenameDialog: (projectId: string, projectName: string) => void
  openDeleteDialog: (projectId: string, projectName: string) => void
  closeDialog: () => void
  setFormName: (name: string) => void
  submitCreateProject: (name: string) => Promise<void>
  submitRenameProject: (name: string) => Promise<void>
  submitDeleteProject: () => Promise<void>
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function generateShortSuffix(): string {
  return Math.random().toString(36).slice(2, 7)
}

function buildRoomIdPreview(name: string, suffix: string): string {
  const base = slugify(name) || 'project'

  return suffix ? `${base}-${suffix}` : base
}

function getSpecialCharacters(name: string): string[] {
  const matches = name.match(/[^\w\s-]/g)

  if (!matches) {
    return []
  }

  return Array.from(new Set(matches))
}

export function useProjectActions(options: UseProjectActionsOptions = {}): UseProjectActionsReturn {
  const { activeProjectId } = options
  const router = useRouter()
  const [dialogState, setDialogState] = useState<DialogState>({ type: null })
  const [formState, setFormState] = useState({
    name: '',
    slug: '',
    roomIdPreview: '',
    specialCharacters: [] as string[],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [roomIdSuffix, setRoomIdSuffix] = useState('')

  const setFormName = (name: string) => {
    const trimmedName = name.trim()

    setFormState({
      name,
      slug: slugify(trimmedName),
      roomIdPreview: buildRoomIdPreview(trimmedName, roomIdSuffix),
      specialCharacters: getSpecialCharacters(trimmedName),
    })
  }

  const resetForm = () => {
    setFormState({ name: '', slug: '', roomIdPreview: '', specialCharacters: [] })
    setRoomIdSuffix('')
    setIsLoading(false)
  }

  const openCreateDialog = () => {
    const suffix = generateShortSuffix()

    setRoomIdSuffix(suffix)
    setDialogState({ type: 'create' })
    setFormState({
      name: '',
      slug: '',
      roomIdPreview: buildRoomIdPreview('', suffix),
      specialCharacters: [],
    })
  }

  const openRenameDialog = (projectId: string, projectName: string) => {
    setRoomIdSuffix('')
    setDialogState({ type: 'rename', projectId, projectName })
    setFormState({
      name: projectName,
      slug: slugify(projectName),
      roomIdPreview: slugify(projectName),
      specialCharacters: getSpecialCharacters(projectName),
    })
  }

  const openDeleteDialog = (projectId: string, projectName: string) => {
    setRoomIdSuffix('')
    setDialogState({ type: 'delete', projectId, projectName })
  }

  const closeDialog = () => {
    setDialogState({ type: null })
    resetForm()
  }

  const submitCreateProject = async (name: string) => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
      }

      const json = await response.json()
      const projectId: string = json?.data?.id ?? json?.id

      if (!projectId) {
        throw new Error('Server did not return a project ID.')
      }

      closeDialog()
      setIsRedirecting(true)
      router.push(`/editor/${encodeURIComponent(projectId)}`)
    } catch (error) {
      setIsLoading(false)
      throw error
    }
  }

  const submitRenameProject = async (name: string) => {
    const trimmedName = name.trim()

    if (!trimmedName || dialogState.type !== 'rename' || !dialogState.projectId) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/projects/${dialogState.projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (!response.ok) {
        throw new Error('Failed to rename project')
      }

      closeDialog()
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  const submitDeleteProject = async () => {
    if (dialogState.type !== 'delete' || !dialogState.projectId) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/projects/${dialogState.projectId}`, {
        method: 'DELETE',
      })

      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete project')
      }

      const isActiveWorkspace = dialogState.projectId === activeProjectId
      closeDialog()

      if (isActiveWorkspace) {
        router.push('/editor')
        return
      }

      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return {
    dialogState,
    formState,
    loadingState: { isLoading, isRedirecting },
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    setFormName,
    submitCreateProject,
    submitRenameProject,
    submitDeleteProject,
  }
}
