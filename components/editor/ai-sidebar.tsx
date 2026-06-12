'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type BlockquoteHTMLAttributes,
  type ChangeEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from 'react'

import { AnimatePresence, motion, type Variants } from 'framer-motion'
import {
  Bot,
  Download,
  FileText,
  LoaderCircle,
  MessageSquare,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useCreateFeed, useCreateFeedMessage, useFeedMessages, useSelf, useStorage } from '@liveblocks/react'
import { useRealtimeRun } from '@trigger.dev/react-hooks'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

const COLLAB_CHAT_FEED_ID = 'collab-chat-feed'
const DEFAULT_SPEC_GENERATION_ERROR_MESSAGE =
  'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.'

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

type ActiveRunState = {
  readonly runId: string
  readonly publicToken: string
}

type ActiveSpecRunState = {
  readonly runId: string
  readonly publicToken: string
}

type SpecStatusKind = 'idle' | 'running' | 'success' | 'error'

type SpecStatusState = {
  readonly kind: SpecStatusKind
  readonly message: string
}

type SidebarTab = 'architect' | 'team' | 'specs'

type MessageBubbleProps = {
  readonly sender: string
  readonly content: string
  readonly timestampStr: string
  readonly isMe: boolean
}

type SpecListItemProps = {
  readonly spec: ProjectSpecListItem
  readonly onSelect: (spec: ProjectSpecListItem) => void
  readonly onDownload: (id: string) => void
}

type SpecContentDisplayProps = {
  readonly isLoading: boolean
  readonly error: string | null
  readonly content: string
}

type ArchitectTabProps = {
  readonly messages: readonly ChatFeedMessage[]
  readonly isRunActive: boolean
  readonly sharedStatusText: string
  readonly prompt: string
  readonly isComposerBusy: boolean
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>
  readonly onPromptChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  readonly onPromptKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  readonly onSubmit: () => void
  readonly onStarterPrompt: (prompt: string) => void
}

type TeamTabProps = {
  readonly messages: readonly CollabChatMessage[]
  readonly currentSenderName: string
  readonly prompt: string
  readonly isComposerBusy: boolean
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>
  readonly onPromptChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  readonly onPromptKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  readonly onSubmit: () => void
}

type SpecsTabProps = {
  readonly projectSpecs: readonly ProjectSpecListItem[]
  readonly isSpecSubmitting: boolean
  readonly isSpecRunActive: boolean
  readonly specStatus: SpecStatusState | null
  readonly onGenerateSpec: () => void
  readonly onSpecSelect: (spec: ProjectSpecListItem) => void
  readonly onSpecDownload: (id: string) => void
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
  const readMessage = (candidate: unknown, depth: number): string | null => {
    if (depth > 2) {
      return null
    }

    if (typeof candidate === 'string') {
      return candidate.trim().length > 0 ? candidate : null
    }

    if (candidate instanceof Error) {
      return candidate.message.trim().length > 0 ? candidate.message : null
    }

    if (!candidate || typeof candidate !== 'object') {
      return null
    }

    const record = candidate as Record<string, unknown>
    const directMessage = record.message
    if (typeof directMessage === 'string' && directMessage.trim().length > 0) {
      return directMessage
    }

    for (const key of ['error', 'cause', 'details', 'data', 'response'] as const) {
      const nestedMessage = readMessage(record[key], depth + 1)
      if (nestedMessage) {
        return nestedMessage
      }
    }

    return null
  }

  return readMessage(runError, 0)
}

function getSpecGenerationErrorMessage(runError: unknown): string {
  return getRunErrorMessage(runError) ?? DEFAULT_SPEC_GENERATION_ERROR_MESSAGE
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

function formatRelativeDateTime(input?: string): string {
  if (!input) {
    return 'Just now'
  }

  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now'
  }

  return parsed.toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: '2-digit',
  })
}

function getDelta(deltaMode: number, delta: number, elementSize: number): number {
  if (deltaMode === 1) return delta * 16
  if (deltaMode === 2) return delta * elementSize
  return delta
}

function handleSidebarWheel<T extends HTMLElement>(event: ReactWheelEvent<T>) {
  const element = event.currentTarget
  const deltaY = getDelta(event.deltaMode, event.deltaY, element.clientHeight)
  const deltaX = getDelta(event.deltaMode, event.deltaX, element.clientWidth)

  if (deltaY === 0 && deltaX === 0) {
    return
  }

  const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight)
  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth)

  if (deltaY !== 0 && maxScrollTop > 0) {
    const nextTop = Math.max(0, Math.min(maxScrollTop, element.scrollTop + deltaY))
    if (nextTop !== element.scrollTop) {
      element.scrollTop = nextTop
      event.preventDefault()
    }
  }

  if (deltaX !== 0 && maxScrollLeft > 0) {
    const nextLeft = Math.max(0, Math.min(maxScrollLeft, element.scrollLeft + deltaX))
    if (nextLeft !== element.scrollLeft) {
      element.scrollLeft = nextLeft
      event.preventDefault()
    }
  }
}

