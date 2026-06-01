'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { CanvasEdge, CanvasFlow, CanvasNode } from '@/types/canvas'

export type CanvasSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type UseCanvasAutosaveOptions = {
  readonly projectId: string
  readonly nodes: readonly CanvasNode[]
  readonly edges: readonly CanvasEdge[]
  readonly enabled: boolean
  readonly debounceMs?: number
}

type UseCanvasAutosaveResult = {
  readonly errorMessage: string | null
  readonly saveNow: () => Promise<void>
  readonly status: CanvasSaveStatus
}

type CanvasSnapshot = {
  readonly flow: CanvasFlow
  readonly serialized: string
}

const DEFAULT_DEBOUNCE_MS = 1500

type ApiErrorPayload = {
  readonly error?: {
    readonly message?: unknown
    readonly code?: unknown
  }
}

function createSnapshot(nodes: readonly CanvasNode[], edges: readonly CanvasEdge[]): CanvasSnapshot {
  const safeNodes = Array.isArray(nodes) ? nodes : []
  const safeEdges = Array.isArray(edges) ? edges : []

  const flow: CanvasFlow = {
    nodes: [...safeNodes],
    edges: [...safeEdges],
  }

  return {
    flow,
    serialized: JSON.stringify(flow),
  }
}

function getDraftStorageKey(projectId: string): string {
  return `nexus-ai:canvas-draft:${projectId}`
}

function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const { error } = payload as ApiErrorPayload
  if (!error || typeof error !== 'object') {
    return fallback
  }

  return typeof error.message === 'string' ? error.message : fallback
}

async function readSaveErrorMessage(response: Response): Promise<string> {
  const fallback = `Canvas save failed with status ${response.status}.`
  const payload = (await response.json().catch(() => null)) as unknown
  return getApiErrorMessage(payload, fallback)
}

function persistLocalDraft(projectId: string, snapshot: CanvasSnapshot): void {
  try {
    globalThis.localStorage?.setItem(getDraftStorageKey(projectId), snapshot.serialized)
  } catch (error) {
    console.warn('Canvas draft could not be written to local storage.', error)
  }
}

function clearLocalDraft(projectId: string): void {
  try {
    globalThis.localStorage?.removeItem(getDraftStorageKey(projectId))
  } catch (error) {
    console.warn('Canvas draft could not be cleared from local storage.', error)
  }
}

export function useCanvasAutosave({
  debounceMs = DEFAULT_DEBOUNCE_MS,
  edges,
  enabled,
  nodes,
  projectId,
}: UseCanvasAutosaveOptions): UseCanvasAutosaveResult {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<CanvasSaveStatus>('idle')
  const latestSnapshotRef = useRef<CanvasSnapshot>(createSnapshot(nodes, edges))
  const persistSnapshotRef = useRef<() => Promise<void>>(async () => {})
  const saveTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)
  const inFlightSaveRef = useRef<Promise<void> | null>(null)
  const lastSavedSerializedRef = useRef<string | null>(null)
  const queuedSaveRef = useRef(false)

  const clearPendingSave = useCallback((): void => {
    if (saveTimeoutRef.current === null) {
      return
    }

    globalThis.clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = null
  }, [])

  const saveNow = useCallback(async (): Promise<void> => {
    clearPendingSave()
    await persistSnapshotRef.current()
  }, [clearPendingSave])

  useEffect(() => {
    latestSnapshotRef.current = createSnapshot(nodes, edges)
  }, [edges, nodes])

  useEffect(() => {
    persistSnapshotRef.current = async (): Promise<void> => {
      if (!enabled) {
        return
      }

      const snapshot = latestSnapshotRef.current
      if (snapshot.serialized === lastSavedSerializedRef.current) {
        return
      }

      if (inFlightSaveRef.current) {
        queuedSaveRef.current = true
        return inFlightSaveRef.current
      }

      const request = (async (): Promise<void> => {
        setStatus('saving')

        try {
          const response = await fetch(`/api/projects/${projectId}/canvas`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              canvas: snapshot.flow,
            }),
          })

          if (!response.ok) {
            const message = await readSaveErrorMessage(response)
            setErrorMessage(message)
            persistLocalDraft(projectId, snapshot)
            setStatus('error')
            return
          }

          lastSavedSerializedRef.current = snapshot.serialized
          clearLocalDraft(projectId)
          setErrorMessage(null)
          setStatus('saved')
        } catch (error) {
          console.warn('Canvas autosave request failed.', error)
          setStatus('error')
          persistLocalDraft(projectId, snapshot)
        } finally {
          inFlightSaveRef.current = null

          if (!queuedSaveRef.current) {
            return
          }

          queuedSaveRef.current = false
          void persistSnapshotRef.current()
        }
      })()

      inFlightSaveRef.current = request
      return request
    }
  }, [enabled, projectId])

  useEffect(() => {
    if (!enabled) {
      clearPendingSave()
      queuedSaveRef.current = false
      return
    }

    if (latestSnapshotRef.current.serialized === lastSavedSerializedRef.current) {
      return
    }

    clearPendingSave()
    saveTimeoutRef.current = globalThis.setTimeout(() => {
      saveTimeoutRef.current = null
      void persistSnapshotRef.current()
    }, debounceMs)

    return clearPendingSave
  }, [clearPendingSave, debounceMs, enabled, edges, nodes])

  useEffect(() => clearPendingSave, [clearPendingSave])

  return {
    errorMessage,
    saveNow,
    status,
  }
}
