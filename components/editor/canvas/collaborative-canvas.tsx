'use client'

import { Component, type ErrorInfo, type ReactElement, type ReactNode, useCallback, useState } from 'react'

import dynamic from 'next/dynamic'

import { ClientSideSuspense } from '@liveblocks/react'

import { CanvasError } from '@/components/editor/canvas/canvas-error'
import { CanvasLoading } from '@/components/editor/canvas/canvas-loading'
import type { CanvasTemplateImportRequest } from '@/components/editor/starter-templates'
import type { CanvasSaveStatus } from '@/hooks/useCanvasAutosave'

const FlowCanvas = dynamic(() => import('./flow/flow-canvas').then((mod) => mod.FlowCanvas), {
  ssr: false,
})

interface CollaborativeCanvasProps {
  readonly projectId: string
  readonly templateImportRequest?: CanvasTemplateImportRequest | null
  readonly onSaveNowChange?: (saveNow: (() => Promise<void>) | null) => void
  readonly onSaveErrorMessageChange?: (message: string | null) => void
  readonly onSaveStatusChange?: (status: CanvasSaveStatus) => void
}

interface CanvasErrorBoundaryProps {
  readonly children: ReactNode
  readonly onRetry: () => void
}

type CanvasErrorBoundaryState = {
  hasError: boolean
}

class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  state: CanvasErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Canvas render failed.', { error, errorInfo })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <CanvasError onRetry={this.props.onRetry} />
    }

    return this.props.children
  }
}

export function CollaborativeCanvas({
  projectId,
  onSaveErrorMessageChange,
  onSaveNowChange,
  onSaveStatusChange,
  templateImportRequest = null,
}: CollaborativeCanvasProps): ReactElement {
  const [retryKey, setRetryKey] = useState(0)

  const handleRetry = useCallback(() => {
    setRetryKey((current) => current + 1)
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-(--bg-base)">
      <CanvasErrorBoundary onRetry={handleRetry}>
        <ClientSideSuspense fallback={<CanvasLoading />}>
          <FlowCanvas
            key={retryKey}
            onSaveErrorMessageChange={onSaveErrorMessageChange}
            onSaveNowChange={onSaveNowChange}
            onSaveStatusChange={onSaveStatusChange}
            projectId={projectId}
            templateImportRequest={templateImportRequest}
          />
        </ClientSideSuspense>
      </CanvasErrorBoundary>
    </div>
  )
}
