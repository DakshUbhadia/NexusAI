'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'

import { useUser } from '@clerk/nextjs'

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ConnectionMode,
  type Connection,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  ViewportPortal,
  type ReactFlowInstance,
  useReactFlow,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import { Check, Lock, PencilLine, Trash2, X } from 'lucide-react'
import {
  useCanRedo,
  useCanUndo,
  useHistory,
  useMutation,
  useRedo,
  useStorage,
  useUndo,
  useUpdateMyPresence,
  useEventListener,
} from '@liveblocks/react/suspense'

import { CanvasEdgeRenderer } from '@/components/editor/canvas/edges/canvas-edge'
import { CanvasNodeRenderer } from '@/components/editor/canvas/nodes/canvas-node'
import { ShapePanel, SHAPE_DRAG_MIME, type ShapeDragPayload } from '@/components/editor/canvas/shape-panel'
import { cn } from '@/lib/utils'
import {
  DEFAULT_NODE_COLOR_KEY,
  getCanvasNodeSize,
  canvasFlowSchema,
  type CanvasFlow,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeColorKey,
  type CanvasNodeShape,
  type CanvasNodeSize,
} from '@/types/canvas'

import { flowBackgroundProps } from './flow-config'
import { NodeEditingContext } from './node-editing-context'
import { PresenceOverlay } from './presence-overlay'
import CanvasControls from '@/components/editor/canvas/controls/canvas-controls'
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts'
import { useCanvasAutosave, type CanvasSaveStatus } from '@/hooks/useCanvasAutosave'
import type { CanvasTemplateImportRequest } from '@/components/editor/starter-templates'

const DEFAULT_NODE_COLOR: CanvasNodeColorKey = DEFAULT_NODE_COLOR_KEY
const SHAPE_VALUES: ReadonlySet<CanvasNodeShape> = new Set([
  'rectangle',
  'diamond',
  'circle',
  'pill',
  'cylinder',
  'hexagon',
])

type FlowCanvasProps = {
  readonly projectId: string
  readonly templateImportRequest?: CanvasTemplateImportRequest | null
  readonly onSaveNowChange?: (saveNow: (() => Promise<void>) | null) => void
  readonly onSaveErrorMessageChange?: (message: string | null) => void
  readonly onSaveStatusChange?: (status: CanvasSaveStatus) => void
}

type DragPreviewState = {
  readonly isValid: boolean
  readonly position: {
    readonly x: number
    readonly y: number
  }
  readonly shape: CanvasNodeShape
  readonly size: CanvasNodeSize
}

type EdgeActionMenuState = {
  readonly edgeId: string
  readonly x: number
  readonly y: number
}

type EdgeLabelEditorState = EdgeActionMenuState & {
  readonly draft: string
}

type FlowStorageRoot = {
  get: (key: string) => unknown
  set: (key: string, value: unknown) => void
}

function toPlainFlow(candidate: unknown): CanvasFlow {
  const maybeToJson = candidate as { toJSON?: () => unknown } | null
  const raw = maybeToJson && typeof maybeToJson.toJSON === 'function' ? maybeToJson.toJSON() : candidate
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null

  const normalizeCollection = (value: unknown): unknown[] => {
    if (Array.isArray(value)) {
      return value
    }

    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>)
    }

    return []
  }

  const parsed = canvasFlowSchema.safeParse({
    nodes: normalizeCollection(record?.nodes),
    edges: normalizeCollection(record?.edges),
  })

  if (!parsed.success) {
    return {
      nodes: [],
      edges: [],
    }
  }

  return parsed.data
}

function isCanonicalFlowShape(candidate: unknown): boolean {
  const maybeToJson = candidate as { toJSON?: () => unknown } | null
  const raw = maybeToJson && typeof maybeToJson.toJSON === 'function' ? maybeToJson.toJSON() : candidate
  return canvasFlowSchema.safeParse(raw).success
}

function readFlowFromStorage(storage: FlowStorageRoot): CanvasFlow {
  return toPlainFlow(storage.get('flow'))
}

function writeFlowToStorage(storage: FlowStorageRoot, flow: CanvasFlow): void {
  storage.set('flow', {
    nodes: flow.nodes,
    edges: flow.edges,
  })
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
    if (!isShapeValue(shape)) {
      return null
    }

    return {
      shape,
    }
  } catch {
    return null
  }
}

