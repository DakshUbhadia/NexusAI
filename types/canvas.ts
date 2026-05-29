import type { Edge, Node } from '@xyflow/react'

export type CanvasNodeShape = 'rectangle' | 'diamond' | 'circle' | 'pill' | 'cylinder' | 'hexagon'

export const CANVAS_COLOR_PALETTE = {
  cyan: {
    label: 'Cyan',
    background: 'var(--accent-secondary-muted)',
    text: 'var(--accent-secondary)',
    backgroundClass: 'bg-(--accent-secondary-muted)',
    textClass: 'text-(--accent-secondary)',
    ringClass: 'ring-(--accent-secondary)',
    glowClass: 'hover:shadow-(--shadow-glow-cyan) focus-visible:shadow-(--shadow-glow-cyan)',
  },
  violet: {
    label: 'Violet',
    background: 'var(--accent-purple-muted)',
    text: 'var(--accent-purple)',
    backgroundClass: 'bg-(--accent-purple-muted)',
    textClass: 'text-(--accent-purple)',
    ringClass: 'ring-(--accent-purple)',
    glowClass: 'hover:shadow-(--shadow-glow) focus-visible:shadow-(--shadow-glow)',
  },
  success: {
    label: 'Success',
    background: 'var(--state-success-muted)',
    text: 'var(--state-success)',
    backgroundClass: 'bg-(--state-success-muted)',
    textClass: 'text-(--state-success)',
    ringClass: 'ring-(--state-success)',
    glowClass: 'hover:shadow-(--shadow-md) focus-visible:shadow-(--shadow-md)',
  },
  warning: {
    label: 'Warning',
    background: 'var(--state-warning-muted)',
    text: 'var(--state-warning)',
    backgroundClass: 'bg-(--state-warning-muted)',
    textClass: 'text-(--state-warning)',
    ringClass: 'ring-(--state-warning)',
    glowClass: 'hover:shadow-(--shadow-md) focus-visible:shadow-(--shadow-md)',
  },
} as const

export type CanvasNodeColorKey = keyof typeof CANVAS_COLOR_PALETTE

export const DEFAULT_NODE_COLOR_KEY: CanvasNodeColorKey = 'cyan'

export type CanvasNodeSize = {
  width: number
  height: number
}

export type CanvasNodeData = {
  label: string
  color: CanvasNodeColorKey
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