function getSpecStatusClassName(kind: SpecStatusKind): string {
  if (kind === 'error') return 'border-red-500/30 bg-red-500/10 text-red-300'
  if (kind === 'success') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  return 'border-zinc-800 bg-zinc-900/60 text-zinc-400'
}

async function fetchDesignToken(runId: string): Promise<string> {
  const tokenResponse = await fetch('/api/ai/design/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ runId }),
  })
  const tokenPayload = (await tokenResponse.json().catch(() => null)) as unknown
  if (!tokenResponse.ok) {
    throw new Error(readErrorMessage(tokenPayload, 'Failed to create the run token.'))
  }
  const tokenData = readDataObject(tokenPayload)
  const resolvedToken = typeof tokenData?.token === 'string' ? tokenData.token : null
  if (!resolvedToken) throw new Error('Run token response was invalid.')
  return resolvedToken
}

async function fetchSpecToken(runId: string): Promise<string> {
  const tokenResponse = await fetch('/api/ai/spec/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ runId }),
  })
  const tokenPayload = (await tokenResponse.json().catch(() => null)) as unknown
  if (!tokenResponse.ok) {
    throw new Error(readErrorMessage(tokenPayload, 'Failed to create the spec run token.'))
  }
  const tokenData = readDataObject(tokenPayload)
  const publicToken = typeof tokenData?.token === 'string' ? tokenData.token : null
  if (!publicToken) throw new Error('Spec run token response was invalid.')
  return publicToken
}

const markdownComponents = {
  h1: ({ node, ...props }: HTMLAttributes<HTMLHeadingElement> & { readonly node?: unknown }) => <h1 className="text-lg font-semibold text-indigo-400" {...props} />,
  h2: ({ node, ...props }: HTMLAttributes<HTMLHeadingElement> & { readonly node?: unknown }) => <h2 className="text-base font-semibold text-indigo-400" {...props} />,
  h3: ({ node, ...props }: HTMLAttributes<HTMLHeadingElement> & { readonly node?: unknown }) => <h3 className="text-sm font-semibold text-zinc-100" {...props} />,
  p: ({ node, ...props }: HTMLAttributes<HTMLParagraphElement> & { readonly node?: unknown }) => <p className="text-xs text-zinc-100" {...props} />,
  ul: ({ node, ...props }: HTMLAttributes<HTMLUListElement> & { readonly node?: unknown }) => <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-100" {...props} />,
  ol: ({ node, ...props }: HTMLAttributes<HTMLOListElement> & { readonly node?: unknown }) => <ol className="list-decimal space-y-1 pl-5 text-xs text-zinc-100" {...props} />,
  li: ({ node, ...props }: HTMLAttributes<HTMLLIElement> & { readonly node?: unknown }) => <li className="text-xs text-zinc-100" {...props} />,
  code: ({ node, className, ...props }: HTMLAttributes<HTMLElement> & { readonly node?: unknown }) => <code className={cn("rounded bg-zinc-900 px-1 py-0.5 font-mono text-[11px] text-zinc-100", className)} {...props} />,
  pre: ({ node, ...props }: HTMLAttributes<HTMLPreElement> & { readonly node?: unknown }) => <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-3 font-mono text-[11px] text-zinc-100" {...props} />,
  a: ({ node, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { readonly node?: unknown }) => <a className="text-indigo-400 underline underline-offset-2" {...props} />,
  blockquote: ({ node, ...props }: BlockquoteHTMLAttributes<HTMLQuoteElement> & { readonly node?: unknown }) => <blockquote className="border-l-2 border-indigo-500 pl-3 text-zinc-400" {...props} />,
}

const sidebarVariants: Variants = {
  hidden: {
    width: 0,
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 420,
      damping: 38,
      bounce: 0,
    },
  },
  visible: {
    width: 'min(24rem, calc(100vw - 1.5rem))',
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 420,
      damping: 38,
      bounce: 0,
    },
  },
}

const contentVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.04,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
}

