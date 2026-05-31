// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
import type { LiveblocksFlow } from '@liveblocks/react-flow'

import type { CanvasEdge, CanvasNode } from '@/types/canvas'

type DesignAgentStatusEvent = {
  type: 'design-agent-status'
  phase: 'start' | 'processing' | 'complete' | 'error'
  message: string
  runId: string
  step: number
  totalSteps: number
  timestamp: string
}

declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null
      thinking: boolean
    }
    Storage: {
      flow?: LiveblocksFlow<CanvasNode, CanvasEdge>
    }
    UserMeta: {
      id: string
      info: {
        name: string
        avatar: string
        color: string
      }
    }
    RoomEvent: DesignAgentStatusEvent
    ThreadMetadata: Record<string, never>
    RoomInfo: Record<string, never>
  }
}

export type LiveblocksConfig = true