function getPlacementPosition(
  reactFlow: ReactFlowInstance<CanvasNode, CanvasEdge>,
  clientX: number,
  clientY: number,
  size: CanvasNodeSize
): { x: number; y: number } {
  const flowPosition = reactFlow.screenToFlowPosition({
    x: clientX,
    y: clientY,
  })

  return {
    x: Math.round(flowPosition.x - size.width / 2),
    y: Math.round(flowPosition.y - size.height / 2),
  }
}

export function FlowCanvas(props: FlowCanvasProps): ReactElement {
  const { user } = useUser()
  const [accessDenied, setAccessDenied] = useState(false)

  useEventListener(({ event }) => {
    if (event.type === 'access-revoked') {
      const emailMatch = user?.emailAddresses.some(
        (e) => e.emailAddress.toLowerCase() === event.email.toLowerCase()
      )
      if (emailMatch) {
        setAccessDenied(true)
      }
    }
  })

  if (accessDenied) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-(--bg-base)">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-500/5">
            <Lock className="size-6 text-zinc-300" />
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-white">Access denied</h2>
          <p className="text-zinc-400">You do not have permission to view this workspace.</p>
          <a
            href="/editor"
            className="mt-8 rounded-full bg-cyan-400 px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-(--bg-base)"
          >
            Back to projects
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <FlowCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  )
}

