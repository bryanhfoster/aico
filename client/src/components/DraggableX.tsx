import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface DraggableXProps {
  children: ReactNode
  initialX?: number
  initialY?: number
  disabled?: boolean
  ariaLabel?: string
  centerDeadZonePx?: number
  onDragEnd?: (result: { x: number; y: number; detached: boolean }) => void
  resetToCenterSignal?: number
}

// Horizontal-only draggable wrapper. Keeps internal translateX state.
export default function DraggableX({ children, initialX = 0, initialY = 0, disabled = false, ariaLabel, centerDeadZonePx = 60, onDragEnd, resetToCenterSignal }: DraggableXProps) {
  const [offsetX, setOffsetX] = useState<number>(initialX)
  const [offsetY, setOffsetY] = useState<number>(initialY)
  const [dragging, setDragging] = useState<boolean>(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const startXRef = useRef<number>(0)
  const startYRef = useRef<number>(0)
  const startOffsetXRef = useRef<number>(0)
  const startOffsetYRef = useRef<number>(0)
  const startRectRef = useRef<DOMRect | null>(null)

  const isInteractiveTarget = useCallback((el: EventTarget | null) => {
    if (!(el instanceof HTMLElement)) return false
    const tag = el.tagName.toLowerCase()
    return tag === 'input' || tag === 'textarea' || tag === 'button' || el.getAttribute('contenteditable') === 'true'
  }, [])

  const onPointerDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (disabled) return
      const isTouch = 'touches' in e
      const pointX = isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX
      const pointY = isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY
      if ('button' in e && (e as React.MouseEvent).button !== 0) return // only primary button
      if ('target' in e && isInteractiveTarget(e.target)) return
      startXRef.current = pointX
      startYRef.current = pointY
      startOffsetXRef.current = offsetX
      startOffsetYRef.current = offsetY
      startRectRef.current = wrapperRef.current?.getBoundingClientRect() ?? null
      setDragging(true)
    },
    [disabled, offsetX, offsetY, isInteractiveTarget],
  )

  useEffect(() => {
    if (!dragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const isTouch = e instanceof TouchEvent
      const touch = isTouch ? (e as TouchEvent).touches[0] ?? (e as TouchEvent).changedTouches[0] : undefined
      const pointX = isTouch ? touch?.clientX ?? 0 : (e as MouseEvent).clientX
      const pointY = isTouch ? touch?.clientY ?? 0 : (e as MouseEvent).clientY
      const deltaX = pointX - startXRef.current
      const deltaY = pointY - startYRef.current
      let desiredX = startOffsetXRef.current + deltaX
      let desiredY = startOffsetYRef.current + deltaY

      // Clamp within viewport based on starting rect
      const sr = startRectRef.current
      if (sr) {
        const viewportW = window.innerWidth
        const viewportH = window.innerHeight
        const moveX = desiredX - startOffsetXRef.current
        const moveY = desiredY - startOffsetYRef.current
        let newLeft = sr.left + moveX
        let newRight = sr.right + moveX
        let newTop = sr.top + moveY
        let newBottom = sr.bottom + moveY

        if (newLeft < 0) {
          const adjust = -newLeft
          desiredX += adjust
          newLeft += adjust
          newRight += adjust
        }
        if (newRight > viewportW) {
          const adjust = newRight - viewportW
          desiredX -= adjust
          newLeft -= adjust
          newRight -= adjust
        }
        if (newTop < 0) {
          const adjust = -newTop
          desiredY += adjust
          newTop += adjust
          newBottom += adjust
        }
        if (newBottom > viewportH) {
          const adjust = newBottom - viewportH
          desiredY -= adjust
          // newTop/newBottom not needed further
        }
      }

      setOffsetX(desiredX)
      setOffsetY(desiredY)
    }

    const handleUp = () => {
      // Only allow drop outside of the center dead zone vertically; otherwise snap back to center
      setDragging(false)
      setOffsetY((y) => {
        const detached = Math.abs(y) >= centerDeadZonePx
        const finalY = detached ? y : 0
        if (onDragEnd) {
          onDragEnd({ x: offsetX, y: finalY, detached })
        }
        return finalY
      })
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [dragging, centerDeadZonePx, offsetX, onDragEnd])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return
      const step = e.shiftKey ? 20 : 8
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setOffsetX((x) => x - step)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setOffsetX((x) => x + step)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setOffsetY((y) => y - step)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setOffsetY((y) => y + step)
      } else if (e.key === 'Home') {
        e.preventDefault()
        setOffsetX(0)
        setOffsetY(0)
      }
    },
    [disabled],
  )

  // external reset to center when signal changes
  useEffect(() => {
    if (resetToCenterSignal !== undefined) {
      setOffsetX(0)
      setOffsetY(0)
    }
  }, [resetToCenterSignal])

  const style = useMemo<React.CSSProperties>(() => ({
    transform: `translate(${Math.round(offsetX)}px, ${Math.round(offsetY)}px)`,
    cursor: disabled ? 'default' : dragging ? 'grabbing' : 'grab',
    touchAction: 'none',
    alignSelf: 'stretch',
    display: 'flex',
  }), [offsetX, offsetY, dragging, disabled])

  return (
    <div
      role="group"
      aria-roledescription="draggable x"
      aria-label={ariaLabel}
      aria-grabbed={dragging}
      tabIndex={0}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      onKeyDown={onKeyDown}
      style={style}
    >
      {children}
    </div>
  )
}


