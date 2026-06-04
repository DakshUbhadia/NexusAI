'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactElement } from 'react'

import { Bot, Download, FileText, LoaderCircle, Send, Sparkles, X, Users } from 'lucide-react'
import { useCreateFeed, useCreateFeedMessage, useFeedMessages, useSelf, useStorage } from '@liveblocks/react'
import { useRealtimeRun } from '@trigger.dev/react-hooks'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { canvasFlowSchema, type CanvasFlow } from '@/types/canvas'
import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  parseAiChatFeedMessage,
  parseAiStatusFeedMessage,
} from '@/types/tasks'

// New constant for Team Chat Feed
const COLLAB_CHAT_FEED_ID = 'collab-chat-feed'

const starterPrompts = [
  'Design an e-commerce backend',
  'Create a chat app architecture',
  'Build a CI/CD pipeline',
] as const

type AiSidebarProps = {
  readonly projectId: string
  readonly projectSpecs: readonly ProjectSpecListItem[]
  readonly roomId: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

type ProjectSpecListItem = {
  readonly id: string
  readonly createdAt: string
  readonly filename: string
}

type ChatFeedMessage = {
  readonly id: string
  readonly createdAt: number
  readonly role: 'user' | 'assistant'
  readonly sender: string
  readonly content: string
  readonly timestamp: string
}

type CollabChatMessage = {
  readonly id: string
  readonly createdAt: number
  readonly sender: string
  readonly content: string
  readonly timestamp: string
}

function isFeedAlreadyExistsError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return error.message.toLowerCase().includes('already exists')
}