function FlowCanvasInner({
  onSaveErrorMessageChange,
  onSaveNowChange,
  onSaveStatusChange,
  projectId,
  templateImportRequest,
}: FlowCanvasProps): ReactElement {
  const edgeTypes = useMemo(() => ({ canvasEdge: CanvasEdgeRenderer }), [])
  const typedNodeTypes = useMemo(() => ({ canvasNode: CanvasNodeRenderer }), [])
  const canvasRootRef = useRef<HTMLDivElement | null>(null)
  const edgeLabelInputRef = useRef<HTMLInputElement | null>(null)
  const edgeActionMenuRef = useRef<HTMLDivElement | null>(null)
  const edgeLabelEditorRef = useRef<HTMLDivElement | null>(null)
  const edgeLabelEditorFocusRef = useRef<string | null>(null)
  const edgeLabelCancelRef = useRef(false)
  const [isSavedCanvasLoading, setIsSavedCanvasLoading] = useState(true)
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null)
  const [edgeActionMenu, setEdgeActionMenu] = useState<EdgeActionMenuState | null>(null)
  const [edgeLabelEditor, setEdgeLabelEditor] = useState<EdgeLabelEditorState | null>(null)
  const hasFitViewRef = useRef(false)
  const loadAttemptedRef = useRef(false)
  const lastTemplateImportRequestRef = useRef<number | null>(null)
  const latestEdgesRef = useRef<CanvasEdge[]>([])
  const latestNodesRef = useRef<CanvasNode[]>([])
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
  const storageFlow = useStorage((root) => root.flow)
  const flow = useMemo(() => toPlainFlow(storageFlow), [storageFlow])
  const nodes = flow.nodes
  const edges = flow.edges
  const ensureFlowStorage = useMutation(({ storage }) => {
    const currentFlow = storage.get('flow')
    if (!currentFlow) {
      writeFlowToStorage(storage as FlowStorageRoot, {
        nodes: [],
        edges: [],
      })
      return
    }

    // Backfill legacy or malformed room storage into the canonical flow shape.
    if (!isCanonicalFlowShape(currentFlow)) {
      writeFlowToStorage(storage as FlowStorageRoot, toPlainFlow(currentFlow))
    }
  }, [])
  const replaceFlow = useMutation(({ storage }, flow: CanvasFlow) => {
    writeFlowToStorage(storage as FlowStorageRoot, flow)
  }, [])
  const applyCanvasNodeChanges = useMutation(({ storage }, changes: NodeChange<CanvasNode>[]) => {
    const currentFlow = readFlowFromStorage(storage as FlowStorageRoot)
    const nextNodes = applyNodeChanges(changes, currentFlow.nodes)
    writeFlowToStorage(storage as FlowStorageRoot, {
      nodes: nextNodes,
      edges: currentFlow.edges,
    })
  }, [])
  const applyCanvasEdgeChanges = useMutation(({ storage }, changes: EdgeChange<CanvasEdge>[]) => {
    const currentFlow = readFlowFromStorage(storage as FlowStorageRoot)
    const nextEdges = applyEdgeChanges(changes, currentFlow.edges)
    writeFlowToStorage(storage as FlowStorageRoot, {
      nodes: currentFlow.nodes,
      edges: nextEdges,
    })
  }, [])
  const connectCanvasNodes = useMutation(({ storage }, connection: Connection) => {
    const currentFlow = readFlowFromStorage(storage as FlowStorageRoot)
    const nextEdges = addEdge(
      {
        ...connection,
        type: 'canvasEdge',
      },
      currentFlow.edges
    ) as CanvasEdge[]

    writeFlowToStorage(storage as FlowStorageRoot, {
      nodes: currentFlow.nodes,
      edges: nextEdges,
    })
  }, [])
  const deleteCanvasElements = useMutation(({ storage }, payload: { nodes: CanvasNode[]; edges: CanvasEdge[] }) => {
    const currentFlow = readFlowFromStorage(storage as FlowStorageRoot)
    const nodeIds = new Set(payload.nodes.map((node) => node.id))
    const edgeIds = new Set(payload.edges.map((edge) => edge.id))

    const nextNodes = currentFlow.nodes.filter((node) => !nodeIds.has(node.id))
    const nextEdges = currentFlow.edges.filter(
      (edge) => !edgeIds.has(edge.id) && !nodeIds.has(edge.source) && !nodeIds.has(edge.target)
    )

    writeFlowToStorage(storage as FlowStorageRoot, {
      nodes: nextNodes,
      edges: nextEdges,
    })
  }, [])
  const hasExistingCanvas = nodes.length > 0 || edges.length > 0

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const history = useHistory()
  const updateMyPresence = useUpdateMyPresence()
  const autosave = useCanvasAutosave({
    projectId,
    nodes,
    edges,
    enabled: hasExistingCanvas || !isSavedCanvasLoading,
  })
  const activeEdgeActionMenu =
    edgeActionMenu && edges.some((edge) => edge.id === edgeActionMenu.edgeId) ? edgeActionMenu : null
  const activeEdgeLabelEditor =
    edgeLabelEditor && edges.some((edge) => edge.id === edgeLabelEditor.edgeId) ? edgeLabelEditor : null

  useEffect(() => {
    latestEdgesRef.current = edges
    latestNodesRef.current = nodes
  }, [edges, nodes])

  useEffect(() => {
    ensureFlowStorage()
  }, [ensureFlowStorage])

  useEffect(() => {
    if (!activeEdgeLabelEditor) {
      edgeLabelEditorFocusRef.current = null
    }
  }, [activeEdgeLabelEditor])

  const updateDragPreview = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const payload = parseShapePayload(event.dataTransfer.getData(SHAPE_DRAG_MIME))
      if (!payload) {
        setDragPreview(null)
        return null
      }

      const size = getCanvasNodeSize(payload.shape)
      const position = getPlacementPosition(reactFlow, event.clientX, event.clientY, size)

      setDragPreview({
        shape: payload.shape,
        size,
        position,
        isValid: true,
      })

      return {
        payload,
        position,
        size,
      }
    },
    [reactFlow]
  )

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    updateDragPreview(event)
  }, [updateDragPreview])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    updateDragPreview(event)
  }, [updateDragPreview])

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return
    }

    setDragPreview(null)
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
      setDragPreview(null)

      if (!payload) {
        return
      }

      const size = getCanvasNodeSize(payload.shape)
      const position = getPlacementPosition(reactFlow, event.clientX, event.clientY, size)

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
          size,
        },
      }

      const changes: NodeChange<CanvasNode>[] = [{ type: 'add', item: newNode }]
      applyCanvasNodeChanges(changes)
    },
    [applyCanvasNodeChanges, reactFlow]
  )

  useEffect(() => {
    if (loadAttemptedRef.current) {
      return
    }

    if (hasExistingCanvas) {
      loadAttemptedRef.current = true
      return
    }

    loadAttemptedRef.current = true
    let cancelled = false

    async function loadSavedCanvas(): Promise<void> {
      try {
        const response = await fetch(`/api/projects/${projectId}/canvas`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Canvas load failed with ${response.status}`)
        }

        const payload: unknown = await response.json()
        const parsed = canvasFlowSchema.nullable().safeParse(
          typeof payload === 'object' && payload !== null && 'data' in payload
            ? (payload as { data?: { canvas?: unknown } }).data?.canvas ?? null
            : null
        )

        if (!parsed.success || !parsed.data || cancelled) {
          return
        }

        if (latestNodesRef.current.length > 0 || latestEdgesRef.current.length > 0) {
          return
        }

        const savedCanvas: CanvasFlow = parsed.data

        history.pause()
        try {
          replaceFlow(savedCanvas)
        } finally {
          history.resume()
        }

        if (savedCanvas.nodes.length > 0) {
          globalThis.requestAnimationFrame(() => {
            reactFlow.fitView({ padding: 0.18, duration: 300 })
          })
        }
      } catch (error) {
        console.error('Saved canvas load failed.', error)
      } finally {
        if (!cancelled) {
          setIsSavedCanvasLoading(false)
        }
      }
    }

    void loadSavedCanvas()

    return () => {
      cancelled = true
    }
  }, [hasExistingCanvas, history, projectId, reactFlow, replaceFlow])

  useEffect(() => {
    if (!activeEdgeActionMenu && !activeEdgeLabelEditor) {
      return
    }

    const handleWindowPointerDown = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (edgeActionMenuRef.current?.contains(target)) {
        return
      }

      if (edgeLabelEditorRef.current?.contains(target)) {
        return
      }

      setEdgeActionMenu(null)
    }

    const handleWindowKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return
      }

      setEdgeActionMenu(null)
      if (edgeLabelEditorRef.current) {
        edgeLabelCancelRef.current = true
        setEdgeLabelEditor(null)
      }
    }

    globalThis.window.addEventListener('pointerdown', handleWindowPointerDown)
    globalThis.window.addEventListener('keydown', handleWindowKeyDown)

    return () => {
      globalThis.window.removeEventListener('pointerdown', handleWindowPointerDown)
      globalThis.window.removeEventListener('keydown', handleWindowKeyDown)
    }
  }, [activeEdgeActionMenu, activeEdgeLabelEditor])

  useEffect(() => {
    if (!activeEdgeLabelEditor) {
      return
    }

    if (edgeLabelEditorFocusRef.current === activeEdgeLabelEditor.edgeId) {
      return
    }

    edgeLabelEditorFocusRef.current = activeEdgeLabelEditor.edgeId
    edgeLabelInputRef.current?.focus()
  }, [activeEdgeLabelEditor])

  const getOverlayPosition = useCallback((event: { clientX: number; clientY: number }): { x: number; y: number } => {
    if (!canvasRootRef.current) {
      return { x: 0, y: 0 }
    }

    const bounds = canvasRootRef.current.getBoundingClientRect()
    return {
      x: Math.round(event.clientX - bounds.left + 8),
      y: Math.round(event.clientY - bounds.top + 8),
    }
  }, [])

  const updateEdgeLabel = useCallback(
    (edgeId: string, nextLabel: string) => {
      const currentEdge = edges.find((edge) => edge.id === edgeId)
      if (!currentEdge) {
        return
      }

      const trimmedLabel = nextLabel.trim()
      const nextData = currentEdge.data ? { ...currentEdge.data } : {}
      if (trimmedLabel.length > 0) {
        nextData.label = trimmedLabel
      } else {
        delete nextData.label
      }

      const updatedEdge: CanvasEdge = {
        ...currentEdge,
        data: Object.keys(nextData).length > 0 ? nextData : undefined,
        label: trimmedLabel.length > 0 ? trimmedLabel : undefined,
      }

      const edgeChanges: EdgeChange<CanvasEdge>[] = [
        {
          type: 'replace',
          id: currentEdge.id,
          item: updatedEdge,
        },
      ]

      applyCanvasEdgeChanges(edgeChanges)
    },
    [applyCanvasEdgeChanges, edges]
  )

  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: CanvasEdge) => {
      event.preventDefault()
      event.stopPropagation()

      const position = getOverlayPosition(event)
      setEdgeLabelEditor(null)
      setEdgeActionMenu({
        edgeId: edge.id,
        x: position.x,
        y: position.y,
      })
    },
    [getOverlayPosition]
  )

  const handleEdgeAddText = useCallback(() => {
    if (!activeEdgeActionMenu) {
      return
    }

    const currentEdge = edges.find((edge) => edge.id === activeEdgeActionMenu.edgeId)
    if (!currentEdge) {
      setEdgeActionMenu(null)
      return
    }

    setEdgeActionMenu(null)
    edgeLabelCancelRef.current = false
    setEdgeLabelEditor({
      edgeId: currentEdge.id,
      x: activeEdgeActionMenu.x,
      y: activeEdgeActionMenu.y,
      draft: currentEdge.data?.label ?? '',
    })
  }, [activeEdgeActionMenu, edges])

  const handleEdgeDelete = useCallback(() => {
    if (!activeEdgeActionMenu) {
      return
    }

    const currentEdge = edges.find((edge) => edge.id === activeEdgeActionMenu.edgeId)
    if (!currentEdge) {
      setEdgeActionMenu(null)
      return
    }

    setEdgeActionMenu(null)
    setEdgeLabelEditor(null)
    deleteCanvasElements({ nodes: [], edges: [currentEdge] })
  }, [activeEdgeActionMenu, deleteCanvasElements, edges])

  const handleEdgeEditorConfirm = useCallback(() => {
    if (!activeEdgeLabelEditor) {
      return
    }

    updateEdgeLabel(activeEdgeLabelEditor.edgeId, activeEdgeLabelEditor.draft)
    edgeLabelCancelRef.current = false
    setEdgeLabelEditor(null)
  }, [activeEdgeLabelEditor, updateEdgeLabel])

  const handleEdgeEditorCancel = useCallback(() => {
    edgeLabelCancelRef.current = true
    setEdgeLabelEditor(null)
  }, [])

  const handleEdgeEditorBlur = useCallback(() => {
    if (!activeEdgeLabelEditor) {
      return
    }

    if (edgeLabelCancelRef.current) {
      edgeLabelCancelRef.current = false
      setEdgeLabelEditor(null)
      return
    }

    handleEdgeEditorConfirm()
  }, [activeEdgeLabelEditor, handleEdgeEditorConfirm])

  const handleEdgeEditorDraftChange = useCallback((nextDraft: string) => {
    setEdgeLabelEditor((current) => (current ? { ...current, draft: nextDraft } : current))
  }, [])

  const renderedEdges = useMemo(
    () =>
      edges.map((edge) => {
        const label = edge.data?.label?.trim() ?? ''
        return {
          ...edge,
          type: 'canvasEdge',
          label: label || undefined,
          data: edge.data ? { ...edge.data, label: label || undefined } : edge.data,
        } as CanvasEdge
      }),
    [edges]
  )

  const closeEdgeOverlays = useCallback(() => {
    setEdgeActionMenu(null)
    setEdgeLabelEditor(null)
  }, [])

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
    const nextFlow: CanvasFlow = {
      nodes: importedNodes,
      edges: importedEdges,
    }

    history.pause()
    try {
      replaceFlow(nextFlow)
    } finally {
      history.resume()
    }

    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => {
        reactFlow.fitView({ padding: 0.18, duration: 350 })
      })
    })
  }, [history, replaceFlow, reactFlow, templateImportRequest])

  const handleConnect = useCallback(
    (params: Connection) => {
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
        connectCanvasNodes(params)
        return
      }

      if (isSourceHandle(targetHandle) && isTargetHandle(sourceHandle) && sourceNode && targetNode) {
        const swapped: Connection = {
          source: targetNode,
          target: sourceNode,
          sourceHandle: targetHandle,
          targetHandle: sourceHandle,
        }
        connectCanvasNodes(swapped)
        return
      }

      console.warn('Ignored connection: invalid handle role combination', params)
    },
    [connectCanvasNodes]
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

    deleteCanvasElements({ nodes: selectedNodes, edges: edgesToDelete })
    closeEdgeOverlays()
  }, [closeEdgeOverlays, reactFlow, edges, deleteCanvasElements])

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      updateMyPresence({
        cursor: reactFlow.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }),
      })
    },
    [reactFlow, updateMyPresence]
  )

  const handleMouseLeave = useCallback(() => {
    updateMyPresence({
      cursor: null,
    })
  }, [updateMyPresence])

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

      applyCanvasNodeChanges(changes)
    },
    [nodes, applyCanvasNodeChanges]
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

      applyCanvasNodeChanges(changes)
    },
    [nodes, applyCanvasNodeChanges]
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

      applyCanvasNodeChanges(changes)
    },
    [nodes, applyCanvasNodeChanges]
  )

  const nodeEditingContextValue = useMemo(
    () => ({
      onLabelChange: handleLabelChange,
      onColorChange: handleColorChange,
      onResize: handleResize,
    }),
    [handleLabelChange, handleColorChange, handleResize]
  )

  useEffect(() => handleMouseLeave, [handleMouseLeave])

  useEffect(() => {
    onSaveStatusChange?.(autosave.status)
  }, [autosave.status, onSaveStatusChange])

  useEffect(() => {
    onSaveErrorMessageChange?.(autosave.errorMessage)
  }, [autosave.errorMessage, onSaveErrorMessageChange])

  useEffect(() => {
    onSaveNowChange?.(autosave.saveNow)

    return () => {
      onSaveNowChange?.(null)
    }
  }, [autosave.saveNow, onSaveNowChange])

  return (
    <div ref={canvasRootRef} className="relative h-full w-full">
      <NodeEditingContext.Provider value={nodeEditingContextValue}>
        <ReactFlow
          className="h-full w-full"
          connectionMode={ConnectionMode.Loose}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          nodeTypes={typedNodeTypes}
          nodes={nodes}
          edges={renderedEdges}
          proOptions={{ hideAttribution: true }}
          onInit={handleInit}
          onConnect={handleConnect}
          onDelete={deleteCanvasElements}
          onPaneClick={closeEdgeOverlays}
          onNodeClick={closeEdgeOverlays}
          onEdgeClick={handleEdgeClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onEdgesChange={applyCanvasEdgeChanges}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
          onNodesChange={applyCanvasNodeChanges}
        >
          <Background {...flowBackgroundProps} />
          {dragPreview ? (
            <ViewportPortal>
              <div
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute border-2 border-dashed bg-(--accent-primary-muted) opacity-45 transition-all duration-150',
                  dragPreview.isValid ? 'border-(--border-accent)' : 'border-(--state-error) bg-(--state-error-muted)'
                )}
                style={{
                  left: dragPreview.position.x,
                  top: dragPreview.position.y,
                  width: dragPreview.size.width,
                  height: dragPreview.size.height,
                }}
              />
            </ViewportPortal>
          ) : null}
          <PresenceOverlay />
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
      {activeEdgeActionMenu ? (
        <div
          ref={edgeActionMenuRef}
          className="absolute z-50 min-w-36 rounded-lg border border-(--border-default) bg-(--bg-surface-elevated) p-1.5 shadow-(--shadow-lg)"
          style={{
            left: activeEdgeActionMenu.x,
            top: activeEdgeActionMenu.y,
          }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-(--text-primary) transition-colors duration-150 hover:bg-(--bg-subtle)"
            onClick={handleEdgeAddText}
          >
            <PencilLine className="h-4 w-4 text-(--text-secondary)" strokeWidth={1.5} />
            Add text
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-(--state-error) transition-colors duration-150 hover:bg-(--state-error-muted)"
            onClick={handleEdgeDelete}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            Delete
          </button>
        </div>
      ) : null}
      {activeEdgeLabelEditor ? (
        <div
          ref={edgeLabelEditorRef}
          className="absolute z-50 flex items-center gap-1 rounded-xl border border-white/10 bg-(--bg-overlay)/95 p-2 shadow-(--shadow-lg) backdrop-blur-md"
          style={{
            left: activeEdgeLabelEditor.x,
            top: activeEdgeLabelEditor.y,
          }}
          onKeyDownCapture={(event) => event.stopPropagation()}
          onMouseDownCapture={(event) => event.stopPropagation()}
          onPointerDownCapture={(event) => event.stopPropagation()}
        >
          <input
            ref={edgeLabelInputRef}
            type="text"
            value={activeEdgeLabelEditor.draft}
            onChange={(event) => handleEdgeEditorDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.stopPropagation()
                handleEdgeEditorConfirm()
                return
              }

              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                edgeLabelCancelRef.current = true
                setEdgeLabelEditor(null)
              }
            }}
            onBlur={handleEdgeEditorBlur}
            onKeyDownCapture={(event) => event.stopPropagation()}
            onMouseDownCapture={(event) => event.stopPropagation()}
            onPointerDownCapture={(event) => event.stopPropagation()}
            placeholder="Edge text"
            className="h-9 min-w-44 rounded-lg border border-white/10 bg-(--bg-surface-elevated) px-3 text-sm text-(--text-primary) outline-none placeholder:text-(--text-muted) focus:border-(--border-accent)"
          />
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-(--text-secondary) transition-colors duration-150 hover:bg-(--bg-subtle) hover:text-(--text-primary)"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleEdgeEditorConfirm}
            aria-label="Confirm edge text"
          >
            <Check className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-(--text-secondary) transition-colors duration-150 hover:bg-(--bg-subtle) hover:text-(--text-primary)"
            onMouseDown={(event) => {
              event.preventDefault()
              edgeLabelCancelRef.current = true
            }}
            onClick={handleEdgeEditorCancel}
            aria-label="Cancel edge text"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
