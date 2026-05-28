'use client'

import type { ReactNode } from 'react'

import { LiveblocksProvider, RoomProvider } from '@liveblocks/react'

interface LiveblocksRoomProviderProps {
  readonly roomId: string
  readonly children: ReactNode
}

export function LiveblocksRoomProvider({
  roomId,
  children,
}: LiveblocksRoomProviderProps): JSX.Element {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{
          cursor: null,
          isThinking: false,
        }}
      >
        {children}
      </RoomProvider>
    </LiveblocksProvider>
  )
}
