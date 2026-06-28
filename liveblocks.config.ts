// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
import type { JsonObject } from '@liveblocks/client'
import type { AiFeedMessage } from '@/types/tasks'

type DesignAgentStatusEvent = {
  type: 'design-agent-status'
  phase: 'start' | 'processing' | 'complete' | 'error'
  message: string
  runId: string
  step: number
  totalSteps: number
  timestamp: string
}

type AccessRevokedEvent = {
  type: 'access-revoked'
  email: string
}

declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null
      thinking: boolean
    }
    Storage: {
      flow?: {
        nodes: JsonObject[]
        edges: JsonObject[]
      }
    }
    UserMeta: {
      id: string
      info: {
        name: string
        avatar: string
        color: string
      }
    }
    RoomEvent: DesignAgentStatusEvent | AccessRevokedEvent
    FeedMetadata: {
      name?: string
    }
    FeedMessageData: AiFeedMessage
    ThreadMetadata: Record<string, never>
    RoomInfo: Record<string, never>
  }
}

export type LiveblocksConfig = true
