import { createContext } from 'react'

type NodeEditingContextValue = {
  onLabelChange: (nodeId: string, nextLabel: string) => void
}

export const NodeEditingContext = createContext<NodeEditingContextValue>({
  onLabelChange: () => {},
})
