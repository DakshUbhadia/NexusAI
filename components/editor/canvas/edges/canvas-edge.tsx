'use client'

import { memo } from 'react'

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

import { cn } from '@/lib/utils'
import type { CanvasEdge } from '@/types/canvas'

function resolveEdgeLabel(edgeData: CanvasEdge['data']): string {
  return edgeData?.label?.trim() ?? ''
}

function CanvasEdgeRendererComponent(props: EdgeProps<CanvasEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, selected, data } = props
  const resolvedLabel = resolveEdgeLabel(data)
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
    offset: 32,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {resolvedLabel ? (
        <EdgeLabelRenderer>
          <div
            className={cn(
              'nodrag nopan pointer-events-auto absolute select-none rounded-full border border-white/10 bg-(--bg-overlay)/90 px-2.5 py-1 text-[11px] font-medium leading-none text-(--text-primary) shadow-(--shadow-md) backdrop-blur-md',
              selected ? 'border-(--accent-secondary)/40' : ''
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {resolvedLabel}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}

export const CanvasEdgeRenderer = memo(CanvasEdgeRendererComponent)
