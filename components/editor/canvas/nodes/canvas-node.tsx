'use client'

import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import { Handle, Position, type NodeProps } from '@xyflow/react'

import { cn } from '@/lib/utils'
import {
  CANVAS_COLOR_PALETTE,
  DEFAULT_NODE_COLOR_KEY,
  type CanvasNode,
  type CanvasNodeColorKey,
} from '@/types/canvas'

import { NodeEditingContext } from '@/components/editor/canvas/flow/node-editing-context'

const SHAPE_FILL = 'var(--bg-surface)'
const SHAPE_STROKE = 'var(--border-strong)'
const SHAPE_STROKE_SELECTED = 'var(--border-accent)'
const EMPTY_LABEL_PLACEHOLDER = 'Double-click to add label'

const HANDLE_CLASS_NAME =
  'h-6 w-6 flex items-center justify-center rounded-full transition-all duration-200 pointer-events-auto'

type HandleSide = 'top' | 'right' | 'bottom' | 'left'

type ConnectionHandleDescriptor = {
  id: string
  position: Position
}

const CONNECTION_HANDLES: Record<HandleSide, ConnectionHandleDescriptor> = {
  top: {
    id: 'top',
    position: Position.Top,
  },
  right: {
    id: 'right',
    position: Position.Right,
  },
  bottom: {
    id: 'bottom',
    position: Position.Bottom,
  },
  left: {
    id: 'left',
    position: Position.Left,
  },
}

function ConnectionDots() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
        const handle = CONNECTION_HANDLES[side]

        return (
          <div key={handle.id}>
            <Handle
              className={`${HANDLE_CLASS_NAME} -translate-x-1/2 -translate-y-1/2`}
              id={`${handle.id}-source`}
              position={handle.position}
              tabIndex={0}
              type="source"
              aria-label={`${handle.id} connection source`}
              title={`${handle.id} connection source`}
            >
              <span className="h-2.5 w-2.5 rounded-full border border-(--border-default) bg-(--accent-secondary-muted) shadow-(--shadow-sm) transition-all duration-200 hover:border-(--accent-primary) hover:bg-(--accent-primary-muted) hover:shadow-(--shadow-glow-cyan) focus-visible:border-(--accent-primary) focus-visible:bg-(--accent-primary-muted) focus-visible:shadow-(--shadow-glow-cyan)" />
            </Handle>
            <Handle
              className={`${HANDLE_CLASS_NAME} -translate-x-1/2 -translate-y-1/2`}
              id={`${handle.id}-target`}
              position={handle.position}
              tabIndex={0}
              type="target"
              aria-label={`${handle.id} connection target`}
              title={`${handle.id} connection target`}
            >
              <span className="h-2.5 w-2.5 rounded-full border border-(--border-default) bg-(--accent-secondary-muted) shadow-(--shadow-sm) transition-all duration-200 hover:border-(--accent-primary) hover:bg-(--accent-primary-muted) hover:shadow-(--shadow-glow-cyan) focus-visible:border-(--accent-primary) focus-visible:bg-(--accent-primary-muted) focus-visible:shadow-(--shadow-glow-cyan)" />
            </Handle>
          </div>
        )
      })}
    </div>
  )
}

function resolveColorKey(value: unknown): CanvasNodeColorKey {
  if (typeof value === 'string' && value in CANVAS_COLOR_PALETTE) {
    return value as CanvasNodeColorKey
  }

  return DEFAULT_NODE_COLOR_KEY
}

