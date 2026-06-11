'use client'

import type { ComponentProps } from 'react'
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, FolderPlus, Hash, Loader2, PencilLine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// --- Utilities ---

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

// --- Shared sub-components ---

function CharCount({ value, max = 60 }: Readonly<{ value: string; max?: number }>) {
  const remaining = max - value.length
  const isNear = remaining <= 10
  const isOver = remaining < 0

  let colorClass = 'text-zinc-600'
  if (isOver) colorClass = 'text-red-400'
  else if (isNear) colorClass = 'text-amber-400'

  return (
    <motion.span
      key={remaining}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn('text-[10px] tabular-nums font-medium transition-colors', colorClass)}
    >
      {remaining}
    </motion.span>
  )
}

interface SlugPreviewProps {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly specialChars?: readonly string[]
}

function SlugPreview({ id, label, value, specialChars }: SlugPreviewProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400"
        >
          <Hash className="size-3 text-zinc-600" aria-hidden="true" />
          {label}
        </label>
      </div>

      <div
        id={id}
        aria-readonly="true"
        className="flex min-h-9 items-center rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2"
      >
        <code className="flex-1 truncate font-mono text-xs text-zinc-500 tracking-wide">
          {value}
        </code>
      </div>

      <AnimatePresence>
        {specialChars && specialChars.length > 0 && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            role="alert"
            className="flex items-center gap-1.5 overflow-hidden text-xs text-amber-400"
          >
            <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
            Special chars removed: {specialChars.join(' ')}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function FieldLabel({ htmlFor, children }: Readonly<{ htmlFor: string; children: React.ReactNode }>) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-zinc-400">
      {children}
    </label>
  )
}

interface ActionButtonProps {
  readonly isLoading: boolean
  readonly disabled?: boolean
  readonly label: string
  readonly loadingLabel: string
  readonly variant?: 'default' | 'destructive'
  readonly type?: 'button' | 'submit'
  readonly onClick?: () => void
}

