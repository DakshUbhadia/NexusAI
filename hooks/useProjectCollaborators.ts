'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  CollaboratorInviteData,
  CollaboratorListData,
  CollaboratorProfile,
  CollaboratorRemoveData,
  CollaboratorViewerRole,
} from '@/types/collaborators'

interface UseProjectCollaboratorsOptions {
  readonly projectId: string
  readonly enabled: boolean
}

interface UseProjectCollaboratorsReturn {
  readonly collaborators: CollaboratorProfile[]
  readonly viewerRole: CollaboratorViewerRole | null
  readonly isLoading: boolean
  readonly isMutating: boolean
  readonly error: string | null
  readonly refresh: () => Promise<void>
  readonly invite: (email: string) => Promise<void>
  readonly remove: (email: string) => Promise<void>
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  if ('error' in payload && typeof payload.error === 'object' && payload.error !== null) {
    const errorMessage = (payload.error as { message?: unknown }).message
    if (typeof errorMessage === 'string') {
      return errorMessage
    }
  }

  return fallback
}

async function parseApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, fallback))
  }

  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    throw new Error(fallback)
  }

  return (payload as { data: T }).data
}

export function useProjectCollaborators(
  options: UseProjectCollaboratorsOptions
): UseProjectCollaboratorsReturn {
  const { projectId, enabled } = options
  const [collaborators, setCollaborators] = useState<CollaboratorProfile[]>([])
  const [viewerRole, setViewerRole] = useState<CollaboratorViewerRole | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const endpoint = useMemo(() => `/api/projects/${projectId}/collaborators`, [projectId])

  const refresh = useCallback(async () => {
    if (!projectId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(endpoint)
      const data = await parseApiResponse<CollaboratorListData>(
        response,
        'Failed to load collaborators.'
      )

      setCollaborators(data.collaborators)
      setViewerRole(data.viewerRole)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load collaborators.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, projectId])

  const invite = useCallback(
    async (email: string) => {
      if (!projectId) {
        return
      }

      setIsMutating(true)
      setError(null)

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        await parseApiResponse<CollaboratorInviteData>(response, 'Failed to invite collaborator.')
        await refresh()
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to invite collaborator.'
        setError(message)
      } finally {
        setIsMutating(false)
      }
    },
    [endpoint, projectId, refresh]
  )

  const remove = useCallback(
    async (email: string) => {
      if (!projectId) {
        return
      }

      setIsMutating(true)
      setError(null)

      try {
        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        await parseApiResponse<CollaboratorRemoveData>(response, 'Failed to remove collaborator.')
        await refresh()
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to remove collaborator.'
        setError(message)
      } finally {
        setIsMutating(false)
      }
    },
    [endpoint, projectId, refresh]
  )

  useEffect(() => {
    if (!enabled) {
      return
    }

    const timeoutId = globalThis.setTimeout(() => {
      void refresh()
    }, 0)

    return () => {
      globalThis.clearTimeout(timeoutId)
    }
  }, [enabled, refresh])

  return {
    collaborators,
    viewerRole,
    isLoading,
    isMutating,
    error,
    refresh,
    invite,
    remove,
  }
}
