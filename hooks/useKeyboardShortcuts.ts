import { useEffect } from 'react'

type Handlers = {
  zoomIn?: () => void
  zoomOut?: () => void
  fitView?: () => void
  undo?: () => void
  redo?: () => void
  del?: () => void
}

export default function useKeyboardShortcuts(handlers: Handlers) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName ?? ''
      const isEditable =
        target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (isEditable) return

      // + or = → zoom in
      if ((e.key === '+' || e.key === '=') && handlers.zoomIn) {
        e.preventDefault()
        handlers.zoomIn()
      }

      // - → zoom out
      if (e.key === '-' && handlers.zoomOut) {
        e.preventDefault()
        handlers.zoomOut()
      }

      // Cmd/Ctrl + Z → undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        handlers.undo?.()
      }

      // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y → redo
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault()
        handlers.redo?.()
      }

      // Delete / Backspace → delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handlers.del?.()
      }

      // Fit view via Home key (optional)
      if (e.key === 'Home' && handlers.fitView) {
        e.preventDefault()
        handlers.fitView()
      }
    }

    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [handlers])
}
