import { createContext } from 'react'

import type { CanvasNodeColorKey } from '@/types/canvas'

type NodeEditingContextValue = {
  onLabelChange: (nodeId: string, nextLabel: string) => void
  onColorChange: (nodeId: string, nextColor: CanvasNodeColorKey) => void
  onResize?: (nodeId: string, nextSize: { width: number; height: number }) => void
}

export const NodeEditingContext = createContext<NodeEditingContextValue>({
  onLabelChange: () => {},
  onColorChange: () => {},
  onResize: () => {},
})
