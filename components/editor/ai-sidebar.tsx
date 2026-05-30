'use client'

import { useCallback, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactElement } from 'react'

import { Bot, Download, FileText, Send, Sparkles, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const starterPrompts = [
  'Design an e-commerce backend',
  'Create a chat app architecture',
  'Build a CI/CD pipeline',
] as const

type AiSidebarProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

type ChatMessage = {
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly content: string
}

function createMessageId(): string {
  return `message-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function AiSidebar({ open, onOpenChange }: AiSidebarProps): ReactElement {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

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

  const handleSubmit = useCallback(() => {
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt) {
      return
    }

    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: 'user',
        content: trimmedPrompt,
      },
    ])
    setPrompt('')
    globalThis.requestAnimationFrame(resizeTextarea)
  }, [prompt, resizeTextarea])

  const handlePromptKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) {
        return
      }

      event.preventDefault()
      handleSubmit()
    },
    [handleSubmit]
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
          <p className="truncate text-sm font-semibold text-(--text-primary)">AI Workspace</p>
          <p className="truncate text-xs text-(--text-muted)">Collaborate with Nexus AI</p>
        </div>
        <Button
          aria-label="Close AI sidebar"
          className="shrink-0 hover:bg-(--accent-primary-muted)"
          onClick={() => onOpenChange(false)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </header>

      <Tabs className="min-h-0 flex-1 gap-0" defaultValue="architect">
        <div className="border-b border-(--border-default) px-4 py-3">
          <TabsList className="grid h-9 w-full grid-cols-2 rounded-full border border-(--border-default) bg-(--bg-subtle) p-1">
            <TabsTrigger
              className="rounded-full text-xs text-(--text-muted) data-active:bg-(--accent-primary-muted) data-active:text-(--accent-primary) dark:data-active:bg-(--accent-primary-muted) dark:data-active:text-(--accent-primary)"
              value="architect"
            >
              <Sparkles className="size-3.5" />
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              className="rounded-full text-xs text-(--text-muted) data-active:bg-(--accent-primary-muted) data-active:text-(--accent-primary) dark:data-active:bg-(--accent-primary-muted) dark:data-active:text-(--accent-primary)"
              value="specs"
            >
              <FileText className="size-3.5" />
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent className="min-h-0 flex-1 data-[state=inactive]:hidden" value="architect">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
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
                  {messages.map((message) => (
                    <div
                      className={cn(
                        'max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow-(--shadow-sm)',
                        message.role === 'user'
                          ? 'ml-auto border-2 border-(--border-accent) bg-(--accent-primary-muted) text-(--text-primary)'
                          : 'mr-auto border border-(--border-default) bg-(--bg-surface-elevated) text-(--accent-primary)'
                      )}
                      key={message.id}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-(--border-default) bg-(--bg-overlay) p-4">
              <div className="flex items-end gap-2">
                <Textarea
                  className="max-h-40 min-h-[72px] resize-none border-(--border-default) bg-(--bg-subtle) text-(--text-primary) placeholder:text-(--text-muted) focus-visible:border-(--border-accent)"
                  onChange={handlePromptChange}
                  onKeyDown={handlePromptKeyDown}
                  placeholder="Ask Nexus AI to design a system..."
                  ref={textareaRef}
                  value={prompt}
                />
                <Button
                  aria-label="Send prompt"
                  className="h-10 w-10 shrink-0 bg-(--accent-primary) text-(--text-primary) hover:bg-(--accent-primary-hover)"
                  disabled={!prompt.trim()}
                  onClick={handleSubmit}
                  size="icon"
                  type="button"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent className="min-h-0 flex-1 data-[state=inactive]:hidden" value="specs">
          <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-4 py-4">
            <Button className="w-full bg-(--accent-primary) text-(--text-primary) hover:bg-(--accent-primary-hover)" type="button">
              <FileText className="size-4" />
              Generate Spec
            </Button>

            <div className="rounded-lg border border-(--border-default) bg-(--bg-surface-elevated) p-4 shadow-(--shadow-md)">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--border-default) bg-(--bg-subtle)">
                  <FileText className="size-4 text-(--accent-primary)" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-(--text-primary)">Architecture Spec Draft</p>
                  <p className="mt-1 text-xs leading-relaxed text-(--text-secondary)">
                    System blueprint, service boundaries, data flow, and implementation milestones will appear here.
                  </p>
                </div>
              </div>
              <Button className="mt-4 w-full" disabled type="button" variant="outline">
                <Download className="size-4" />
                Download
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  )
}