export function CanvasNodeRenderer({ id, data, selected }: NodeProps<CanvasNode>) {
  const { onLabelChange, onColorChange, onResize } = useContext(NodeEditingContext)
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(data.label)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const nodeSize = data.size
  const resolvedWidth = nodeSize.width
  const resolvedHeight = nodeSize.height
  const colorKey = resolveColorKey(data.color)
  const colorPair = CANVAS_COLOR_PALETTE[colorKey]
  const stroke = selected ? SHAPE_STROKE_SELECTED : SHAPE_STROKE
  const textClass = colorPair.textClass
  const placeholderClass = cn(textClass, 'opacity-70')
  const isActiveColor = (value: CanvasNodeColorKey): boolean => value === colorKey

  useEffect(() => {
    if (!isEditing) {
      return
    }

    textareaRef.current?.focus()
    textareaRef.current?.select()
  }, [isEditing])

  const startEditing = (event: MouseEvent<HTMLElement>): void => {
    event.stopPropagation()
    setDraftLabel(data.label)
    setIsEditing(true)
  }

  const stopEditing = (): void => {
    setIsEditing(false)
  }

  const handleLabelChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    const nextLabel = event.target.value
    setDraftLabel(nextLabel)
    onLabelChange(id, nextLabel)
  }

  const handleColorSelect = (nextColor: CanvasNodeColorKey): void => {
    onColorChange(id, nextColor)
  }

  const handleResizePointerDown = (event: ReactPointerEvent) => {
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY

    const el = rootRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const initialWidth = rect.width
    const initialHeight = rect.height

    const pointerId = event.pointerId
    ;(event.target as Element).setPointerCapture(pointerId)

    const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      let nextW = Math.max(80, Math.round(initialWidth + dx))
      let nextH = Math.max(48, Math.round(initialHeight + dy))

      if (data.shape === 'circle') {
        const s = Math.max(nextW, nextH)
        nextW = s
        nextH = s
      }

      onResize?.(id, { width: nextW, height: nextH })
    }

    const onPointerUp = () => {
      ;(event.target as Element).releasePointerCapture(pointerId)
      globalThis.removeEventListener('pointermove', onPointerMove)
      globalThis.removeEventListener('pointerup', onPointerUp)
    }

    globalThis.addEventListener('pointermove', onPointerMove)
    globalThis.addEventListener('pointerup', onPointerUp)
  }

  const handleLabelKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      stopEditing()
      return
    }

    if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
      event.preventDefault()
      stopEditing()
    }
  }

  const labelOverlay = (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className={cn(
            'nodrag nopan nowheel h-10 w-[72%] resize-none rounded-md border border-(--border-strong) bg-(--bg-surface-elevated) px-3 py-2 text-center text-sm outline-none focus:border-(--border-accent) focus:shadow-(--shadow-glow-cyan)',
            textClass
          )}
          onBlur={stopEditing}
          onChange={handleLabelChange}
          onKeyDown={handleLabelKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
          placeholder={EMPTY_LABEL_PLACEHOLDER}
          rows={1}
          value={draftLabel}
        />
      ) : (
        <button
          className="nodrag nopan nowheel pointer-events-auto max-w-[78%] rounded-sm px-2 py-1 text-center text-sm"
          onDoubleClick={startEditing}
          type="button"
        >
          <span
            className={cn(
              'block truncate',
              data.label.trim().length > 0 ? textClass : placeholderClass
            )}
          >
            {data.label.trim().length > 0 ? data.label : EMPTY_LABEL_PLACEHOLDER}
          </span>
        </button>
      )}
    </div>
  )

  const colorToolbar = selected ? (
    <div className="nodrag nopan nowheel absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-10">
      <div className="flex items-center gap-2 rounded-lg border border-(--border-default) bg-(--bg-overlay) px-2 py-1 shadow-(--shadow-md) backdrop-blur">
        {(Object.keys(CANVAS_COLOR_PALETTE) as CanvasNodeColorKey[]).map((key) => {
          const option = CANVAS_COLOR_PALETTE[key]
          const isActive = isActiveColor(key)

          return (
            <button
              key={key}
              className={cn(
                'nodrag nopan nowheel flex h-6 w-6 items-center justify-center rounded-full border border-(--border-default) text-[10px] font-semibold uppercase transition-all duration-200',
                option.backgroundClass,
                option.textClass,
                'hover:border-(--border-accent)',
                option.glowClass,
                isActive ? `ring-2 ring-offset-2 ring-offset-(--bg-overlay) ${option.ringClass}` : 'ring-0'
              )}
              onClick={(event) => {
                event.stopPropagation()
                handleColorSelect(key)
              }}
              onPointerDown={(event) => event.stopPropagation()}
              title={option.label}
              type="button"
            >
              A
            </button>
          )
        })}
      </div>
    </div>
  ) : null

  const resizeHandleElement = selected ? (
    <button
      type="button"
      className="absolute right-0 bottom-0 z-40 translate-x-1/2 translate-y-1/2"
      onPointerDown={handleResizePointerDown}
      aria-label="Resize node"
      title="Resize"
    >
      <div className="h-3 w-3 rounded-sm border border-(--border-default) bg-(--bg-surface-elevated) shadow-(--shadow-sm)" />
    </button>
  ) : null

  if (data.shape === 'rectangle') {
    return (
      <div ref={rootRef} className="relative inline-flex">
        <ConnectionDots />
        {colorToolbar}
        {resizeHandleElement}
        <svg aria-hidden="true" className="overflow-visible drop-shadow-(--shadow-md)" height={resolvedHeight} width={resolvedWidth}>
          <rect fill={colorPair.background || SHAPE_FILL} height={resolvedHeight} rx={22} stroke={stroke} strokeWidth="2" width={resolvedWidth} />
        </svg>
        {labelOverlay}
      </div>
    )
  }

  if (data.shape === 'diamond') {
    const centerX = resolvedWidth / 2
    const centerY = resolvedHeight / 2

    return (
      <div ref={rootRef} className="relative inline-flex">
        <ConnectionDots />
        {colorToolbar}
        {resizeHandleElement}
        <svg aria-hidden="true" className="overflow-visible drop-shadow-(--shadow-md)" height={resolvedHeight} width={resolvedWidth}>
          <polygon
            fill={colorPair.background || SHAPE_FILL}
            points={`${centerX},2 ${resolvedWidth - 2},${centerY} ${centerX},${resolvedHeight - 2} 2,${centerY}`}
            stroke={stroke}
            strokeWidth="2"
          />
        </svg>
        {labelOverlay}
      </div>
    )
  }

  if (data.shape === 'circle') {
    return (
      <div ref={rootRef} className="relative inline-flex">
        <ConnectionDots />
        {colorToolbar}
        {resizeHandleElement}
        <svg aria-hidden="true" className="overflow-visible drop-shadow-(--shadow-md)" height={resolvedHeight} width={resolvedWidth}>
          <ellipse
            cx={resolvedWidth / 2}
            cy={resolvedHeight / 2}
            fill={colorPair.background || SHAPE_FILL}
            rx={(resolvedWidth - 2) / 2}
            ry={(resolvedHeight - 2) / 2}
            stroke={stroke}
            strokeWidth="2"
          />
        </svg>
        {labelOverlay}
      </div>
    )
  }

  if (data.shape === 'pill') {
    return (
      <div ref={rootRef} className="relative inline-flex">
        <ConnectionDots />
        {colorToolbar}
        {resizeHandleElement}
        <svg aria-hidden="true" className="overflow-visible drop-shadow-(--shadow-md)" height={resolvedHeight} width={resolvedWidth}>
          <rect fill={colorPair.background || SHAPE_FILL} height={resolvedHeight} rx={resolvedHeight / 2} stroke={stroke} strokeWidth="2" width={resolvedWidth} />
        </svg>
        {labelOverlay}
      </div>
    )
  }

  if (data.shape === 'cylinder') {
    const radiusX = resolvedWidth / 2
    const capRadiusY = Math.max(14, Math.round(resolvedHeight * 0.14))
    const capY = capRadiusY + 1
    const bodyTop = capY
    const bodyBottom = resolvedHeight - capRadiusY - 1
    const centerX = resolvedWidth / 2

    return (
      <div ref={rootRef} className="relative inline-flex">
        <ConnectionDots />
        {colorToolbar}
        {resizeHandleElement}
        <svg aria-hidden="true" className="overflow-visible drop-shadow-(--shadow-md)" height={resolvedHeight} width={resolvedWidth}>
          <path
            d={`M1 ${bodyTop} A ${radiusX - 1} ${capRadiusY} 0 0 1 ${resolvedWidth - 1} ${bodyTop} V ${bodyBottom} A ${radiusX - 1} ${capRadiusY} 0 0 1 1 ${bodyBottom} Z`}
            fill={colorPair.background || SHAPE_FILL}
            stroke={stroke}
            strokeWidth="2"
          />
          <ellipse cx={centerX} cy={capY} fill={colorPair.background || SHAPE_FILL} rx={radiusX - 1} ry={capRadiusY} stroke={stroke} strokeWidth="2" />
        </svg>
        {labelOverlay}
      </div>
    )
  }

  if (data.shape === 'hexagon') {
    const insetX = Math.round(resolvedWidth * 0.17)

    return (
      <div ref={rootRef} className="relative inline-flex">
        <ConnectionDots />
        {colorToolbar}
        {resizeHandleElement}
        <svg aria-hidden="true" className="overflow-visible drop-shadow-(--shadow-md)" height={resolvedHeight} width={resolvedWidth}>
          <polygon
            fill={colorPair.background || SHAPE_FILL}
            points={`${insetX},2 ${resolvedWidth - insetX},2 ${resolvedWidth - 2},${resolvedHeight / 2} ${resolvedWidth - insetX},${resolvedHeight - 2} ${insetX},${resolvedHeight - 2} 2,${resolvedHeight / 2}`}
            stroke={stroke}
            strokeWidth="2"
          />
        </svg>
        {labelOverlay}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-md border bg-(--bg-surface) px-3 text-xs text-(--text-primary) shadow-(--shadow-sm)',
        selected ? 'border-(--border-accent) shadow-(--shadow-glow-cyan)' : 'border-(--border-default)'
      )}
    >
      <ConnectionDots />
      {colorToolbar}
      {resizeHandleElement}
      {labelOverlay}
    </div>
  )
}
