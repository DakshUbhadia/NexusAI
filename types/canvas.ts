import type { Edge, Node } from '@xyflow/react'

export type CanvasNodeShape = 'rectangle' | 'diamond' | 'circle' | 'pill' | 'cylinder' | 'hexagon'

export type CanvasNodeSize = {
  width: number
  height: number
}

export type CanvasNodeData = {
  label: string
  color: string
  shape: CanvasNodeShape
  size: CanvasNodeSize
}

export type CanvasNodeType = 'canvasNode'
export type CanvasEdgeType = 'canvasEdge'

export type CanvasNode = Node<CanvasNodeData, CanvasNodeType>
export type CanvasEdge = Edge<Record<string, never>, CanvasEdgeType>

export type CanvasFlow = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}
