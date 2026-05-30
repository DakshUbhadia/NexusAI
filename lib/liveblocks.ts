import 'server-only'

import { Liveblocks } from '@liveblocks/node'

declare global {
  var __liveblocksClient: Liveblocks | undefined
}

const secret = process.env.LIVEBLOCKS_SECRET_KEY

if (!secret) {
  throw new Error('LIVEBLOCKS_SECRET_KEY is required to initialize Liveblocks')
}

const createClient = () => new Liveblocks({ secret })

export const liveblocks =
  globalThis.__liveblocksClient ??
  createClient()

if (process.env.NODE_ENV === 'development') {
  globalThis.__liveblocksClient = liveblocks
}

const presencePalette = [
  'var(--presence-1)',
  'var(--presence-2)',
  'var(--presence-3)',
  'var(--presence-4)',
  'var(--presence-5)',
  'var(--presence-6)',
] as const

export type PresenceColor = (typeof presencePalette)[number]

export function getPresenceColor(userId: string): PresenceColor {
  if (!userId) {
    return presencePalette[0]
  }

  let hash = 0
  for (let index = 0; index < userId.length; index += 1) {
    const codePoint = userId.codePointAt(index) ?? 0
    hash = Math.trunc(hash * 31 + codePoint)
  }

  const paletteIndex = Math.abs(hash) % presencePalette.length
  return presencePalette[paletteIndex]
}

export async function ensureRoomAccess(roomId: string, userId: string): Promise<void> {
  const access: Record<string, ['room:write']> = {
    [userId]: ['room:write'],
  }

  try {
    const room = await liveblocks.getRoom(roomId)
    const usersAccesses = room.usersAccesses ?? {}
    const syncedUsersAccesses = usersAccesses as unknown as Record<
      string,
      ['room:write'] | ['room:read', 'room:presence:write'] | null
    >

    if (usersAccesses[userId]) {
      return
    }

    await liveblocks.updateRoom(roomId, {
      usersAccesses: {
        ...syncedUsersAccesses,
        ...access,
      },
    })
  } catch (error) {
    console.error('Failed to load Liveblocks room. Creating a new room.', error)
    await liveblocks.createRoom(roomId, {
      usersAccesses: access,
      defaultAccesses: [],
    })
  }
}
