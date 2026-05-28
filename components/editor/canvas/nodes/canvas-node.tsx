'use client'

import type { NodeProps } from '@xyflow/react'

import { cn } from '@/lib/utils'
import type { CanvasNode, CanvasNodeShape } from '@/types/canvas'

const SHAPE_SIZE_CLASS: Record<CanvasNodeShape, string> = {
  rectangle: 'h-20 w-44',
  diamond: 'h-24 w-48',
  circle: 'h-24 w-24',
  pill: 'h-20 w-44',
  cylinder: 'h-24 w-40',
  hexagon: 'h-24 w-44',
}

export function CanvasNodeRenderer({ data, selected }: NodeProps<CanvasNode>) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md border bg-(--bg-surface) px-3 text-xs text-(--text-primary) shadow-(--shadow-sm)',
        SHAPE_SIZE_CLASS[data.shape],
        selected ? 'border-(--border-accent) shadow-(--shadow-glow-cyan)' : 'border-(--border-default)'
      )}
    >
      <span className="truncate">{data.label}</span>
    </div>
  )
}
