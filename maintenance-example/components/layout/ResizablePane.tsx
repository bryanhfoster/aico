import React, { useRef } from 'react'

type Props = {
  id: string
  x: number
  y: number
  width: number
  height: number
  onChange: (next: Partial<{ x: number; y: number; width: number; height: number }>) => void
  children: React.ReactNode
}

export function ResizablePane({ id, x, y, width, height, onChange, children }: Props) {
  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const sizeStartRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)

  function onMouseDownMove(e: React.MouseEvent) {
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, origX: x, origY: y }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }
  function onMouseMove(e: MouseEvent) {
    const s = dragStartRef.current
    if (!s) return
    const dx = e.clientX - s.startX
    const dy = e.clientY - s.startY
    onChange({ x: s.origX + dx, y: s.origY + dy })
  }
  function onMouseUp() {
    dragStartRef.current = null
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    // snap to nearest corner if close to edges
    const threshold = 32
    const vw = window.innerWidth
    const vh = window.innerHeight
    const nearLeft = x <= threshold
    const nearRight = vw - (x + width) <= threshold
    const nearTop = y <= threshold
    const nearBottom = vh - (y + height) <= threshold
    if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
      const snapX = nearLeft ? 16 : vw - width - 16
      const snapY = nearTop ? 16 : vh - height - 16
      onChange({ x: Math.max(0, snapX), y: Math.max(0, snapY) })
    }
  }

  function onMouseDownResize(e: React.MouseEvent) {
    e.stopPropagation()
    sizeStartRef.current = { startX: e.clientX, startY: e.clientY, origW: width, origH: height }
    window.addEventListener('mousemove', onMouseResize)
    window.addEventListener('mouseup', onMouseUpResize)
  }
  function onMouseResize(e: MouseEvent) {
    const s = sizeStartRef.current
    if (!s) return
    const dw = e.clientX - s.startX
    const dh = e.clientY - s.startY
    onChange({ width: Math.max(200, s.origW + dw), height: Math.max(120, s.origH + dh) })
  }
  function onMouseUpResize() {
    sizeStartRef.current = null
    window.removeEventListener('mousemove', onMouseResize)
    window.removeEventListener('mouseup', onMouseUpResize)
  }

  return (
    <div
      data-pane-id={id}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(8px)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onMouseDown={onMouseDownMove}
    >
      <div style={{ width: '100%', height: '100%' }}>{children}</div>
      <div
        onMouseDown={onMouseDownResize}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 18,
          height: 18,
          cursor: 'nwse-resize',
          background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.5) 50%)',
        }}
      />
    </div>
  )
}

export default ResizablePane

