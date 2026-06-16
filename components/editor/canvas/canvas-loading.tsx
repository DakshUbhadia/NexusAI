'use client'

import type { ReactElement } from 'react'
import { LoadingScreen } from '@/components/ui/loading-screen'

export function CanvasLoading(): ReactElement {
  return (
    <LoadingScreen 
      title="Connecting to collaborative workspace..." 
      description="Preparing the shared canvas" 
      fullScreen={false} 
    />
  )
}
