'use client'

import { useMemo, type CSSProperties, type ReactElement } from 'react'

import { UserButton, useAuth } from '@clerk/nextjs'
import { useOthers } from '@liveblocks/react'
import { Panel, useStore } from '@xyflow/react'

const MAX_VISIBLE_AVATARS = 5
const FALLBACK_PRESENCE_COLOR = 'var(--presence-1)'

type CollaboratorAvatar = {
  id: string
  name: string
  avatar: string
  color: string
}

type CollaboratorCursor = {
  connectionId: number
  name: string
  color: string
  cursor: {
    x: number
    y: number
  }
}

function getDisplayName(name: string, fallbackId: string): string {
  const trimmed = name.trim()
  if (trimmed.length > 0) {
    return trimmed
  }

  return fallbackId || 'Teammate'
}

function getInitials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return 'NA'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function getAvatarColor(color: string): string {
  return color.trim() || FALLBACK_PRESENCE_COLOR
}

export function PresenceOverlay(): ReactElement {
  const { isLoaded, userId } = useAuth()
  const others = useOthers()
  const [panX, panY, zoom] = useStore((state) => state.transform)

  const collaboratorAvatars = useMemo<CollaboratorAvatar[]>(() => {
    if (!isLoaded || !userId) {
      return []
    }

    const collaboratorsById = new Map<string, CollaboratorAvatar>()

    for (const other of others) {
      if (other.id === userId || collaboratorsById.has(other.id)) {
        continue
      }

      collaboratorsById.set(other.id, {
        id: other.id,
        name: getDisplayName(other.info.name, other.id),
        avatar: other.info.avatar,
        color: getAvatarColor(other.info.color),
      })
    }

    return Array.from(collaboratorsById.values())
  }, [isLoaded, others, userId])

  const collaboratorCursors = useMemo<CollaboratorCursor[]>(() => {
    if (!isLoaded || !userId) {
      return []
    }

    return others.flatMap((other) => {
      if (other.id === userId || !other.presence.cursor) {
        return []
      }

      return [
        {
          connectionId: other.connectionId,
          name: getDisplayName(other.info.name, other.id),
          color: getAvatarColor(other.info.color),
          cursor: other.presence.cursor,
        },
      ]
    })
  }, [isLoaded, others, userId])

  const visibleCollaborators = collaboratorAvatars.slice(0, MAX_VISIBLE_AVATARS)
  const overflowCount = collaboratorAvatars.length - visibleCollaborators.length

  return (
    <>
      <Panel position="top-right" className="top-4! right-4! m-0!">
        <div className="pointer-events-auto flex items-center rounded-full border border-(--border-default) bg-(--bg-overlay) px-2.5 py-2 shadow-(--shadow-md) backdrop-blur-xl">
          {visibleCollaborators.length > 0 ? (
            <>
              <div className="flex items-center -space-x-2">
                {visibleCollaborators.map((collaborator) => {
                  const avatarStyle: CSSProperties = {
                    backgroundColor: collaborator.color,
                    borderColor: collaborator.color,
                  }

                  return (
                    <div
                      aria-hidden="true"
                      className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border text-xs font-semibold text-(--text-inverted) ring-2 ring-(--bg-base)"
                      key={collaborator.id}
                      style={avatarStyle}
                    >
                      {collaborator.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={collaborator.name}
                          className="h-full w-full object-cover"
                          draggable={false}
                          src={collaborator.avatar}
                        />
                      ) : (
                        <span>{getInitials(collaborator.name)}</span>
                      )}
                    </div>
                  )
                })}

                {overflowCount > 0 ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-(--border-strong) bg-(--bg-surface-elevated) text-xs font-semibold text-(--text-primary) ring-2 ring-(--bg-base)">
                    +{overflowCount}
                  </div>
                ) : null}
              </div>
              <div className="mx-3 h-6 w-px bg-(--border-default)" />
            </>
          ) : null}

          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8',
                userButtonPopoverCard: 'border border-(--border-default)',
              },
            }}
          />
        </div>
      </Panel>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[80]">
        {collaboratorCursors.map((cursor) => {
          const cursorStyle: CSSProperties = {
            transform: `translate(${cursor.cursor.x * zoom + panX}px, ${cursor.cursor.y * zoom + panY}px)`,
          }
          const pointerStyle: CSSProperties = {
            color: cursor.color,
          }
          const badgeStyle: CSSProperties = {
            backgroundColor: cursor.color,
            borderColor: cursor.color,
          }

          return (
            <div className="presence-cursor left-0 top-0" key={cursor.connectionId} style={cursorStyle}>
              <div className="flex items-start gap-2">
                <svg
                  className="h-4 w-4 shrink-0"
                  style={pointerStyle}
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M3 2L11.5 8.5L7.5 9L9.5 14L7.7 14.8L5.7 9.9L3 12V2Z"
                    fill="currentColor"
                  />
                </svg>
                <div
                  className="max-w-40 truncate rounded-full border px-2 py-1 text-xs font-medium text-(--text-inverted) shadow-(--shadow-sm)"
                  style={badgeStyle}
                >
                  {cursor.name}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