function MessageBubble({ sender, content, timestampStr, isMe }: MessageBubbleProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm',
        isMe
          ? 'ml-auto border border-transparent bg-indigo-500 text-white'
          : 'mr-auto border border-zinc-800 bg-zinc-900/60 text-zinc-100'
      )}
    >
      <div
        className={cn(
          'mb-0.5 flex items-center justify-between gap-2 text-[10px]',
          isMe ? 'text-white/70' : 'text-zinc-500'
        )}
      >
        <span className="truncate">{sender}</span>
        <span>{timestampStr}</span>
      </div>
      <p className="whitespace-pre-wrap">{content}</p>
    </motion.div>
  )
}

function SpecListItem({ spec, onSelect, onDownload }: SpecListItemProps) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-2" key={spec.id}>
      <button
        className="min-w-0 flex-1 cursor-pointer text-left"
        onClick={() => onSelect(spec)}
        type="button"
      >
        <p className="truncate text-xs font-medium text-zinc-100">{spec.filename}</p>
        <p className="mt-0.5 text-[10px] text-zinc-500">{formatSpecCreatedAt(spec.createdAt)}</p>
      </button>
      <Button
        aria-label={`Download ${spec.filename}`}
        className="h-7 w-7 shrink-0 cursor-pointer rounded-xl border-zinc-800 bg-zinc-950/70"
        onClick={() => onDownload(spec.id)}
        size="icon"
        type="button"
        variant="outline"
      >
        <Download className="size-3" />
      </Button>
    </div>
  )
}

function SpecContentDisplay({ isLoading, error, content }: SpecContentDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-xs text-zinc-500">
        <LoaderCircle className="size-4 animate-spin" />
        <span>Loading spec preview...</span>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-red-400">
        {error}
      </div>
    )
  }
  return (
    <div className="space-y-3 text-xs leading-relaxed text-zinc-100">
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  )
}