function formatMessageTime(timestamp: string, createdAt: number): string {
  const timestampDate = new Date(timestamp)
  const safeDate = Number.isNaN(timestampDate.getTime()) ? new Date(createdAt) : timestampDate

  return safeDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSpecCreatedAt(createdAt: string): string {
  const parsedDate = new Date(createdAt)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown date'
  }

  return parsedDate.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildSpecDownloadUrl(projectId: string, specId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(specId)}/download`
}

type ActiveRunState = {
  readonly runId: string
  readonly publicToken: string
}

type ActiveSpecRunState = {
  readonly runId: string
  readonly publicToken: string
}

function readErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallbackMessage
  }

  const errorPayload = (payload as { error?: unknown }).error

  if (!errorPayload || typeof errorPayload !== 'object') {
    return fallbackMessage
  }

  const message = (errorPayload as { message?: unknown }).message
  return typeof message === 'string' && message.trim().length > 0 ? message : fallbackMessage
}

function readDataObject(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const data = (payload as { data?: unknown }).data
  if (!data || typeof data !== 'object') {
    return null
  }

  return data as Record<string, unknown>
}

function getRunErrorMessage(runError: unknown): string | null {
  if (!runError || typeof runError !== 'object') {
    return null
  }

  const message = (runError as { message?: unknown }).message
  return typeof message === 'string' && message.trim().length > 0 ? message : null
}

function normalizeFlowSnapshot(candidate: unknown): CanvasFlow {
  const normalizeCollection = (value: unknown): unknown[] => {
    if (Array.isArray(value)) {
      return value
    }

    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>)
    }

    return []
  }

  const record = candidate && typeof candidate === 'object' ? (candidate as Record<string, unknown>) : null
  const parsed = canvasFlowSchema.safeParse({
    nodes: normalizeCollection(record?.nodes),
    edges: normalizeCollection(record?.edges),
  })

  if (!parsed.success) {
    return {
      nodes: [],
      edges: [],
    }
  }

  return parsed.data
}

export function AiSidebar({ projectId, projectSpecs, roomId, open, onOpenChange }: AiSidebarProps): ReactElement {
  const router = useRouter()
  
  // Architect AI Chat State
  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  
  // Team Collab Chat State
  const [collabPrompt, setCollabPrompt] = useState('')
  const [isCollabSending, setIsCollabSending] = useState(false)
  const collabTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Specs State
  const [isSpecSubmitting, setIsSpecSubmitting] = useState(false)
  const [specStatusMessage, setSpecStatusMessage] = useState<string | null>(null)
  const [selectedSpec, setSelectedSpec] = useState<ProjectSpecListItem | null>(null)
  const [selectedSpecContent, setSelectedSpecContent] = useState<string>('')
  const [isSpecContentLoading, setIsSpecContentLoading] = useState(false)
  const [specContentError, setSpecContentError] = useState<string | null>(null)
  
  const processedRunIdsRef = useRef<Set<string>>(new Set())
  const processedSpecRunIdsRef = useRef<Set<string>>(new Set())
  const [activeRun, setActiveRun] = useState<ActiveRunState | null>(null)
  const [activeSpecRun, setActiveSpecRun] = useState<ActiveSpecRunState | null>(null)
  
  const createFeed = useCreateFeed()
  const createFeedMessage = useCreateFeedMessage()
  const self = useSelf((current) => current)
  const storageFlow = useStorage((root) => root.flow)
  
  const { messages: feedMessages } = useFeedMessages(AI_STATUS_FEED_ID, {
    limit: 1,
  })
  const { messages: chatFeedMessages } = useFeedMessages(AI_CHAT_FEED_ID)
  const { messages: collabFeedMessages } = useFeedMessages(COLLAB_CHAT_FEED_ID) // Team chat feed

  const latestFeedStatus = useMemo(() => {
    const latestMessage = feedMessages?.[0]
    return parseAiStatusFeedMessage(latestMessage?.data ?? null)
  }, [feedMessages])

  const chatMessages = useMemo<ChatFeedMessage[]>(() => {
    if (!chatFeedMessages) {
      return []
    }

    return [...chatFeedMessages]
      .sort((first, second) => first.createdAt - second.createdAt)
      .map((message) => {
        const parsed = parseAiChatFeedMessage(message.data)
        if (!parsed) {
          return null
        }

        return {
          id: message.id,
          createdAt: message.createdAt,
          role: parsed.role,
          sender: parsed.sender,
          content: parsed.content,
          timestamp: parsed.timestamp,
        }
      })
      .filter((message): message is ChatFeedMessage => message !== null)
  }, [chatFeedMessages])

  // Parse Collab Chat Messages
  const teamMessages = useMemo<CollabChatMessage[]>(() => {
    if (!collabFeedMessages) {
      return []
    }

    return [...collabFeedMessages]
      .sort((first, second) => first.createdAt - second.createdAt)
      .map((message) => {
        const data = message.data as Record<string, unknown> | undefined
        return {
          id: message.id,
          createdAt: message.createdAt,
          sender: typeof data?.sender === 'string' ? data.sender : 'Unknown',
          content: typeof data?.content === 'string' ? data.content : '',
          timestamp: typeof data?.timestamp === 'string' ? data.timestamp : new Date(message.createdAt).toISOString(),
        }
      })
  }, [collabFeedMessages])

  const canvasFlowForSpec = useMemo(() => normalizeFlowSnapshot(storageFlow), [storageFlow])
  
  const { run: realtimeRun, error: realtimeRunError } = useRealtimeRun(activeRun?.runId, {
    accessToken: activeRun?.publicToken,
    enabled: Boolean(activeRun?.runId && activeRun?.publicToken),
  })
  
  const { run: realtimeSpecRun, error: realtimeSpecRunError } = useRealtimeRun(activeSpecRun?.runId, {
    accessToken: activeSpecRun?.publicToken,
    enabled: Boolean(activeSpecRun?.runId && activeSpecRun?.publicToken),
  })
  
  const isRunActive = activeRun !== null && !(realtimeRun?.isCompleted ?? false)
  const isSpecRunActive = activeSpecRun !== null && !(realtimeSpecRun?.isCompleted ?? false)
  const isComposerBusy = isSending || isRunActive
  const sharedStatusText = latestFeedStatus?.text ?? 'Nexus AI is working on your design...'

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '72px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [])

  const resizeCollabTextarea = useCallback(() => {
    const textarea = collabTextareaRef.current
    if (!textarea) return
    textarea.style.height = '72px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [])

  const handlePromptChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(event.target.value)
      globalThis.requestAnimationFrame(resizeTextarea)
    },
    [resizeTextarea]
  )

  const handleCollabPromptChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setCollabPrompt(event.target.value)
      globalThis.requestAnimationFrame(resizeCollabTextarea)
    },
    [resizeCollabTextarea]
  )

  const handleStarterPrompt = useCallback(
    (nextPrompt: string) => {
      setPrompt(nextPrompt)
      globalThis.requestAnimationFrame(() => {
        resizeTextarea()
        textareaRef.current?.focus()
      })
    },
    [resizeTextarea]
  )

  const currentSenderName = self?.info?.name?.trim() || 'Anonymous'

  const sendAssistantMessage = useCallback(
    async (content: string) => {
      try {
        await createFeedMessage(AI_CHAT_FEED_ID, {
          sender: 'Nexus AI',
          role: 'assistant',
          content,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error('Failed to send ai-chat assistant message.', error)
      }
    },
    [createFeedMessage]
  )

  const handleSpecModalClose = useCallback(() => {
    setSelectedSpec(null)
    setSelectedSpecContent('')
    setSpecContentError(null)
    setIsSpecContentLoading(false)
  }, [])

  const handleSpecSelect = useCallback((spec: ProjectSpecListItem) => {
    setSelectedSpec(spec)
    setSelectedSpecContent('')
    setSpecContentError(null)
    setIsSpecContentLoading(true)
  }, [])

  const handleSpecDownload = useCallback(
    (specId: string) => {
      const downloadUrl = buildSpecDownloadUrl(projectId, specId)
      const anchor = globalThis.document.createElement('a')
      anchor.href = downloadUrl
      anchor.rel = 'noopener'
      globalThis.document.body.append(anchor)
      anchor.click()
      anchor.remove()
    },
    [projectId]
  )

  useEffect(() => {
    let cancelled = false

    async function ensureFeeds(): Promise<void> {
      try {
        await createFeed(AI_CHAT_FEED_ID, {
          metadata: { name: 'AI Chat' },
        })
      } catch (error) {
        if (!isFeedAlreadyExistsError(error) && !cancelled) {
          console.warn('Failed to create ai-chat feed.', error)
        }
      }

      try {
        await createFeed(COLLAB_CHAT_FEED_ID, {
          metadata: { name: 'Team Chat' },
        })
      } catch (error) {
        if (!isFeedAlreadyExistsError(error) && !cancelled) {
          console.warn('Failed to create collab-chat feed.', error)
        }
      }
    }

    void ensureFeeds()

    return () => {
      cancelled = true
    }
  }, [createFeed])

  useEffect(() => {
    if (!selectedSpec) {
      return
    }

    const abortController = new AbortController()
    const previewUrl = buildSpecDownloadUrl(projectId, selectedSpec.id)

    async function loadSpecContent(): Promise<void> {
      try {
        const response = await fetch(previewUrl, {
          method: 'GET',
          signal: abortController.signal,
        })

        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as unknown
          const message = readErrorMessage(errorPayload, 'Failed to load spec preview.')
          throw new Error(message)
        }

        const markdown = await response.text()
        setSelectedSpecContent(markdown)
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        const message = error instanceof Error ? error.message : 'Failed to load spec preview.'
        setSpecContentError(message)
      } finally {
        if (!abortController.signal.aborted) {
          setIsSpecContentLoading(false)
        }
      }
    }

    void loadSpecContent()

    return () => {
      abortController.abort()
    }
  }, [projectId, selectedSpec])

  useEffect(() => {
    if (!activeRun || !realtimeRun || realtimeRun.id !== activeRun.runId || !realtimeRun.isCompleted) {
      return
    }

    if (processedRunIdsRef.current.has(activeRun.runId)) {
      return
    }

    processedRunIdsRef.current.add(activeRun.runId)
    setActiveRun(null)

    if (realtimeRun.isSuccess) {
      void sendAssistantMessage('Nexus AI finished updating the canvas.')
      return
    }

    const runErrorMessage = getRunErrorMessage(realtimeRun.error)
    const errorSummary = runErrorMessage ? ` ${runErrorMessage}` : ''
    void sendAssistantMessage(`Nexus AI could not complete this run.${errorSummary}`)
  }, [activeRun, realtimeRun, sendAssistantMessage])

  useEffect(() => {
    if (!activeRun || !realtimeRunError || processedRunIdsRef.current.has(activeRun.runId)) {
      return
    }

    processedRunIdsRef.current.add(activeRun.runId)
    setActiveRun(null)
    void sendAssistantMessage(`Nexus AI run monitoring failed: ${realtimeRunError.message}`)
  }, [activeRun, realtimeRunError, sendAssistantMessage])

  useEffect(() => {
    if (!activeSpecRun || !realtimeSpecRun || realtimeSpecRun.id !== activeSpecRun.runId || !realtimeSpecRun.isCompleted) {
      return
    }

    if (processedSpecRunIdsRef.current.has(activeSpecRun.runId)) {
      return
    }

    processedSpecRunIdsRef.current.add(activeSpecRun.runId)
    setActiveSpecRun(null)

    if (realtimeSpecRun.isSuccess) {
      router.refresh()
      return
    }

    const runErrorMessage = getRunErrorMessage(realtimeSpecRun.error)
    if (runErrorMessage) {
      console.warn(`Spec generation failed: ${runErrorMessage}`)
    } else {
      console.warn('Spec generation failed.')
    }
  }, [activeSpecRun, realtimeSpecRun, router])

  useEffect(() => {
    if (!activeSpecRun || !realtimeSpecRunError || processedSpecRunIdsRef.current.has(activeSpecRun.runId)) {
      return
    }

    processedSpecRunIdsRef.current.add(activeSpecRun.runId)
    setActiveSpecRun(null)
    console.warn(`Spec run monitoring failed: ${realtimeSpecRunError.message}`)
  }, [activeSpecRun, realtimeSpecRunError])

  const handleAiSubmit = useCallback(async () => {
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt || isComposerBusy) {
      return
    }

    setIsSending(true)

    try {
      await createFeedMessage(AI_CHAT_FEED_ID, {
        sender: currentSenderName,
        role: 'user',
        content: trimmedPrompt,
        timestamp: new Date().toISOString(),
      })

      setPrompt('')
      globalThis.requestAnimationFrame(resizeTextarea)

      const designResponse = await fetch('/api/ai/design', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          roomId,
          projectId,
        }),
      })

      const designPayload = (await designResponse.json().catch(() => null)) as unknown

      if (!designResponse.ok) {
        throw new Error(readErrorMessage(designPayload, 'Failed to start the design run.'))
      }

      const designData = readDataObject(designPayload)
      const runId = typeof designData?.runId === 'string' ? designData.runId : null
      const responsePublicToken = typeof designData?.publicToken === 'string' ? designData.publicToken : null

      if (!runId) {
        throw new Error('Design run did not return a run ID.')
      }

      let publicToken = responsePublicToken

      if (!publicToken) {
        const tokenResponse = await fetch('/api/ai/design/token', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            runId,
          }),
        })

        const tokenPayload = (await tokenResponse.json().catch(() => null)) as unknown

        if (!tokenResponse.ok) {
          throw new Error(readErrorMessage(tokenPayload, 'Failed to create the run token.'))
        }

        const tokenData = readDataObject(tokenPayload)
        const resolvedToken = typeof tokenData?.token === 'string' ? tokenData.token : null

        if (!resolvedToken) {
          throw new Error('Run token response was invalid.')
        }

        publicToken = resolvedToken
      }

      setActiveRun({
        runId,
        publicToken,
      })
    } catch (error) {
      console.error('Failed to submit AI design request.', error)
      const message = error instanceof Error ? error.message : 'Failed to submit AI design request.'
      void sendAssistantMessage(message)
    } finally {
      setIsSending(false)
    }
  }, [createFeedMessage, currentSenderName, isComposerBusy, projectId, prompt, resizeTextarea, roomId, sendAssistantMessage])

  const handleCollabSubmit = useCallback(async () => {
    const trimmedPrompt = collabPrompt.trim()

    if (!trimmedPrompt || isCollabSending) {
      return
    }

    setIsCollabSending(true)

    try {
      await createFeedMessage(COLLAB_CHAT_FEED_ID, {
        sender: currentSenderName,
        content: trimmedPrompt,
        timestamp: new Date().toISOString(),
      })

      setCollabPrompt('')
      globalThis.requestAnimationFrame(resizeCollabTextarea)
    } catch (error) {
      console.error('Failed to send team message.', error)
    } finally {
      setIsCollabSending(false)
    }
  }, [collabPrompt, isCollabSending, createFeedMessage, currentSenderName, resizeCollabTextarea])

  const handleGenerateSpec = useCallback(async () => {
    if (isSpecSubmitting || isSpecRunActive) {
      return
    }

    setIsSpecSubmitting(true)
    setSpecStatusMessage(null)

    try {
      const specResponse = await fetch('/api/ai/spec', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          chatHistory: chatMessages.map((message) => ({
            sender: message.sender,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp,
          })),
          nodes: canvasFlowForSpec.nodes,
          edges: canvasFlowForSpec.edges,
        }),
      })

      const specPayload = (await specResponse.json().catch(() => null)) as unknown

      if (!specResponse.ok) {
        throw new Error(readErrorMessage(specPayload, 'Failed to start spec generation.'))
      }

      const specData = readDataObject(specPayload)
      const runId = typeof specData?.runId === 'string' ? specData.runId : null

      if (!runId) {
        throw new Error('Spec run did not return a run ID.')
      }

      const tokenResponse = await fetch('/api/ai/spec/token', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          runId,
        }),
      })

      const tokenPayload = (await tokenResponse.json().catch(() => null)) as unknown

      if (!tokenResponse.ok) {
        throw new Error(readErrorMessage(tokenPayload, 'Failed to create the spec run token.'))
      }

      const tokenData = readDataObject(tokenPayload)
      const publicToken = typeof tokenData?.token === 'string' ? tokenData.token : null

      if (!publicToken) {
        throw new Error('Spec run token response was invalid.')
      }

      setActiveSpecRun({
        runId,
        publicToken,
      })
      setSpecStatusMessage('Spec generation started. Nexus AI is preparing your markdown spec...')
    } catch (error) {
      console.error('Failed to submit spec generation request.', error)
      const message = error instanceof Error ? error.message : 'Failed to submit spec generation request.'
      setSpecStatusMessage(message)
    } finally {
      setIsSpecSubmitting(false)
    }
  }, [canvasFlowForSpec.edges, canvasFlowForSpec.nodes, chatMessages, isSpecRunActive, isSpecSubmitting, roomId])

  const handlePromptKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) {
        return
      }
      event.preventDefault()
      handleAiSubmit()
    },
    [handleAiSubmit]
  )

  const handleCollabPromptKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) {
        return
      }
      event.preventDefault()
      handleCollabSubmit()
    },
    [handleCollabSubmit]
  )

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        'fixed bottom-3 right-3 top-[calc(var(--topbar-height)+12px)] z-30 flex w-(--panel-width) flex-col overflow-hidden rounded-xl border border-(--border-default) bg-(--bg-overlay) shadow-(--shadow-lg) backdrop-blur-xl transition-transform duration-300 ease-out',
        open ? 'translate-x-0' : 'translate-x-[calc(100%+24px)]'
      )}
    >
      <header className="flex items-center gap-3 border-b border-(--border-default) bg-[linear-gradient(90deg,var(--accent-purple-muted),transparent)] px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--border-default) bg-(--bg-surface)">
          <Bot className="size-4 text-(--accent-primary)" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-(--text-primary)">Workspace Center</p>
          <p className="truncate text-xs text-(--text-muted)">Collaborate with AI & Team</p>
        </div>
        <Button
          aria-label="Close sidebar"
          className="shrink-0 hover:bg-(--accent-primary-muted)"
          onClick={() => onOpenChange(false)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </header>

      <Tabs className="min-h-0 flex-1 gap-0 flex flex-col" defaultValue="architect">
        <div className="border-b border-(--border-default) px-4 py-3">
          <TabsList className="grid h-9 w-full grid-cols-3 rounded-full border border-(--border-default) bg-(--bg-subtle) p-1">
            <TabsTrigger
              className="rounded-full text-xs text-(--text-muted) data-active:bg-(--accent-primary-muted) data-active:text-(--accent-primary) dark:data-active:bg-(--accent-primary-muted) dark:data-active:text-(--accent-primary)"
              value="architect"
            >
              <Sparkles className="size-3.5 mr-1.5" />
              AI
            </TabsTrigger>
            <TabsTrigger
              className="rounded-full text-xs text-(--text-muted) data-active:bg-(--accent-primary-muted) data-active:text-(--accent-primary) dark:data-active:bg-(--accent-primary-muted) dark:data-active:text-(--accent-primary)"
              value="team"
            >
              <Users className="size-3.5 mr-1.5" />
              Team
            </TabsTrigger>
            <TabsTrigger
              className="rounded-full text-xs text-(--text-muted) data-active:bg-(--accent-primary-muted) data-active:text-(--accent-primary) dark:data-active:bg-(--accent-primary-muted) dark:data-active:text-(--accent-primary)"
              value="specs"
            >
              <FileText className="size-3.5 mr-1.5" />
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        {/* AI Architect Tab */}
        <TabsContent className="min-h-0 flex-1 flex-col data-[state=inactive]:hidden data-[state=active]:flex" value="architect">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {chatMessages.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-(--border-default) bg-(--bg-surface-elevated) shadow-(--shadow-md)">
                    <Bot className="size-5 text-(--accent-primary)" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-(--text-primary)">Start with a system idea</p>
                  <p className="mt-2 max-w-64 text-xs leading-relaxed text-(--text-secondary)">
                    Ask Nexus AI to sketch an architecture, compare tradeoffs, or turn a product idea into a system plan.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {starterPrompts.map((starterPrompt) => (
                      <button
                        className="rounded-full border border-(--border-default) bg-(--bg-subtle) px-3 py-1.5 text-xs font-medium text-(--accent-primary) transition-colors hover:border-(--border-accent) hover:bg-(--accent-primary-muted)"
                        key={starterPrompt}
                        onClick={() => handleStarterPrompt(starterPrompt)}
                        type="button"
                      >
                        {starterPrompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {chatMessages.map((message) => (
                    <div
                      className={cn(
                        'max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow-(--shadow-sm)',
                        message.role === 'user'
                          ? 'ml-auto border border-transparent bg-(--state-success) text-(--bg-base)'
                          : 'mr-auto border border-(--border-default) bg-(--bg-surface-elevated) text-(--text-primary)'
                      )}
                      key={message.id}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-(--text-muted)">
                        <span className="truncate">{message.sender}</span>
                        <span>{formatMessageTime(message.timestamp, message.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-(--border-default) bg-(--bg-overlay) p-4">
              {isRunActive ? (
                <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-md border border-(--state-success) bg-(--state-success-muted) px-2.5 py-1 text-xs text-(--state-success)">
                  <LoaderCircle className="size-3 animate-spin" />
                  <span className="truncate">{sharedStatusText}</span>
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <Textarea
                  className="max-h-40 min-h-[72px] resize-none border-(--border-default) bg-(--bg-subtle) text-(--text-primary) placeholder:text-(--text-muted) focus-visible:border-(--border-accent)"
                  disabled={isComposerBusy}
                  onChange={handlePromptChange}
                  onKeyDown={handlePromptKeyDown}
                  placeholder="Ask Nexus AI to design a system..."
                  ref={textareaRef}
                  value={prompt}
                />
                <Button
                  aria-label="Send prompt"
                  className="h-10 w-10 shrink-0 bg-(--state-success) text-(--bg-base) hover:bg-(--state-success) disabled:opacity-50"
                  disabled={!prompt.trim() || isComposerBusy}
                  onClick={() => {
                    void handleAiSubmit()
                  }}
                  size="icon"
                  type="button"
                >
                  {isComposerBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Team Chat Tab */}
        <TabsContent className="min-h-0 flex-1 flex-col data-[state=inactive]:hidden data-[state=active]:flex" value="team">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {teamMessages.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-(--border-default) bg-(--bg-surface-elevated) shadow-(--shadow-md)">
                    <Users className="size-5 text-(--accent-primary)" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-(--text-primary)">No messages yet</p>
                  <p className="mt-2 max-w-64 text-xs leading-relaxed text-(--text-secondary)">
                    Start a conversation with your team members currently in this workspace.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {teamMessages.map((message) => {
                    const isMe = message.sender === currentSenderName
                    return (
                      <div
                        className={cn(
                          'max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow-(--shadow-sm)',
                          isMe
                            ? 'ml-auto border border-transparent bg-(--accent-primary) text-white dark:text-(--bg-base)'
                            : 'mr-auto border border-(--border-default) bg-(--bg-surface-elevated) text-(--text-primary)'
                        )}
                        key={message.id}
                      >
                        <div className={cn("mb-1 flex items-center justify-between gap-2 text-[11px]", isMe ? "text-white/80 dark:text-(--bg-base)/80" : "text-(--text-muted)")}>
                          <span className="truncate">{message.sender}</span>
                          <span>{formatMessageTime(message.timestamp, message.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-(--border-default) bg-(--bg-overlay) p-4">
              <div className="flex items-end gap-2">
                <Textarea
                  className="max-h-40 min-h-[72px] resize-none border-(--border-default) bg-(--bg-subtle) text-(--text-primary) placeholder:text-(--text-muted) focus-visible:border-(--border-accent)"
                  disabled={isCollabSending}
                  onChange={handleCollabPromptChange}
                  onKeyDown={handleCollabPromptKeyDown}
                  placeholder="Message your team..."
                  ref={collabTextareaRef}
                  value={collabPrompt}
                />
                <Button
                  aria-label="Send team message"
                  className="h-10 w-10 shrink-0 bg-(--accent-primary) text-white dark:text-(--bg-base) hover:bg-(--accent-primary-hover) disabled:opacity-50"
                  disabled={!collabPrompt.trim() || isCollabSending}
                  onClick={() => {
                    void handleCollabSubmit()
                  }}
                  size="icon"
                  type="button"
                >
                  {isCollabSending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Specs Tab */}
        <TabsContent className="min-h-0 flex-1 flex-col data-[state=inactive]:hidden data-[state=active]:flex" value="specs">
          <div className="flex h-full min-h-0 flex-col gap-4 px-4 py-4">
            <Button
              className="w-full bg-(--accent-primary) text-white dark:text-(--bg-base) hover:bg-(--accent-primary-hover)"
              disabled={isSpecSubmitting || isSpecRunActive}
              onClick={() => {
                void handleGenerateSpec()
              }}
              type="button"
            >
              {isSpecSubmitting || isSpecRunActive ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              Generate Spec
            </Button>

            {specStatusMessage ? (
              <div className="rounded-md border border-(--border-default) bg-(--bg-subtle) px-3 py-2 text-xs text-(--text-secondary)">
                {specStatusMessage}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 rounded-lg border border-(--border-default) bg-(--bg-surface-elevated)">
              {projectSpecs.length === 0 ? (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-(--text-secondary)">
                  No generated specs yet.
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="flex flex-col gap-2 p-2">
                    {projectSpecs.map((spec) => (
                      <div
                        className="flex items-center gap-2 rounded-md border border-(--border-default) bg-(--bg-subtle) p-2"
                        key={spec.id}
                      >
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => handleSpecSelect(spec)}
                          type="button"
                        >
                          <p className="truncate text-sm font-medium text-(--text-primary)">{spec.filename}</p>
                          <p className="mt-0.5 text-xs text-(--text-secondary)">{formatSpecCreatedAt(spec.createdAt)}</p>
                        </button>
                        <Button
                          aria-label={`Download ${spec.filename}`}
                          className="shrink-0"
                          onClick={() => handleSpecDownload(spec.id)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Download className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleSpecModalClose()
          }
        }}
        open={selectedSpec !== null}
      >
        <DialogContent className="max-w-[min(720px,calc(100%-2rem))] border border-(--border-default) bg-(--bg-surface-elevated) text-(--text-primary) sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate text-(--text-primary)">{selectedSpec?.filename ?? 'Spec Preview'}</DialogTitle>
            <DialogDescription className="text-(--text-secondary)">
              {selectedSpec ? formatSpecCreatedAt(selectedSpec.createdAt) : ''}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60dvh] rounded-md border border-(--border-default) bg-(--bg-surface) p-4">
            {isSpecContentLoading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-(--text-secondary)">
                <LoaderCircle className="size-4 animate-spin" />
                <span>Loading spec preview...</span>
              </div>
            ) : specContentError ? (
              <div className="flex h-full items-center justify-center text-sm text-(--state-error)">{specContentError}</div>
            ) : (
              <div className="space-y-4 text-sm leading-relaxed text-(--text-primary)">
                <ReactMarkdown
                  components={{
                    h1: ({ ...props }) => <h1 className="text-xl font-semibold text-(--accent-primary)" {...props} />,
                    h2: ({ ...props }) => <h2 className="text-lg font-semibold text-(--accent-primary)" {...props} />,
                    h3: ({ ...props }) => <h3 className="text-base font-semibold text-(--text-primary)" {...props} />,
                    p: ({ ...props }) => <p className="text-sm text-(--text-primary)" {...props} />,
                    ul: ({ ...props }) => <ul className="list-disc space-y-1 pl-5 text-sm text-(--text-primary)" {...props} />,
                    ol: ({ ...props }) => <ol className="list-decimal space-y-1 pl-5 text-sm text-(--text-primary)" {...props} />,
                    li: ({ ...props }) => <li className="text-sm text-(--text-primary)" {...props} />,
                    code: ({ ...props }) => (
                      <code className="rounded-sm bg-(--bg-subtle) px-1 py-0.5 font-mono text-xs text-(--text-primary)" {...props} />
                    ),
                    pre: ({ ...props }) => (
                      <pre className="overflow-x-auto rounded-md border border-(--border-default) bg-(--bg-subtle) p-3 font-mono text-xs text-(--text-primary)" {...props} />
                    ),
                    a: ({ ...props }) => <a className="text-(--accent-primary) underline underline-offset-2" {...props} />,
                    blockquote: ({ ...props }) => (
                      <blockquote className="border-l-2 border-(--border-accent) pl-3 text-(--text-secondary)" {...props} />
                    ),
                  }}
                >
                  {selectedSpecContent}
                </ReactMarkdown>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="border-(--border-default) bg-(--bg-overlay)">
            <Button
              onClick={() => {
                if (selectedSpec) {
                  handleSpecDownload(selectedSpec.id)
                }
              }}
              type="button"
              variant="outline"
            >
              <Download className="size-4" />
              Download
            </Button>
            <Button onClick={handleSpecModalClose} type="button" variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}