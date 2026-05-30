'use client'

import type { ReactElement, ReactNode } from 'react'

import { LiveblocksProvider, RoomProvider } from '@liveblocks/react'

interface LiveblocksRoomProviderProps {
  readonly roomId: string
  readonly children: ReactNode
}

export function LiveblocksRoomProvider({
  roomId,
  children,
}: LiveblocksRoomProviderProps): ReactElement {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{
          cursor: null,
          thinking: false,
        }}
      >
        {children}
      </RoomProvider>
    </LiveblocksProvider>
  )
}