function ActionButton({
  isLoading,
  disabled,
  label,
  loadingLabel,
  variant = 'default',
  type = 'submit',
  onClick,
}: ActionButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      disabled={disabled ?? isLoading}
      onClick={onClick}
      className={cn(
        'relative min-w-22 gap-2 text-xs font-semibold transition-all',
        variant === 'default' && 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500/50',
        variant === 'destructive' && 'bg-red-600/90 text-white hover:bg-red-500 focus-visible:ring-red-500/50'
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
          >
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            {loadingLabel}
          </motion.span>
        ) : (
          <motion.span
            key="label"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  )
}

// ─────────────────────────────────────────────────────────────
// CREATE PROJECT DIALOG
// ─────────────────────────────────────────────────────────────

interface CreateProjectDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly projectName: string
  readonly projectSlug: string
  readonly projectSlugPreview: string
  readonly projectRoomIdPreview?: string
  readonly slugSpecialCharacters?: readonly string[]
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
    projectRoomIdPreview,
    slugSpecialCharacters,
    onNameChange,
    isLoading,
    onSubmit,
  } = props

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleSubmit: ComponentProps<'form'>['onSubmit'] = (e) => {
    e.preventDefault()
    const trimmed = projectName.trim()
    if (!trimmed || trimmed.length > 60) return
    onSubmit(trimmed, projectSlug)
  }

  const slugPreview = projectRoomIdPreview || projectSlugPreview || getDisplaySlug(projectName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-zinc-800/60 bg-zinc-950 p-0 shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:max-w-md">
        {/* Header */}
        <div className="border-b border-zinc-800/60 px-6 py-5">
          <div className="flex items-start gap-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-indigo-400 shadow-sm">
              <FolderPlus className="size-4" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-zinc-100 leading-none mb-1">
                Create Project
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 leading-relaxed">
                Start a new architecture workspace.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5" noValidate>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="create-name">Project name</FieldLabel>
              <CharCount value={projectName} />
            </div>
            <Input
              ref={inputRef}
              id="create-name"
              autoComplete="off"
              spellCheck="false"
              disabled={isLoading}
              maxLength={64}
              placeholder="My architecture workspace"
              value={projectName}
              onChange={(e) => onNameChange(e.target.value)}
              className="border-zinc-800/60 bg-zinc-900/50 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:border-indigo-500/60 focus-visible:ring-2 focus-visible:ring-indigo-500/20 transition-all"
            />
          </div>

          <SlugPreview
            id="create-slug-preview"
            label="Room ID preview"
            value={slugPreview}
            specialChars={slugSpecialCharacters}
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
            >
              Cancel
            </Button>
            <ActionButton
              isLoading={isLoading}
              disabled={isLoading || !projectName.trim() || projectName.length > 60}
              label="Create project"
              loadingLabel="Creating…"
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────
// RENAME PROJECT DIALOG
// ─────────────────────────────────────────────────────────────

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

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        const el = inputRef.current
        if (el) {
          el.focus()
          el.select()
        }
      }, 80)
      return () => clearTimeout(t)
    }
  }, [open])

  const unchanged = projectName.trim() === currentProjectName.trim()

  const handleSubmit: ComponentProps<'form'>['onSubmit'] = (e) => {
    e.preventDefault()
    const trimmed = projectName.trim()
    if (!trimmed || trimmed.length > 60 || unchanged) return
    onSubmit(trimmed, projectSlug)
  }

  const slugPreview = projectSlugPreview || getDisplaySlug(projectName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-zinc-800/60 bg-zinc-950 p-0 shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:max-w-md">
        {/* Header */}
        <div className="border-b border-zinc-800/60 px-6 py-5">
          <div className="flex items-start gap-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-indigo-400 shadow-sm">
              <PencilLine className="size-4" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-zinc-100 leading-none mb-1">
                Rename Project
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 leading-relaxed">
                Renaming{' '}
                <span className="font-medium text-zinc-400">{currentProjectName}</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5" noValidate>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="rename-name">Project name</FieldLabel>
              <CharCount value={projectName} />
            </div>
            <Input
              ref={inputRef}
              id="rename-name"
              autoComplete="off"
              spellCheck="false"
              disabled={isLoading}
              maxLength={64}
              value={projectName}
              onChange={(e) => onNameChange(e.target.value)}
              className="border-zinc-800/60 bg-zinc-900/50 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:border-indigo-500/60 focus-visible:ring-2 focus-visible:ring-indigo-500/20 transition-all"
            />
          </div>

          <SlugPreview
            id="rename-slug-preview"
            label="Live slug preview"
            value={slugPreview}
            specialChars={slugSpecialCharacters}
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
            >
              Cancel
            </Button>
            <ActionButton
              isLoading={isLoading}
              disabled={isLoading || !projectName.trim() || projectName.length > 60 || unchanged}
              label="Save name"
              loadingLabel="Saving…"
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────
// DELETE PROJECT DIALOG
// ─────────────────────────────────────────────────────────────

interface DeleteProjectDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly projectName: string
  readonly isLoading: boolean
  readonly onSubmit: () => void
}

export function DeleteProjectDialog(props: DeleteProjectDialogProps) {
  const { open, onOpenChange, projectName, isLoading, onSubmit } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-zinc-800/60 bg-zinc-950 p-0 shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:max-w-sm">
        {/* Header — danger-tinted */}
        <div className="border-b border-zinc-800/60 bg-red-950/10 px-6 py-5">
          <div className="flex items-start gap-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-red-900/50 bg-red-950/50 text-red-400 shadow-sm">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-zinc-100 leading-none mb-1">
                Delete Project
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 leading-relaxed">
                This action is permanent and cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Confirmation body */}
        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-zinc-400 leading-relaxed">
            You&apos;re about to permanently delete{' '}
            <span className="font-semibold text-zinc-200">{projectName}</span>{' '}
            and all of its contents.
          </p>

          {/* Danger callout */}
          <div className="rounded-lg border border-red-900/30 bg-red-950/20 px-3.5 py-3">
            <p className="text-xs text-red-400 leading-relaxed">
              All files, shared access, and project history will be removed immediately.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
            >
              Keep it
            </Button>
            <ActionButton
              type="button"
              isLoading={isLoading}
              label="Delete forever"
              loadingLabel="Deleting…"
              variant="destructive"
              onClick={onSubmit}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}