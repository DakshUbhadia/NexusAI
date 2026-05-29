'use client'

import { useCallback, useEffect, useMemo, useRef, type ReactElement } from 'react'

import {
  Background,
  ConnectionMode,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  type ReactFlowInstance,
  useReactFlow,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import { useLiveblocksFlow } from '@liveblocks/react-flow'

import { CanvasNodeRenderer } from '@/components/editor/canvas/nodes/canvas-node'
import { ShapePanel, SHAPE_DRAG_MIME, type ShapeDragPayload } from '@/components/editor/canvas/shape-panel'
import type { CanvasEdge, CanvasNode, CanvasNodeColorKey, CanvasNodeShape } from '@/types/canvas'
import { DEFAULT_NODE_COLOR_KEY } from '@/types/canvas'

import { flowBackgroundProps } from './flow-config'
import { NodeEditingContext } from './node-editing-context'
import CanvasControls from '@/components/editor/canvas/controls/canvas-controls'
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts'
import { useUndo, useRedo, useCanUndo, useCanRedo, useHistory } from '@liveblocks/react'
import type { CanvasTemplateImportRequest } from '@/components/editor/starter-templates'

const DEFAULT_NODE_COLOR: CanvasNodeColorKey = DEFAULT_NODE_COLOR_KEY
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

type FlowCanvasProps = {
  readonly templateImportRequest?: CanvasTemplateImportRequest | null
}

function cloneTemplateNode(node: CanvasNode): CanvasNode {
  return {
    ...node,
    selected: false,
    dragging: false,
    position: {
      ...node.position,
    },
    data: {
      ...node.data,
      size: {
        ...node.data.size,
      },
    },
  }
}

function cloneTemplateEdge(edge: CanvasEdge): CanvasEdge {
  return {
    ...edge,
    selected: false,
    data: edge.data ? { ...edge.data } : edge.data,
  }
}

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

export function FlowCanvas({ templateImportRequest = null }: FlowCanvasProps): ReactElement {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <FlowCanvasInner templateImportRequest={templateImportRequest} />
      </ReactFlowProvider>
    </div>
  )
}

