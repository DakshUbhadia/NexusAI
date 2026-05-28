'use client'

import type { DragEvent } from 'react'

import { cn } from '@/lib/utils'
import type { CanvasNodeShape, CanvasNodeSize } from '@/types/canvas'

export const SHAPE_DRAG_MIME = 'application/x-nexus-shape'

export type ShapeDragPayload = {
  shape: CanvasNodeShape
  size: CanvasNodeSize
}

type ShapeConfig = {
  shape: CanvasNodeShape
  label: string
  size: CanvasNodeSize
}

const SHAPES: ShapeConfig[] = [
  {
    shape: 'rectangle',
    label: 'Rectangle',
    size: { width: 176, height: 80 },
  },
  {
    shape: 'diamond',
    label: 'Diamond',
    size: { width: 192, height: 96 },
  },
  {
    shape: 'circle',
    label: 'Circle',
    size: { width: 96, height: 96 },
  },
  {
    shape: 'pill',
    label: 'Pill',
    size: { width: 176, height: 80 },
  },
  {
    shape: 'cylinder',
    label: 'Cylinder',
    size: { width: 160, height: 96 },
  },
  {
    shape: 'hexagon',
    label: 'Hexagon',
    size: { width: 176, height: 96 },
  },
]

function buildPayload(config: ShapeConfig): ShapeDragPayload {
  return {
    shape: config.shape,
    size: config.size,
  }
}

function handleDragStart(event: DragEvent<HTMLButtonElement>, config: ShapeConfig) {
  const payload = buildPayload(config)
  event.dataTransfer.setData(SHAPE_DRAG_MIME, JSON.stringify(payload))
  event.dataTransfer.setData('text/plain', config.shape)
  event.dataTransfer.effectAllowed = 'copy'
}

type ShapeIconProps = {
  readonly shape: CanvasNodeShape
}

function ShapeIcon({ shape }: ShapeIconProps) {
  const sharedProps = {
    className: 'h-4 w-4',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (shape) {
    case 'rectangle':
      return (
        <svg {...sharedProps} aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2" />
        </svg>
      )
    case 'diamond':
      return (
        <svg {...sharedProps} aria-hidden="true">
          <polygon points="12 4 20 12 12 20 4 12" />
        </svg>
      )
    case 'circle':
      return (
        <svg {...sharedProps} aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
        </svg>
      )
    case 'pill':
      return (
        <svg {...sharedProps} aria-hidden="true">
          <rect x="4" y="8" width="16" height="8" rx="4" />
        </svg>
      )
    case 'cylinder':
      return (
        <svg {...sharedProps} aria-hidden="true">
          <ellipse cx="12" cy="7" rx="6" ry="3" />
          <path d="M6 7v10" />
          <path d="M18 7v10" />
          <path d="M6 17c0 1.7 2.7 3 6 3s6-1.3 6-3" />
        </svg>
      )
    case 'hexagon':
      return (
        <svg {...sharedProps} aria-hidden="true">
          <polygon points="7 4 17 4 22 12 17 20 7 20 2 12" />
        </svg>
      )
    default:
      return null
  }
}

type ShapePanelProps = {
  readonly className?: string
}

export function ShapePanel({ className }: ShapePanelProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-(--border-default) bg-(--bg-overlay) px-3 py-2 shadow-(--shadow-lg) backdrop-blur-xl',
        className
      )}
    >
      {SHAPES.map((config) => (
        <button
          key={config.shape}
          aria-label={`Drag ${config.label}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-(--border-default) bg-(--bg-surface) text-(--text-secondary) transition-colors duration-200 hover:border-(--border-strong) hover:bg-(--bg-subtle) hover:text-(--text-primary)"
          draggable
          onDragStart={(event) => handleDragStart(event, config)}
          type="button"
        >
          <ShapeIcon shape={config.shape} />
        </button>
      ))}
    </div>
  )
}
