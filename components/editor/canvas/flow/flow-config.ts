import { BackgroundVariant, type BackgroundProps, type MiniMapProps } from '@xyflow/react'

export const flowBackgroundProps = {
  variant: BackgroundVariant.Dots,
  gap: 26,
  size: 2.2,
  color: 'var(--border-default)',
  bgColor: 'var(--bg-base)',
  patternClassName: 'nexus-flow-pattern',
} satisfies BackgroundProps

export const miniMapProps = {
  position: 'bottom-right',
  nodeColor: 'var(--accent-secondary-muted)',
  nodeStrokeColor: 'var(--accent-secondary)',
  maskColor: 'var(--bg-overlay)',
} satisfies MiniMapProps
