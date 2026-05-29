'use client'

import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'

import { Handle, Position, type NodeProps } from '@xyflow/react'

import { cn } from '@/lib/utils'
import type { CanvasNode } from '@/types/canvas'

import { NodeEditingContext } from '@/components/editor/canvas/flow/node-editing-context'

const SHAPE_FILL = 'var(--bg-surface)'
const SHAPE_STROKE = 'var(--border-strong)'
const SHAPE_STROKE_SELECTED = 'var(--border-accent)'
const EMPTY_LABEL_PLACEHOLDER = 'Double-click to add label'

const HANDLE_CLASS_NAME =
  'h-2.5 w-2.5 rounded-full border border-(--border-default) bg-(--accent-secondary-muted) shadow-(--shadow-sm) transition-all duration-200 hover:border-(--accent-primary) hover:bg-(--accent-primary-muted) hover:shadow-(--shadow-glow-cyan) focus-visible:border-(--accent-primary) focus-visible:bg-(--accent-primary-muted) focus-visible:shadow-(--shadow-glow-cyan)'

type HandleSide = 'top' | 'right' | 'bottom' | 'left'

type ConnectionHandleDescriptor = {
  id: string
  position: Position
  className: string
}

const CONNECTION_HANDLES: Record<HandleSide, ConnectionHandleDescriptor> = {
  top: {
    id: 'top',
    position: Position.Top,
    className: 'left-1/2 top-0',
  },
  right: {
    id: 'right',
    position: Position.Right,
    className: 'right-0 top-1/2',
  },
  bottom: {
    id: 'bottom',
    position: Position.Bottom,
    className: 'left-1/2 bottom-0',
  },
  left: {
    id: 'left',
    position: Position.Left,
    className: 'left-0 top-1/2',
  },
}

function ConnectionDots(): React.ReactElement {
  return (
    <>
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
        const handle = CONNECTION_HANDLES[side]

        return (
          <div key={handle.id} className="pointer-events-none absolute inset-0 z-20">
            <Handle
              className={`${HANDLE_CLASS_NAME} pointer-events-auto -translate-x-1/2 -translate-y-1/2`}
              id={`${handle.id}-source`}
              isConnectableStart
              isConnectableEnd
              position={handle.position}
              tabIndex={0}
              type="source"
              aria-label={`${handle.id} connection source`}
              title={`${handle.id} connection source`}
            />
            <Handle
              className={`${HANDLE_CLASS_NAME} pointer-events-auto -translate-x-1/2 -translate-y-1/2`}
              id={`${handle.id}-target`}
              isConnectableStart
              isConnectableEnd
              position={handle.position}
              tabIndex={0}
              type="target"
              aria-label={`${handle.id} connection target`}
              title={`${handle.id} connection target`}
            />
          </div>
        )
      })}
    </>
  )
}

export function CanvasNodeRenderer({ id, data, selected }: NodeProps<CanvasNode>) {
  const { onLabelChange } = useContext(NodeEditingContext)
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(data.label)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const nodeSize = data.size
  const resolvedWidth = nodeSize.width
  const resolvedHeight = nodeSize.height
  const stroke = selected ? SHAPE_STROKE_SELECTED : SHAPE_STROKE

  useEffect(() => {
    if (!isEditing) {
      setDraftLabel(data.label)
    }
  }, [data.label, isEditing])

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
          className="nodrag nopan nowheel h-10 w-[72%] resize-none rounded-md border border-(--border-strong) bg-(--bg-surface-elevated) px-3 py-2 text-center text-sm text-(--text-primary) outline-none focus:border-(--border-accent) focus:shadow-(--shadow-glow-cyan)"
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
              data.label.trim().length > 0 ? 'text-(--text-primary)' : 'text-(--text-muted)'
            )}
          >
            {data.label.trim().length > 0 ? data.label : EMPTY_LABEL_PLACEHOLDER}
          </span>
        </button>
      )}
    </div>
  )

  if (data.shape === 'rectangle') {
    return (
      <div className="relative inline-flex">
        <ConnectionDots />
        <svg aria-hidden="true" className="overflow-visible drop-shadow-(--shadow-md)" height={resolvedHeight} width={resolvedWidth}>
          <rect fill={SHAPE_FILL} height={resolvedHeight} rx={22} stroke={stroke} strokeWidth="2" width={resolvedWidth} />
        </svg>
        {labelOverlay}
      </div>
    )
  }

  if (data.shape === 'diamond') {
    const centerX = resolvedWidth / 2
    const centerY = resolvedHeight / 2

    return (
      <div className="relative inline-flex">
        <ConnectionDots />
        <svg aria-hidden="true" className="overflow-visible drop-shadow-(--shadow-md)" height={resolvedHeight} width={resolvedWidth}>
          <polygon
            fill={SHAPE_FILL}
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
      <div className="relative inline-flex">
        <ConnectionDots />
        <svg aria-hidden="true" className="overflow-visible drop-shadow-(--shadow-md)" height={resolvedHeight} width={resolvedWidth}>
          <ellipse
            cx={resolvedWidth / 2}
            cy={resolvedHeight / 2}
            fill={SHAPE_FILL}
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
      <div className="relative inline-flex">
        <ConnectionDots />
        <svg aria-hidden="true" className="overflow-visible drop-shadow-(--shadow-md)" height={resolvedHeight} width={resolvedWidth}>
          <rect fill={SHAPE_FILL} height={resolvedHeight} rx={resolvedHeight / 2} stroke={stroke} strokeWidth="2" width={resolvedWidth} />
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
      <div className="relative inline-flex">
        <ConnectionDots />
        <svg aria-hidden="true" className="overflow-visible drop-shadow-(--shadow-md)" height={resolvedHeight} width={resolvedWidth}>
          <path
            d={`M1 ${bodyTop} A ${radiusX - 1} ${capRadiusY} 0 0 1 ${resolvedWidth - 1} ${bodyTop} V ${bodyBottom} A ${radiusX - 1} ${capRadiusY} 0 0 1 1 ${bodyBottom} Z`}
            fill={SHAPE_FILL}
            stroke={stroke}
            strokeWidth="2"
          />
          <ellipse cx={centerX} cy={capY} fill={SHAPE_FILL} rx={radiusX - 1} ry={capRadiusY} stroke={stroke} strokeWidth="2" />
        </svg>
        {labelOverlay}
      </div>
    )
  }

  if (data.shape === 'hexagon') {
    const insetX = Math.round(resolvedWidth * 0.17)

    return (
      <div className="relative inline-flex">
        <ConnectionDots />
        <svg aria-hidden="true" className="overflow-visible drop-shadow-(--shadow-md)" height={resolvedHeight} width={resolvedWidth}>
          <polygon
            fill={SHAPE_FILL}
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
      {labelOverlay}
    </div>
  )
}