function FlowCanvasInner({ templateImportRequest }: FlowCanvasProps): ReactElement {
  const edgeTypes = useMemo(() => ({}), [])
  const typedNodeTypes = useMemo(() => ({ canvasNode: CanvasNodeRenderer }), [])
  const hasFitViewRef = useRef(false)
  const lastTemplateImportRequestRef = useRef<number | null>(null)
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

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const history = useHistory()

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

  useEffect(() => {
    if (!templateImportRequest) {
      return
    }

    if (lastTemplateImportRequestRef.current === templateImportRequest.requestId) {
      return
    }

    lastTemplateImportRequestRef.current = templateImportRequest.requestId

    const importedNodes = templateImportRequest.template.nodes.map(cloneTemplateNode)
    const importedEdges = templateImportRequest.template.edges.map(cloneTemplateEdge)
    const nodeChanges: NodeChange<CanvasNode>[] = importedNodes.map((node) => ({
      type: 'add',
      item: node,
    }))
    const edgeChanges: EdgeChange<CanvasEdge>[] = importedEdges.map((edge) => ({
      type: 'add',
      item: edge,
    }))

    history.pause()
    try {
      onDelete({ nodes, edges })
      onNodesChange(nodeChanges)
      onEdgesChange(edgeChanges)
    } finally {
      history.resume()
    }

    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => {
        reactFlow.fitView({ padding: 0.18, duration: 350 })
      })
    })
  }, [edges, history, nodes, onDelete, onEdgesChange, onNodesChange, reactFlow, templateImportRequest])

  const handleConnect = useCallback(
    (params: Parameters<typeof onConnect>[0]) => {
      // Defensive validation of handle ids and roles
      const p = params as Record<string, unknown>
      const sourceHandle = typeof p.sourceHandle === 'string' ? p.sourceHandle : ''
      const targetHandle = typeof p.targetHandle === 'string' ? p.targetHandle : ''
      const sourceNode = typeof p.source === 'string' ? p.source : undefined
      const targetNode = typeof p.target === 'string' ? p.target : undefined
      if (!sourceHandle || !targetHandle) {
        console.warn('Ignored connection: missing handle ids', params)
        return
      }

      const isSourceHandle = (h: string) => h.endsWith('-source')
      const isTargetHandle = (h: string) => h.endsWith('-target')

      // If handles are swapped, normalize by swapping source/target
      if (isSourceHandle(sourceHandle) && isTargetHandle(targetHandle)) {
        onConnect(params)
        return
      }

      if (isSourceHandle(targetHandle) && isTargetHandle(sourceHandle) && sourceNode && targetNode) {
        const swapped = {
          source: targetNode,
          target: sourceNode,
          sourceHandle: targetHandle,
          targetHandle: sourceHandle,
        }
        onConnect(swapped)
        return
      }

      console.warn('Ignored connection: invalid handle role combination', params)
    },
    [onConnect]
  )

  const handleZoomIn = useCallback(() => {
    reactFlow.zoomIn?.()
  }, [reactFlow])

  const handleZoomOut = useCallback(() => {
    reactFlow.zoomOut?.()
  }, [reactFlow])

  const handleFitView = useCallback(() => {
    const allNodes = nodes ?? []
    if (!allNodes || allNodes.length === 0) return

    reactFlow.fitView({ padding: 0.15, duration: 300 })
  }, [reactFlow, nodes])

  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = reactFlow.getNodes().filter((n) => n.selected)
    const selectedNodeIds = selectedNodes.map((n) => n.id)
    const selectedEdges = reactFlow.getEdges().filter((e) => e.selected)

    if (selectedNodeIds.length === 0 && selectedEdges.length === 0) return

    const connectedEdges = edges.filter((edge) =>
      selectedNodeIds.includes(edge.source) || selectedNodeIds.includes(edge.target)
    )

    const edgesToDeleteById = new Map<string, CanvasEdge>()
    for (const edge of selectedEdges) edgesToDeleteById.set(edge.id, edge)
    for (const edge of connectedEdges) edgesToDeleteById.set(edge.id, edge)
    const edgesToDelete = Array.from(edgesToDeleteById.values())

    onDelete({ nodes: selectedNodes, edges: edgesToDelete })
  }, [reactFlow, edges, onDelete])

  useKeyboardShortcuts({
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    fitView: handleFitView,
    undo,
    redo,
    del: handleDeleteSelected,
  })

  const handleResize = useCallback(
    (nodeId: string, nextSize: { width: number; height: number }) => {
      const currentNode = nodes.find((node) => node.id === nodeId)
      if (!currentNode) return
      const { width, height } = nextSize
      if (currentNode.data.size.width === width && currentNode.data.size.height === height) return

      const changes: NodeChange<CanvasNode>[] = [
        {
          type: 'replace',
          id: currentNode.id,
          item: {
            ...currentNode,
            data: {
              ...currentNode.data,
              size: { width, height },
            },
          },
        },
      ]

      onNodesChange(changes)
    },
    [nodes, onNodesChange]
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

  const handleColorChange = useCallback(
    (nodeId: string, nextColor: CanvasNodeColorKey) => {
      const currentNode = nodes.find((node) => node.id === nodeId)

      if (!currentNode || currentNode.data.color === nextColor) {
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
              color: nextColor,
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
      onColorChange: handleColorChange,
      onResize: handleResize,
    }),
    [handleLabelChange, handleColorChange, handleResize]
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
          onConnect={handleConnect}
          onDelete={onDelete}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
        >
          <Background {...flowBackgroundProps} />
          <Panel position="bottom-center" className="bottom-6!">
            <div className="flex items-center gap-3">
              <CanvasControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitView={handleFitView}
                onUndo={() => undo?.()}
                onRedo={() => redo?.()}
                canUndo={!!canUndo}
                canRedo={!!canRedo}
                onDelete={handleDeleteSelected}
                canDelete={
                  nodes.some((n) => n.selected) ||
                  edges.some((e) => e.selected) ||
                  reactFlow.getNodes().some((n) => n.selected) ||
                  reactFlow.getEdges().some((e) => e.selected)
                }
              />
              <ShapePanel />
            </div>
          </Panel>
          {/* Minimap removed per ergonomics spec */}
        </ReactFlow>
      </NodeEditingContext.Provider>
    </div>
  )
}
