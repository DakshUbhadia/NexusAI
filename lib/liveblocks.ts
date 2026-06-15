import 'server-only'

import { Liveblocks } from '@liveblocks/node'

declare global {
  var __liveblocksClient: Liveblocks | undefined
}

export function getLiveblocksClient(): Liveblocks {
  if (globalThis.__liveblocksClient) {
    return globalThis.__liveblocksClient;
  }

  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new Error('LIVEBLOCKS_SECRET_KEY is required to initialize Liveblocks');
  }

  const client = new Liveblocks({ secret });
  if (process.env.NODE_ENV === 'development') {
    globalThis.__liveblocksClient = client;
  }
  
  return client;
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
    // Use bitwise OR 0 to truncate to a 32-bit signed integer, preventing
    // floating-point overflow that would cause an incorrect modulo result.
    hash = ((hash * 31) + codePoint) | 0
  }

  const paletteIndex = Math.abs(hash) % presencePalette.length
  return presencePalette[paletteIndex]
}

export async function ensureRoomAccess(roomId: string, userId: string): Promise<void> {
  const liveblocks = getLiveblocksClient();
  const access: Record<string, ['room:write']> = {
    [userId]: ['room:write'],
  }

  let room;
  try {
    room = await liveblocks.getRoom(roomId)
  } catch (error: unknown) {
    // Only create a new room when Liveblocks definitively says it doesn't exist (404).
    // Any other error (network, auth, server-side) should surface so it isn't silently
    // swallowed and the caller can handle it appropriately.
    const isNotFound =
      error != null &&
      typeof error === 'object' &&
      'status' in error &&
      (error as { status: number }).status === 404

    if (!isNotFound) {
      throw error
    }

    console.log(`Liveblocks room "${roomId}" not found — creating it now.`)
    await liveblocks.createRoom(roomId, {
      usersAccesses: access,
      defaultAccesses: [],
    })
    return
  }

  // Room exists — make sure this user has write access.
  const usersAccesses = room.usersAccesses ?? {}
  const syncedUsersAccesses = usersAccesses as unknown as Record<
    string,
    ['room:write'] | ['room:read', 'room:presence:write'] | null
  >

  if (usersAccesses[userId]) {
    // User already has explicit access — nothing to do.
    return
  }

  await liveblocks.updateRoom(roomId, {
    usersAccesses: {
      ...syncedUsersAccesses,
      ...access,
    },
  })
}
