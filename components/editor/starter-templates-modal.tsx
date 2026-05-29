'use client'

import type { ReactElement } from 'react'

import { LayoutTemplate } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  CANVAS_TEMPLATES,
  type CanvasTemplate,
} from '@/components/editor/starter-templates'
import { CANVAS_COLOR_PALETTE, type CanvasNode, type CanvasNodeShape } from '@/types/canvas'
import { cn } from '@/lib/utils'

type StarterTemplatesModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (template: CanvasTemplate) => void
}

type TemplateBounds = {
  minX: number
  minY: number
  width: number
  height: number
}

const PREVIEW_VIEWBOX_WIDTH = 720
const PREVIEW_VIEWBOX_HEIGHT = 420
const PREVIEW_PADDING = 42

function calculateBounds(nodes: readonly CanvasNode[]): TemplateBounds {
  if (nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      width: PREVIEW_VIEWBOX_WIDTH,
      height: PREVIEW_VIEWBOX_HEIGHT,
    }
  }

  const minX = Math.min(...nodes.map((node) => node.position.x))
  const minY = Math.min(...nodes.map((node) => node.position.y))
  const maxX = Math.max(...nodes.map((node) => node.position.x + node.data.size.width))
  const maxY = Math.max(...nodes.map((node) => node.position.y + node.data.size.height))

  return {
    minX,
    minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  }
}

function getNodeCenter(node: CanvasNode): { x: number; y: number } {
  return {
    x: node.position.x + node.data.size.width / 2,
    y: node.position.y + node.data.size.height / 2,
  }
}

function renderPreviewShape(node: CanvasNode, scale: number, offsetX: number, offsetY: number): ReactElement {
  const x = (node.position.x - offsetX) * scale + PREVIEW_PADDING
  const y = (node.position.y - offsetY) * scale + PREVIEW_PADDING
  const width = node.data.size.width * scale
  const height = node.data.size.height * scale
  const colorPair = CANVAS_COLOR_PALETTE[node.data.color]
  const commonProps = {
    fill: colorPair.background,
    stroke: colorPair.text,
    strokeWidth: 1.7,
  }

  if (node.data.shape === 'rectangle') {
    return <rect {...commonProps} height={height} rx={10} width={width} x={x} y={y} />
  }

  if (node.data.shape === 'diamond') {
    const centerX = x + width / 2
    const centerY = y + height / 2

    return (
      <polygon
        {...commonProps}
        points={`${centerX},${y} ${x + width},${centerY} ${centerX},${y + height} ${x},${centerY}`}
      />
    )
  }

  if (node.data.shape === 'circle') {
    return (
      <ellipse
        {...commonProps}
        cx={x + width / 2}
        cy={y + height / 2}
        rx={width / 2}
        ry={height / 2}
      />
    )
  }

  if (node.data.shape === 'pill') {
    return <rect {...commonProps} height={height} rx={height / 2} width={width} x={x} y={y} />
  }

  if (node.data.shape === 'cylinder') {
    const radiusX = width / 2
    const capRadiusY = Math.max(6, height * 0.14)
    const top = y + capRadiusY
    const bottom = y + height - capRadiusY
    const centerX = x + width / 2

    return (
      <g>
        <path
          {...commonProps}
          d={`M${x} ${top} A ${radiusX} ${capRadiusY} 0 0 1 ${x + width} ${top} V ${bottom} A ${radiusX} ${capRadiusY} 0 0 1 ${x} ${bottom} Z`}
        />
        <ellipse {...commonProps} cx={centerX} cy={top} rx={radiusX} ry={capRadiusY} />
      </g>
    )
  }

  const shape: CanvasNodeShape = node.data.shape
  if (shape === 'hexagon') {
    const insetX = width * 0.17
    return (
      <polygon
        {...commonProps}
        points={`${x + insetX},${y} ${x + width - insetX},${y} ${x + width},${y + height / 2} ${x + width - insetX},${y + height} ${x + insetX},${y + height} ${x},${y + height / 2}`}
      />
    )
  }

  return <rect {...commonProps} height={height} rx={10} width={width} x={x} y={y} />
}

