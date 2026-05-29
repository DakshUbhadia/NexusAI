'use client'

import { useCallback, useMemo, useRef, type ReactElement } from 'react'

import {
  Background,
  ConnectionMode,
  MiniMap,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  type ReactFlowInstance,
  useReactFlow,
  type NodeChange,
} from '@xyflow/react'
import { useLiveblocksFlow } from '@liveblocks/react-flow'

import { CanvasNodeRenderer } from '@/components/editor/canvas/nodes/canvas-node'
import { ShapePanel, SHAPE_DRAG_MIME, type ShapeDragPayload } from '@/components/editor/canvas/shape-panel'
import type { CanvasEdge, CanvasNode, CanvasNodeShape } from '@/types/canvas'

import { flowBackgroundProps, miniMapProps } from './flow-config'
import { NodeEditingContext } from './node-editing-context'

const DEFAULT_NODE_COLOR = 'var(--accent-secondary)'
const DEFAULT_LAYOUT_NODES: CanvasNode[] = [
  {
    id: 'shape-rectangle-seed',
    type: 'canvasNode',
    position: { x: 360, y: 170 },
    data: {
      label: '',
      color: DEFAULT_NODE_COLOR,
      shape: 'rectangle',
      size: { width: 380, height: 190 },
    },
  },
  {
    id: 'shape-diamond-seed',
    type: 'canvasNode',
    position: { x: 280, y: 520 },
    data: {
      label: '',
      color: DEFAULT_NODE_COLOR,
      shape: 'diamond',
      size: { width: 380, height: 300 },
    },
  },
  {
    id: 'shape-circle-top-seed',
    type: 'canvasNode',
    position: { x: 960, y: 270 },
    data: {
      label: '',
      color: DEFAULT_NODE_COLOR,
      shape: 'circle',
      size: { width: 280, height: 280 },
    },
  },
  {
    id: 'shape-oval-seed',
    type: 'canvasNode',
    position: { x: 780, y: 630 },
    data: {
      label: '',
      color: DEFAULT_NODE_COLOR,
      shape: 'circle',
      size: { width: 300, height: 300 },
    },
  },
  {
    id: 'shape-pill-seed',
    type: 'canvasNode',
    position: { x: 1260, y: 700 },
    data: {
      label: '',
      color: DEFAULT_NODE_COLOR,
      shape: 'pill',
      size: { width: 460, height: 190 },
    },
  },
]

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
  const hasFitViewRef = useRef(false)
  const shapeCounter = useRef(0)
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>()
  const defaultEdgeOptions = useMemo(
    () => ({
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'var(--accent-secondary)',
      },
      style: {
        stroke: 'var(--accent-secondary)',
        strokeWidth: 2,
      },
    }),
    []
  )

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } = useLiveblocksFlow<
    CanvasNode,
    CanvasEdge
  >({
    nodes: {
      initial: DEFAULT_LAYOUT_NODES,
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

  const handleInit = useCallback((instance: ReactFlowInstance<CanvasNode, CanvasEdge>) => {
    if (hasFitViewRef.current) {
      return
    }

    hasFitViewRef.current = true
    instance.fitView({ padding: 0.18 })
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

  const handleLabelChange = useCallback(
    (nodeId: string, nextLabel: string) => {
      const currentNode = nodes.find((node) => node.id === nodeId)

      if (!currentNode || currentNode.data.label === nextLabel) {
        return
      }

      const changes: NodeChange<CanvasNode>[] = [
        {
          type: 'replace',
          id: currentNode.id,
          item: {
            ...currentNode,
            data: {
              ...currentNode.data,
              label: nextLabel,
            },
          },
        },
      ]

      onNodesChange(changes)
    },
    [nodes, onNodesChange]
  )

  const nodeEditingContextValue = useMemo(
    () => ({
      onLabelChange: handleLabelChange,
    }),
    [handleLabelChange]
  )

  return (
    <div className="h-full w-full">
      <NodeEditingContext.Provider value={nodeEditingContextValue}>
        <ReactFlow
          className="h-full w-full"
          connectionMode={ConnectionMode.Loose}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          nodeTypes={typedNodeTypes}
          nodes={nodes}
          edges={edges}
          proOptions={{ hideAttribution: true }}
          onInit={handleInit}
          onConnect={onConnect}
          onDelete={onDelete}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
        >
          <Background {...flowBackgroundProps} />
          <Panel position="bottom-center" className="bottom-6!">
            <ShapePanel />
          </Panel>
          <MiniMap
            {...miniMapProps}
            className="bottom-6! right-6! h-48! w-56! rounded-lg border border-(--border-default) bg-(--bg-overlay) shadow-(--shadow-md) backdrop-blur"
          />
        </ReactFlow>
      </NodeEditingContext.Provider>
    </div>
  )
}
