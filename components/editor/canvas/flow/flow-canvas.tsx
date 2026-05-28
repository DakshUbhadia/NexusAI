'use client'

import { useCallback, useMemo, useRef, type ReactElement } from 'react'

import {
  Background,
  ConnectionMode,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeChange,
} from '@xyflow/react'
import { useLiveblocksFlow } from '@liveblocks/react-flow'

import { CanvasNodeRenderer } from '@/components/editor/canvas/nodes/canvas-node'
import { ShapePanel, SHAPE_DRAG_MIME, type ShapeDragPayload } from '@/components/editor/canvas/shape-panel'
import type { CanvasEdge, CanvasNode, CanvasNodeShape } from '@/types/canvas'

import { flowBackgroundProps, miniMapProps } from './flow-config'

const DEFAULT_NODE_COLOR = 'var(--accent-secondary)'

const SHAPE_VALUES: ReadonlySet<CanvasNodeShape> = new Set([
  'rectangle',
  'diamond',
  'circle',
  'pill',
  'cylinder',
  'hexagon',
])

function isShapeValue(value: unknown): value is CanvasNodeShape {
  return typeof value === 'string' && SHAPE_VALUES.has(value as CanvasNodeShape)
}

function parseShapePayload(raw: string): ShapeDragPayload | null {
  if (!raw) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const shape = (parsed as { shape?: unknown }).shape
    const size = (parsed as { size?: unknown }).size
    if (!isShapeValue(shape) || !size || typeof size !== 'object') {
      return null
    }

    const width = (size as { width?: unknown }).width
    const height = (size as { height?: unknown }).height
    if (typeof width !== 'number' || typeof height !== 'number') {
      return null
    }

    return {
      shape,
      size: {
        width,
        height,
      },
    }
  } catch {
    return null
  }
}

export function FlowCanvas(): ReactElement {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <FlowCanvasInner />
      </ReactFlowProvider>
    </div>
  )
}

function FlowCanvasInner(): ReactElement {
  const edgeTypes = useMemo(() => ({}), [])
  const typedNodeTypes = useMemo(() => ({ canvasNode: CanvasNodeRenderer }), [])
  const shapeCounter = useRef(0)
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>()

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } = useLiveblocksFlow<
    CanvasNode,
    CanvasEdge
  >({
    nodes: {
      initial: [],
    },
    edges: {
      initial: [],
    },
    suspense: true,
  })

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const payload = parseShapePayload(event.dataTransfer.getData(SHAPE_DRAG_MIME))
      if (!payload) {
        return
      }

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      shapeCounter.current += 1
      const nodeId = `${payload.shape}-${Date.now()}-${shapeCounter.current}`

      const newNode: CanvasNode = {
        id: nodeId,
        type: 'canvasNode',
        position,
        data: {
          label: '',
          color: DEFAULT_NODE_COLOR,
          shape: payload.shape,
          size: payload.size,
        },
      }

      const changes: NodeChange<CanvasNode>[] = [{ type: 'add', item: newNode }]
      onNodesChange(changes)
    },
    [onNodesChange, reactFlow]
  )

  return (
    <div className="h-full w-full">
      <ReactFlow
        className="h-full w-full"
        connectionMode={ConnectionMode.Loose}
        edgeTypes={edgeTypes}
        fitView
        nodeTypes={typedNodeTypes}
        nodes={nodes}
        edges={edges}
        onConnect={onConnect}
        onDelete={onDelete}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
      >
        <Background {...flowBackgroundProps} />
        <Panel position="bottom-center" className="pb-6">
          <ShapePanel />
        </Panel>
        <MiniMap
          {...miniMapProps}
          className="rounded-lg border border-(--border-default) bg-(--bg-overlay) shadow-(--shadow-md) backdrop-blur"
        />
      </ReactFlow>
    </div>
  )
}