function TemplatePreview({ template }: { template: CanvasTemplate }): ReactElement {
  const bounds = calculateBounds(template.nodes)
  const scale = Math.min(
    (PREVIEW_VIEWBOX_WIDTH - PREVIEW_PADDING * 2) / bounds.width,
    (PREVIEW_VIEWBOX_HEIGHT - PREVIEW_PADDING * 2) / bounds.height
  )
  const scaledWidth = bounds.width * scale
  const scaledHeight = bounds.height * scale
  const centerOffsetX = (PREVIEW_VIEWBOX_WIDTH - scaledWidth) / 2 - PREVIEW_PADDING
  const centerOffsetY = (PREVIEW_VIEWBOX_HEIGHT - scaledHeight) / 2 - PREVIEW_PADDING
  const nodeById = new Map(template.nodes.map((node) => [node.id, node]))

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      height={PREVIEW_VIEWBOX_HEIGHT}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      viewBox={`0 0 ${PREVIEW_VIEWBOX_WIDTH} ${PREVIEW_VIEWBOX_HEIGHT}`}
      width={PREVIEW_VIEWBOX_WIDTH}
    >
      <defs>
        <linearGradient id={`preview-surface-${template.id}`} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="var(--bg-base)" />
          <stop offset="100%" stopColor="var(--bg-surface)" />
        </linearGradient>
      </defs>

      <rect
        fill={`url(#preview-surface-${template.id})`}
        height={PREVIEW_VIEWBOX_HEIGHT}
        rx={14}
        width={PREVIEW_VIEWBOX_WIDTH}
        x={0}
        y={0}
      />

      {template.edges.map((edge) => {
        const source = nodeById.get(edge.source)
        const target = nodeById.get(edge.target)

        if (!source || !target) {
          return null
        }

        const sourceCenter = getNodeCenter(source)
        const targetCenter = getNodeCenter(target)
        const x1 = (sourceCenter.x - bounds.minX) * scale + PREVIEW_PADDING + centerOffsetX
        const y1 = (sourceCenter.y - bounds.minY) * scale + PREVIEW_PADDING + centerOffsetY
        const x2 = (targetCenter.x - bounds.minX) * scale + PREVIEW_PADDING + centerOffsetX
        const y2 = (targetCenter.y - bounds.minY) * scale + PREVIEW_PADDING + centerOffsetY

        return (
          <line
            key={edge.id}
            stroke="var(--accent-secondary)"
            strokeOpacity={0.68}
            strokeLinecap="round"
            strokeWidth={1.5}
            x1={x1}
            x2={x2}
            y1={y1}
            y2={y2}
          />
        )
      })}

      {template.nodes.map((node) => (
        <g key={node.id}>
          {renderPreviewShape(
            node,
            scale,
            bounds.minX - centerOffsetX / scale,
            bounds.minY - centerOffsetY / scale
          )}
          <text
            dominantBaseline="middle"
            fill={CANVAS_COLOR_PALETTE[node.data.color].text}
            fontFamily="var(--font-sans)"
            fontSize={Math.max(8, Math.min(10, node.data.size.width * scale * 0.085))}
            fontWeight={600}
            textAnchor="middle"
            x={(node.position.x + node.data.size.width / 2 - bounds.minX) * scale + PREVIEW_PADDING + centerOffsetX}
            y={(node.position.y + node.data.size.height / 2 - bounds.minY) * scale + PREVIEW_PADDING + centerOffsetY}
          >
            {node.data.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function TemplateCard({
  template,
  onImport,
}: {
  template: CanvasTemplate
  onImport: (template: CanvasTemplate) => void
}): ReactElement {
  return (
    <article
      className={cn(
        'group flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-(--border-default) bg-(--bg-surface) shadow-(--shadow-md) transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-(--border-strong) hover:bg-(--bg-surface-elevated) hover:shadow-(--shadow-lg)',
        'focus-within:border-(--border-accent) focus-within:shadow-(--shadow-glow-cyan)'
      )}
    >
      <div className="shrink-0 border-b border-(--border-subtle) bg-(--bg-base) p-3">
        <div className="aspect-[16/9] w-full overflow-hidden rounded-md border border-(--border-subtle) bg-(--bg-base)">
          <TemplatePreview template={template} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold leading-snug text-(--text-primary)">
              {template.name}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-(--text-secondary)">
              {template.description}
            </p>
          </div>

          {template.recommended ? (
            <span className="shrink-0 rounded-sm border border-(--border-accent) bg-(--accent-primary-muted) px-2 py-1 text-xs font-semibold text-(--accent-secondary)">
              Featured
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex shrink-0 items-center justify-between gap-4 pt-2">
          <span className="rounded-sm border border-(--border-default) bg-(--bg-base) px-2 py-1 text-xs font-medium text-(--text-secondary)">
            {template.category}
          </span>

          <Button
            className="h-10 gap-2 px-4 shadow-(--shadow-sm)"
            onClick={() => onImport(template)}
            type="button"
          >
            <LayoutTemplate className="size-4" />
            Import
          </Button>
        </div>
      </div>
    </article>
  )
}

export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps): ReactElement {
  const handleImport = (template: CanvasTemplate): void => {
    onImport(template)
    onOpenChange(false)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={cn(
          'fixed left-1/2 top-1/2 h-[min(80vh,820px)] !w-[98vw] !max-w-[2400px] -translate-x-1/2 -translate-y-1/2',
          'gap-0 overflow-hidden border border-(--border-default) bg-(--bg-surface-elevated) p-0 text-(--text-primary) shadow-(--shadow-lg)'
        )}
        style={{
          width: '98vw',
          maxWidth: '2400px',
        }}
      >
        <DialogHeader className="border-b border-(--border-default) bg-(--bg-overlay) px-6 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-(--border-default) bg-(--accent-primary-muted)">
              <LayoutTemplate className="size-5 text-(--accent-secondary)" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-(--text-primary)">
                Starter Templates
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-(--text-secondary)">
                Start with a prebuilt diagram and replace the current canvas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 px-6 py-6 sm:px-8">
          <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr">
            {CANVAS_TEMPLATES.map((template) => (
              <TemplateCard key={template.id} onImport={handleImport} template={template} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 