function ArchitectTab({
  messages,
  isRunActive,
  sharedStatusText,
  prompt,
  isComposerBusy,
  textareaRef,
  onPromptChange,
  onPromptKeyDown,
  onSubmit,
  onStarterPrompt,
}: ArchitectTabProps) {
  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-800/50 bg-zinc-950/40"
      initial="hidden"
      animate="visible"
      variants={contentVariants}
    >
      <div className="shrink-0 border-b border-zinc-900 px-3 py-3">
        <motion.div variants={itemVariants} className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-zinc-100">AI Architect</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Ask for system design, tradeoffs, and implementation direction.
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/70 text-indigo-400">
            <Bot className="size-3.5" />
          </div>
        </motion.div>
      </div>

      <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-3 py-3" onWheel={handleSidebarWheel} style={{ WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 ? (
          <motion.div
            variants={itemVariants}
            className="flex h-full flex-col items-center justify-center text-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 text-indigo-400 shadow-sm">
              <Bot className="size-4" />
            </div>
            <p className="mt-3 text-xs font-semibold text-zinc-100">Start with a system idea</p>
            <p className="mt-1.5 max-w-56 text-[11px] leading-relaxed text-zinc-500">
              Ask Nexus AI to sketch an architecture, compare tradeoffs, or turn a product idea into a system plan.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {starterPrompts.map((starterPrompt) => (
                <motion.button
                  key={starterPrompt}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="cursor-pointer rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300"
                  onClick={() => onStarterPrompt(starterPrompt)}
                  type="button"
                >
                  {starterPrompt}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div className="flex flex-col gap-2.5" variants={contentVariants}>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                sender={message.sender}
                content={message.content}
                timestampStr={formatMessageTime(message.timestamp, message.createdAt)}
                isMe={message.role === 'user'}
              />
            ))}
          </motion.div>
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-900 bg-zinc-950/80 px-3 py-3">
        {isRunActive && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 inline-flex max-w-full items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-400"
          >
            <LoaderCircle className="size-3 animate-spin" />
            <span className="truncate">{sharedStatusText}</span>
          </motion.div>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            className="min-h-15 max-h-30 resize-none rounded-2xl border-zinc-800/70 bg-zinc-900/50 text-xs text-zinc-100 placeholder:text-zinc-600 focus-visible:border-indigo-500/50"
            disabled={isComposerBusy}
            onChange={onPromptChange}
            onKeyDown={onPromptKeyDown}
            placeholder="Ask Nexus AI to design a system..."
            value={prompt}
          />
          <Button
            aria-label="Send prompt"
            className="h-9 w-9 shrink-0 cursor-pointer rounded-2xl bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50"
            disabled={!prompt.trim() || isComposerBusy}
            onClick={onSubmit}
            size="icon"
            type="button"
          >
            {isComposerBusy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function TeamTab({
  messages,
  currentSenderName,
  prompt,
  isComposerBusy,
  textareaRef,
  onPromptChange,
  onPromptKeyDown,
  onSubmit,
}: TeamTabProps) {
  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-800/50 bg-zinc-950/40"
      initial="hidden"
      animate="visible"
      variants={contentVariants}
    >
      <div className="shrink-0 border-b border-zinc-900 px-3 py-3">
        <motion.div variants={itemVariants} className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-zinc-100">Team Chat</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Talk with collaborators in your shared workspace.
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/70 text-indigo-400">
            <MessageSquare className="size-3.5" />
          </div>
        </motion.div>
      </div>

      <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-3 py-3" onWheel={handleSidebarWheel} style={{ WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 ? (
          <motion.div
            variants={itemVariants}
            className="flex h-full flex-col items-center justify-center text-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 text-indigo-400 shadow-sm">
              <Users className="size-4" />
            </div>
            <p className="mt-3 text-xs font-semibold text-zinc-100">No messages yet</p>
            <p className="mt-1.5 max-w-56 text-[11px] leading-relaxed text-zinc-500">
              Start a conversation with your team members currently in this workspace.
            </p>
          </motion.div>
        ) : (
          <motion.div className="flex flex-col gap-2.5" variants={contentVariants}>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                sender={message.sender}
                content={message.content}
                timestampStr={formatRelativeDateTime(message.timestamp)}
                isMe={message.sender === currentSenderName}
              />
            ))}
          </motion.div>
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-900 bg-zinc-950/80 px-3 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            className="min-h-15 max-h-30 resize-none rounded-2xl border-zinc-800/70 bg-zinc-900/50 text-xs text-zinc-100 placeholder:text-zinc-600 focus-visible:border-indigo-500/50"
            disabled={isComposerBusy}
            onChange={onPromptChange}
            onKeyDown={onPromptKeyDown}
            placeholder="Message your team..."
            value={prompt}
          />
          <Button
            aria-label="Send team message"
            className="h-9 w-9 shrink-0 cursor-pointer rounded-2xl bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50"
            disabled={!prompt.trim() || isComposerBusy}
            onClick={onSubmit}
            size="icon"
            type="button"
          >
            {isComposerBusy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function SpecsTab({
  projectSpecs,
  isSpecSubmitting,
  isSpecRunActive,
  specStatus,
  onGenerateSpec,
  onSpecSelect,
  onSpecDownload,
}: SpecsTabProps) {
  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-zinc-800/50 bg-zinc-950/40 p-3"
      initial="hidden"
      animate="visible"
      variants={contentVariants}
    >
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-zinc-100">Specs</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Generate structured specs from your conversation and canvas state.
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/70 text-indigo-400">
          <FileText className="size-3.5" />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Button
          className="w-full cursor-pointer rounded-2xl bg-indigo-500 text-xs text-white hover:bg-indigo-400"
          disabled={isSpecSubmitting || isSpecRunActive}
          onClick={onGenerateSpec}
          type="button"
        >
          {isSpecSubmitting || isSpecRunActive ? <LoaderCircle className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
          Generate Spec
        </Button>
      </motion.div>

      {specStatus && (
        <motion.div
          variants={itemVariants}
          className={cn('rounded-2xl border px-3 py-2 text-[11px]', getSpecStatusClassName(specStatus.kind))}
        >
          {specStatus.message}
        </motion.div>
      )}

      <motion.div
        variants={itemVariants}
        className="min-h-0 flex-1 rounded-2xl border border-zinc-800/50 bg-zinc-900/30"
      >
        {projectSpecs.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 py-8 text-center text-[11px] text-zinc-500">
            No generated specs yet.
          </div>
        ) : (
          <div className="sidebar-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain touch-pan-y" onWheel={handleSidebarWheel} style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex flex-col gap-1.5 p-2">
              {projectSpecs.map((spec) => (
                <SpecListItem key={spec.id} onDownload={onSpecDownload} onSelect={onSpecSelect} spec={spec} />
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export function AiSidebar({ projectId, projectSpecs, roomId, open, onOpenChange }: AiSidebarProps): ReactElement | null {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SidebarTab>('architect')

  const [prompt, setPrompt] = useState('')
  const [chatPrompt, setChatPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isChatSending, setIsChatSending] = useState(false)
  const [isSpecSubmitting, setIsSpecSubmitting] = useState(false)
  const [specStatus, setSpecStatus] = useState<SpecStatusState | null>(null)
  const [selectedSpec, setSelectedSpec] = useState<ProjectSpecListItem | null>(null)
  const [selectedSpecContent, setSelectedSpecContent] = useState<string>('')
  const [isSpecContentLoading, setIsSpecContentLoading] = useState(false)
  const [specContentError, setSpecContentError] = useState<string | null>(null)

  const architectTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const processedRunIdsRef = useRef<Set<string>>(new Set())
  const processedSpecRunIdsRef = useRef<Set<string>>(new Set())

  const [activeRun, setActiveRun] = useState<ActiveRunState | null>(null)
  const [activeSpecRun, setActiveSpecRun] = useState<ActiveSpecRunState | null>(null)

  const createFeed = useCreateFeed()
  const createFeedMessage = useCreateFeedMessage()
  const self = useSelf((current) => current)
  const storageFlow = useStorage((root) => root.flow)

  const collaborationFeedId = useMemo(() => `${COLLAB_CHAT_FEED_ID}:${roomId}`, [roomId])

  const { messages: statusMessages } = useFeedMessages(AI_STATUS_FEED_ID, {
    limit: 1,
  })
  const { messages: architectFeedMessages } = useFeedMessages(AI_CHAT_FEED_ID)
  const { messages: teamFeedMessages } = useFeedMessages(collaborationFeedId)

  const latestFeedStatus = useMemo(() => {
    const latestMessage = statusMessages?.[0]
    return parseAiStatusFeedMessage(latestMessage?.data ?? null)
  }, [statusMessages])

  const architectMessages = useMemo<ChatFeedMessage[]>(() => {
    if (!architectFeedMessages) {
      return []
    }

    return [...architectFeedMessages]
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
  }, [architectFeedMessages])

  const teamMessages = useMemo<CollabChatMessage[]>(() => {
    if (!teamFeedMessages) {
      return []
    }

    return [...teamFeedMessages]
      .sort((first, second) => first.createdAt - second.createdAt)
      .map((message) => {
        const data = message.data as Record<string, unknown> | null
        return {
          id: message.id,
          createdAt: message.createdAt,
          sender: typeof data?.sender === 'string' ? data.sender : 'Anonymous',
          content: typeof data?.content === 'string' ? data.content : '',
          timestamp: typeof data?.timestamp === 'string' ? data.timestamp : new Date(message.createdAt).toISOString(),
        }
      })
  }, [teamFeedMessages])

  const canvasFlowForSpec = useMemo(() => normalizeFlowSnapshot(storageFlow), [storageFlow])

  const { run: realtimeRun, error: realtimeRunError } = useRealtimeRun(activeRun?.runId, {
    accessToken: activeRun?.publicToken,
    enabled: Boolean(activeRun?.runId && activeRun?.publicToken),
  })

  const { run: realtimeSpecRun, error: realtimeSpecRunError } = useRealtimeRun(activeSpecRun?.runId, {
    accessToken: activeSpecRun?.publicToken,
    enabled: Boolean(activeSpecRun?.runId && activeSpecRun?.publicToken),
  })

  const isRunActive = !!activeRun && !realtimeRun?.isCompleted
  const isSpecRunActive = !!activeSpecRun && !realtimeSpecRun?.isCompleted

  const isArchitectComposerBusy = isSending || isRunActive
  const isTeamComposerBusy = isChatSending

  const sharedStatusText = latestFeedStatus?.text ?? 'Nexus AI is working on your design...'

  const currentSenderName = self?.info?.name?.trim() || 'Anonymous'

  const resizeArchitectTextarea = useCallback(() => {
    const textarea = architectTextareaRef.current
    if (!textarea) return
    textarea.style.height = '60px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  const resizeChatTextarea = useCallback(() => {
    const textarea = chatTextareaRef.current
    if (!textarea) return
    textarea.style.height = '60px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  const handleArchitectPromptChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(event.target.value)
      globalThis.requestAnimationFrame(resizeArchitectTextarea)
    },
    [resizeArchitectTextarea]
  )

  const handleChatPromptChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setChatPrompt(event.target.value)
      globalThis.requestAnimationFrame(resizeChatTextarea)
    },
    [resizeChatTextarea]
  )

  const handleStarterPrompt = useCallback(
    (nextPrompt: string) => {
      setPrompt(nextPrompt)
      globalThis.requestAnimationFrame(() => {
        resizeArchitectTextarea()
        architectTextareaRef.current?.focus()
      })
    },
    [resizeArchitectTextarea]
  )

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
    if (!open) return

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    globalThis.document.addEventListener('keydown', handleKeyDown)
    return () => {
      globalThis.document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onOpenChange])

  useEffect(() => {
    let cancelled = false

    async function ensureFeedExists(feedId: string, name: string): Promise<void> {
      try {
        await createFeed(feedId, { metadata: { name } })
      } catch (error) {
        if (!isFeedAlreadyExistsError(error) && !cancelled) {
          console.warn(`Failed to create ${name}.`, error)
        }
      }
    }

    void ensureFeedExists(AI_CHAT_FEED_ID, 'AI Chat')
    void ensureFeedExists(collaborationFeedId, 'Team Chat')

    return () => {
      cancelled = true
    }
  }, [collaborationFeedId, createFeed])

  useEffect(() => {
    if (!selectedSpec) return

    const abortController = new AbortController()
    const previewUrl = buildSpecDownloadUrl(projectId, selectedSpec.id)

    async function loadSpecContent(): Promise<void> {
      try {
        const response = await fetch(previewUrl, { method: 'GET', signal: abortController.signal })

        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as unknown
          const message = readErrorMessage(errorPayload, 'Failed to load spec preview.')
          throw new Error(message)
        }

        const markdown = await response.text()
        setSelectedSpecContent(markdown)
      } catch (error) {
        if (abortController.signal.aborted) return
        const message = error instanceof Error ? error.message : 'Failed to load spec preview.'
        setSpecContentError(message)
      } finally {
        if (!abortController.signal.aborted) {
          setIsSpecContentLoading(false)
        }
      }
    }

    void loadSpecContent()
    return () => { abortController.abort() }
  }, [projectId, selectedSpec])

  useEffect(() => {
    const runId = activeRun?.runId
    if (!runId || realtimeRun?.id !== runId || !realtimeRun?.isCompleted) return
    if (processedRunIdsRef.current.has(runId)) return

    processedRunIdsRef.current.add(runId)
    setActiveRun(null)

    if (realtimeRun.isSuccess) {
      void sendAssistantMessage('Nexus AI finished updating the canvas.')
      return
    }

    const runErrorMessage = getRunErrorMessage(realtimeRun.error)
    const errorSummary = runErrorMessage ? `${runErrorMessage}` : 'Unknown error'
    void sendAssistantMessage(`Design Generation Failed : ${errorSummary}`)
  }, [activeRun, realtimeRun, sendAssistantMessage])

  useEffect(() => {
    const runId = activeRun?.runId
    if (!runId || !realtimeRunError || processedRunIdsRef.current.has(runId)) return
    
    processedRunIdsRef.current.add(runId)
    setActiveRun(null)
    void sendAssistantMessage(`Design Generation Failed : ${realtimeRunError.message}`)
  }, [activeRun, realtimeRunError, sendAssistantMessage])

  useEffect(() => {
    const runId = activeSpecRun?.runId
    if (!runId || realtimeSpecRun?.id !== runId || !realtimeSpecRun?.isCompleted) return
    if (processedSpecRunIdsRef.current.has(runId)) return

    processedSpecRunIdsRef.current.add(runId)
    setActiveSpecRun(null)

    if (realtimeSpecRun.isSuccess) {
      void Promise.resolve().then(() => {
        setSpecStatus({
          kind: 'success',
          message: 'Spec generation completed successfully.',
        })
        router.refresh()
      })
      return
    }

    const runErrorMessage = getSpecGenerationErrorMessage(realtimeSpecRun.error)
    void Promise.resolve().then(() => {
      setSpecStatus({
        kind: 'error',
        message: runErrorMessage,
      })
    })
    console.warn(`Spec generation failed: ${runErrorMessage}`)
  }, [activeSpecRun, realtimeSpecRun, router])

  useEffect(() => {
    const runId = activeSpecRun?.runId
    if (!runId || !realtimeSpecRunError || processedSpecRunIdsRef.current.has(runId)) return
    
    processedSpecRunIdsRef.current.add(runId)
    setActiveSpecRun(null)
    const runErrorMessage = getSpecGenerationErrorMessage(realtimeSpecRunError)
    void Promise.resolve().then(() => {
      setSpecStatus({
        kind: 'error',
        message: runErrorMessage,
      })
    })
    console.warn(`Spec run monitoring failed: ${runErrorMessage}`)
  }, [activeSpecRun, realtimeSpecRunError])

  const handleArchitectSubmit = useCallback(async () => {
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt || isArchitectComposerBusy) return

    setIsSending(true)

    try {
      await createFeedMessage(AI_CHAT_FEED_ID, {
        sender: currentSenderName,
        role: 'user',
        content: trimmedPrompt,
        timestamp: new Date().toISOString(),
      })

      setPrompt('')
      globalThis.requestAnimationFrame(resizeArchitectTextarea)

      const designResponse = await fetch('/api/ai/design', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: trimmedPrompt, roomId, projectId }),
      })

      const designPayload = (await designResponse.json().catch(() => null)) as unknown

      if (!designResponse.ok) {
        throw new Error(readErrorMessage(designPayload, 'Failed to start the design run.'))
      }

      const designData = readDataObject(designPayload)
      const runId = typeof designData?.runId === 'string' ? designData.runId : null
      const responsePublicToken = typeof designData?.publicToken === 'string' ? designData.publicToken : null

      if (!runId) throw new Error('Design run did not return a run ID.')

      const publicToken = responsePublicToken ?? await fetchDesignToken(runId)

      setActiveRun({ runId, publicToken })
    } catch (error) {
      console.error('Failed to submit AI design request.', error)
      const message = error instanceof Error ? error.message : 'Failed to submit AI design request.'
      void sendAssistantMessage(message)
    } finally {
      setIsSending(false)
    }
  }, [
    createFeedMessage,
    currentSenderName,
    isArchitectComposerBusy,
    projectId,
    prompt,
    resizeArchitectTextarea,
    roomId,
    sendAssistantMessage,
  ])

  const handleTeamSubmit = useCallback(async () => {
    const trimmedPrompt = chatPrompt.trim()
    if (!trimmedPrompt || isTeamComposerBusy) return

    setIsChatSending(true)

    try {
      await createFeedMessage(collaborationFeedId, {
        sender: currentSenderName,
        content: trimmedPrompt,
        timestamp: new Date().toISOString(),
      })

      setChatPrompt('')
      globalThis.requestAnimationFrame(resizeChatTextarea)
    } catch (error) {
      console.error('Failed to send team chat message.', error)
    } finally {
      setIsChatSending(false)
    }
  }, [chatPrompt, collaborationFeedId, createFeedMessage, currentSenderName, isTeamComposerBusy, resizeChatTextarea])

  const handleGenerateSpec = useCallback(async () => {
    if (isSpecSubmitting || isSpecRunActive) return

    setIsSpecSubmitting(true)
    setSpecStatus({
      kind: 'running',
      message: 'Spec generation is in progress...',
    })

    try {
      const specResponse = await fetch('/api/ai/spec', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roomId,
          chatHistory: architectMessages.map((message) => ({
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

      if (!runId) throw new Error('Spec run did not return a run ID.')

      const publicToken = await fetchSpecToken(runId)

      setActiveSpecRun({ runId, publicToken })
      setSpecStatus({
        kind: 'running',
        message: 'Spec generation started. Nexus AI is preparing your markdown spec...',
      })
    } catch (error) {
      console.error('Failed to submit spec generation request.', error)
      const message = error instanceof Error ? error.message : DEFAULT_SPEC_GENERATION_ERROR_MESSAGE
      setSpecStatus({
        kind: 'error',
        message,
      })
    } finally {
      setIsSpecSubmitting(false)
    }
  }, [architectMessages, canvasFlowForSpec.edges, canvasFlowForSpec.nodes, isSpecRunActive, isSpecSubmitting, roomId])

  const handleArchitectPromptKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) return
      event.preventDefault()
      void handleArchitectSubmit()
    },
    [handleArchitectSubmit]
  )

  const handleTeamPromptKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) return
      event.preventDefault()
      void handleTeamSubmit()
    },
    [handleTeamSubmit]
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          key="ai-sidebar"
          aria-label="AI Sidebar"
          className="relative flex h-full shrink-0 flex-col overflow-hidden border-l border-zinc-800/50 bg-zinc-950 text-zinc-100 shadow-2xl"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={sidebarVariants}
          style={{ minWidth: 0 }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_42%)]" />

          <div className="relative z-10 flex h-full min-h-0 flex-col">
            <header className="shrink-0 border-b border-zinc-900 bg-zinc-900/20 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400 cursor-default"
                  >
                    <Sparkles className="size-3 text-indigo-400" />
                    <span>Workspace</span>
                  </motion.div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-100">AI Sidebar</h2>
                    <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-xs font-medium text-zinc-400">
                      Live
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">Architect, team chat, and specs in one place.</p>
                </div>

                <Button
                  aria-label="Close sidebar"
                  className="size-8 shrink-0 cursor-pointer rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-0 text-zinc-400 shadow-none transition-all hover:bg-zinc-800/60 hover:text-zinc-200"
                  onClick={() => onOpenChange(false)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
              <Tabs
                className="flex min-h-0 flex-1 flex-col"
                onValueChange={(value) => setActiveTab(value as SidebarTab)}
                value={activeTab}
              >
                <TabsList className="relative grid h-9 w-full shrink-0 grid-cols-3 rounded-full border border-zinc-800/40 bg-zinc-900 p-1">
                  <TabsTrigger
                    className="relative flex items-center justify-center gap-1.5 rounded-full text-xs font-medium text-zinc-400 transition-all duration-200 data-[state=active]:text-zinc-100 cursor-pointer"
                    value="architect"
                  >
                    {activeTab === 'architect' && (
                      <motion.span
                        layoutId="ai-sidebar-active-pill"
                        className="absolute inset-0 rounded-full border border-zinc-700/30 bg-zinc-800/60 shadow-sm"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Sparkles className="relative z-10 size-3" />
                    <span className="relative z-10">AI</span>
                  </TabsTrigger>

                  <TabsTrigger
                    className="relative flex items-center justify-center gap-1.5 rounded-full text-xs font-medium text-zinc-400 transition-all duration-200 data-[state=active]:text-zinc-100 cursor-pointer"
                    value="team"
                  >
                    {activeTab === 'team' && (
                      <motion.span
                        layoutId="ai-sidebar-active-pill"
                        className="absolute inset-0 rounded-full border border-zinc-700/30 bg-zinc-800/60 shadow-sm"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Users className="relative z-10 size-3" />
                    <span className="relative z-10">Team</span>
                  </TabsTrigger>

                  <TabsTrigger
                    className="relative flex items-center justify-center gap-1.5 rounded-full text-xs font-medium text-zinc-400 transition-all duration-200 data-[state=active]:text-zinc-100 cursor-pointer"
                    value="specs"
                  >
                    {activeTab === 'specs' && (
                      <motion.span
                        layoutId="ai-sidebar-active-pill"
                        className="absolute inset-0 rounded-full border border-zinc-700/30 bg-zinc-800/60 shadow-sm"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <FileText className="relative z-10 size-3" />
                    <span className="relative z-10">Specs</span>
                  </TabsTrigger>
                </TabsList>

                <div className="mt-3 flex min-h-0 flex-1">
                  <TabsContent className="mt-0 flex min-h-0 w-full flex-col outline-none" value="architect">
                    <ArchitectTab
                      isComposerBusy={isArchitectComposerBusy}
                      isRunActive={isRunActive}
                      messages={architectMessages}
                      onPromptChange={handleArchitectPromptChange}
                      onPromptKeyDown={handleArchitectPromptKeyDown}
                      onStarterPrompt={handleStarterPrompt}
                      onSubmit={() => { void handleArchitectSubmit() }}
                      prompt={prompt}
                      sharedStatusText={sharedStatusText}
                      textareaRef={architectTextareaRef}
                    />
                  </TabsContent>

                  <TabsContent className="mt-0 flex min-h-0 w-full flex-col outline-none" value="team">
                    <TeamTab
                      currentSenderName={currentSenderName}
                      isComposerBusy={isTeamComposerBusy}
                      messages={teamMessages}
                      onPromptChange={handleChatPromptChange}
                      onPromptKeyDown={handleTeamPromptKeyDown}
                      onSubmit={() => { void handleTeamSubmit() }}
                      prompt={chatPrompt}
                      textareaRef={chatTextareaRef}
                    />
                  </TabsContent>

                  <TabsContent className="mt-0 flex min-h-0 w-full flex-col outline-none" value="specs">
                    <SpecsTab
                      isSpecRunActive={isSpecRunActive}
                      isSpecSubmitting={isSpecSubmitting}
                      onGenerateSpec={() => { void handleGenerateSpec() }}
                      onSpecDownload={handleSpecDownload}
                      onSpecSelect={handleSpecSelect}
                      projectSpecs={projectSpecs}
                      specStatus={specStatus}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          <Dialog
            onOpenChange={(nextOpen) => { if (!nextOpen) handleSpecModalClose() }}
            open={selectedSpec !== null}
          >
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden max-w-[min(720px,calc(100%-2rem))] border border-zinc-800/60 bg-zinc-950 text-zinc-100 sm:max-w-2xl">
              <DialogHeader className="shrink-0">
                <DialogTitle className="truncate text-zinc-100">
                  {selectedSpec?.filename ?? 'Spec Preview'}
                </DialogTitle>
                <DialogDescription className="text-zinc-500">
                  {selectedSpec ? formatSpecCreatedAt(selectedSpec.createdAt) : ''}
                </DialogDescription>
              </DialogHeader>

              <div
                className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-4 touch-pan-y"
                onWheel={handleSidebarWheel}
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <SpecContentDisplay
                  content={selectedSpecContent}
                  error={specContentError}
                  isLoading={isSpecContentLoading}
                />
              </div>

              <DialogFooter className="shrink-0 border-zinc-800 bg-zinc-950">
                <Button
                  className="cursor-pointer"
                  onClick={() => { if (selectedSpec) handleSpecDownload(selectedSpec.id) }}
                  type="button"
                  variant="outline"
                >
                  <Download className="size-4" />
                  Download
                </Button>
                <Button className="cursor-pointer" onClick={handleSpecModalClose} type="button" variant="outline">
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}