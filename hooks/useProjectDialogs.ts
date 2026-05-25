'use client'

import { useState } from 'react'

export type DialogType = 'create' | 'rename' | 'delete' | null

export interface DialogState {
  type: DialogType
  projectId?: string
  projectName?: string
}

export interface UseProjectDialogsReturn {
  dialogState: DialogState
  formState: {
    name: string
    slug: string
    slugPreview: string
    specialCharacters: string[]
  }
  loadingState: {
    isLoading: boolean
  }
  openCreateDialog: () => void
  openRenameDialog: (projectId: string, projectName: string) => void
  openDeleteDialog: (projectId: string, projectName: string) => void
  closeDialog: () => void
  setFormName: (name: string) => void
  setLoading: (loading: boolean) => void
  resetForm: () => void
}

export function useProjectDialogs(): UseProjectDialogsReturn {
  const [dialogState, setDialogState] = useState<DialogState>({ type: null })
  const [formState, setFormState] = useState({
    name: '',
    slug: '',
    slugPreview: '',
    specialCharacters: [] as string[],
  })
  const [isLoading, setIsLoading] = useState(false)

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const generateSlugPreview = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const getSpecialCharacters = (name: string): string[] => {
    const matches = name.match(/[^\w\s-]/g)
    if (!matches) {
      return []
    }

    return Array.from(new Set(matches))
  }

  const buildFormState = (name: string) => {
    const trimmedName = name.trim()

    return {
      name,
      slug: generateSlug(trimmedName),
      slugPreview: generateSlugPreview(trimmedName),
      specialCharacters: getSpecialCharacters(trimmedName),
    }
  }

  const openCreateDialog = () => {
    setDialogState({ type: 'create' })
    setFormState({ name: '', slug: '', slugPreview: '', specialCharacters: [] })
  }

  const openRenameDialog = (projectId: string, projectName: string) => {
    setDialogState({ type: 'rename', projectId, projectName })
    setFormState(buildFormState(projectName))
  }

  const openDeleteDialog = (projectId: string, projectName: string) => {
    setDialogState({ type: 'delete', projectId, projectName })
  }

  const closeDialog = () => {
    setDialogState({ type: null })
    resetForm()
  }

  const setFormName = (name: string) => {
    setFormState(buildFormState(name))
  }

  const setLoading = (loading: boolean) => {
    setIsLoading(loading)
  }

  const resetForm = () => {
    setFormState({ name: '', slug: '', slugPreview: '', specialCharacters: [] })
    setIsLoading(false)
  }

  return {
    dialogState,
    formState,
    loadingState: { isLoading },
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    setFormName,
    setLoading,
    resetForm,
  }
}
