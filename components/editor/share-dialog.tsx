'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { Check, Copy, Mail, UserMinus, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProjectCollaborators } from '@/hooks/useProjectCollaborators'
import type { CollaboratorProfile } from '@/types/collaborators'

interface ShareDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly projectId: string
  readonly projectName: string
  readonly isOwner: boolean
}

function getInitials(collaborator: CollaboratorProfile): string {
  const source = collaborator.displayName || collaborator.email
  const parts = source.trim().split(/\s+/)
  const letters = parts
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])

  return letters.join('').toUpperCase() || '??'
}

export function ShareDialog({ open, onOpenChange, projectId, projectName, isOwner }: ShareDialogProps) {
  const { collaborators, viewerRole, isLoading, isMutating, error, invite, remove } =
    useProjectCollaborators({ projectId, enabled: open })
  const [inviteEmail, setInviteEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canManage = isOwner && viewerRole !== 'collaborator'
  const shareUrl = useMemo(() => {
    const origin = globalThis.location?.origin
    return origin ? `${origin}/editor/${projectId}` : ''
  }, [projectId])
  const emptyState = useMemo(() => {
    if (isLoading) {
      return 'Loading collaborators...'
    }

    if (error) {
      return error
    }

    return 'No collaborators yet.'
  }, [error, isLoading])

  useEffect(() => {
    return () => {
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current)
      }
    }
  }, [])

  const handleInvite = async () => {
    const trimmedEmail = inviteEmail.trim()

    if (!trimmedEmail) {
      return
    }

    await invite(trimmedEmail)
    setInviteEmail('')
  }

  const handleCopy = async () => {
    if (!shareUrl) {
      return
    }

    const clipboard = globalThis.navigator?.clipboard

    if (!clipboard) {
      return
    }

    await clipboard.writeText(shareUrl)
    setCopied(true)

    if (copyTimeout.current) {
      clearTimeout(copyTimeout.current)
    }

    copyTimeout.current = setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-(--border-default) bg-(--bg-surface)">
              <Users className="size-4 text-(--accent-secondary)" />
            </span>
            Share {projectName}
          </DialogTitle>
          <DialogDescription>
            Invite collaborators to access this workspace, or copy the secure project link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border border-(--border-default) bg-(--bg-subtle) p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--text-muted)">Project link</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={shareUrl} />
              <Button
                className="shrink-0 gap-2"
                onClick={handleCopy}
                type="button"
                variant="outline"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copied!' : 'Copy link'}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-(--border-default) bg-(--bg-surface) p-4 shadow-(--shadow-md)">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-(--text-primary)">Invite collaborators</p>
                <p className="text-xs text-(--text-secondary)">
                  Owners can invite teammates by email. Collaborators have read-only access here.
                </p>
              </div>
              <div className="rounded-full border border-(--border-default) bg-(--bg-subtle) px-3 py-1 text-xs text-(--text-muted)">
                {canManage ? 'Owner' : 'Collaborator'}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                disabled={!canManage || isMutating}
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
              <Button
                className="shrink-0 gap-2"
                disabled={!canManage || isMutating || inviteEmail.trim().length === 0}
                onClick={handleInvite}
                type="button"
              >
                <Mail className="size-4" />
                {isMutating ? 'Sending...' : 'Send invite'}
              </Button>
            </div>
            {error ? <p className="mt-2 text-xs text-(--state-error)">{error}</p> : null}
          </div>

          <div className="rounded-lg border border-(--border-default) bg-(--bg-surface-elevated) p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-(--text-primary)">Current collaborators</p>
              <p className="text-xs text-(--text-muted)">{collaborators.length} total</p>
            </div>

            <ScrollArea className="mt-4 max-h-56 pr-3">
              {collaborators.length === 0 ? (
                <div className="rounded-lg border border-dashed border-(--border-default) bg-(--bg-base) px-4 py-6 text-center text-xs text-(--text-secondary)">
                  {emptyState}
                </div>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((collaborator) => (
                    <div
                      key={collaborator.email}
                      className="flex items-center justify-between gap-3 rounded-lg border border-(--border-default) bg-(--bg-base) px-3 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {collaborator.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={collaborator.displayName || collaborator.email}
                            className="h-9 w-9 rounded-full border border-(--border-default) object-cover"
                            draggable={false}
                            src={collaborator.avatarUrl}
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-(--border-default) bg-(--bg-subtle) text-xs font-semibold text-(--text-primary)">
                            {getInitials(collaborator)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-(--text-primary)">
                            {collaborator.displayName || collaborator.email}
                          </p>
                          <p className="truncate text-xs text-(--text-muted)">{collaborator.email}</p>
                        </div>
                      </div>
                      {canManage ? (
                        <Button
                          aria-label={`Remove ${collaborator.email}`}
                          className="gap-2"
                          disabled={isMutating}
                          onClick={() => remove(collaborator.email)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <UserMinus className="size-3.5" />
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
