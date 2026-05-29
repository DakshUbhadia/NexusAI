import React from 'react'
import { Undo, Redo, Plus, Minus, Maximize2, Trash2 } from 'lucide-react'

type Props = Readonly<{
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onDelete: () => void
  canDelete: boolean
}>

export default function CanvasControls(props: Props) {
  const { onZoomIn, onZoomOut, onFitView, onUndo, onRedo, canUndo, canRedo, onDelete, canDelete } = props
  return (
    <div className="flex items-center gap-2 rounded-full bg-(--bg-overlay) border border-(--border-default) px-2 py-1 shadow-(--shadow-sm)">
        {/* Zoom group */}
        <div className="flex items-center gap-1">
          <button aria-label="Zoom out" type="button" onClick={onZoomOut} className="p-2 rounded hover:bg-(--bg-surface-elevated)">
            <Minus className="w-4 h-4" />
          </button>
          <button aria-label="Fit view" type="button" onClick={onFitView} className="p-2 rounded hover:bg-(--bg-surface-elevated)">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button aria-label="Zoom in" type="button" onClick={onZoomIn} className="p-2 rounded hover:bg-(--bg-surface-elevated)">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 border-l border-(--border-default) mx-1" />

        {/* History group */}
        <div className="flex items-center gap-1">
          <button aria-label="Undo" type="button" onClick={onUndo} disabled={!canUndo} className={`p-2 rounded ${canUndo ? 'hover:bg-(--bg-surface-elevated)' : 'opacity-40'}`}>
            <Undo className="w-4 h-4" />
          </button>
          <button aria-label="Redo" type="button" onClick={onRedo} disabled={!canRedo} className={`p-2 rounded ${canRedo ? 'hover:bg-(--bg-surface-elevated)' : 'opacity-40'}`}>
            <Redo className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 border-l border-(--border-default) mx-1" />

        {/* Delete */}
        <div>
          <button aria-label="Delete selected" type="button" onClick={onDelete} disabled={!canDelete} className={`p-2 rounded ${canDelete ? 'hover:bg-(--bg-surface-elevated) text-red-400' : 'opacity-40'}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
  )
}
