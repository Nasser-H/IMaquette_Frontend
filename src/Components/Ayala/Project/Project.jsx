import React, { useCallback, useEffect, useRef, useState } from 'react'

export default function Project() {
  const containerRef = useRef(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 })
  const dragAxisRef = useRef(null) // unused now; kept for minimal churn
  const fitScaleRef = useRef(1)
  const activePointersRef = useRef(new Map()) // pointerId -> { x, y }
  const pinchStartDistanceRef = useRef(null)
  const pinchStartZoomRef = useRef(1)
  const [zoom, setZoom] = useState(1)
  const [baseWidth, setBaseWidth] = useState(1440)
  const [baseHeight, setBaseHeight] = useState(1024)
  const maxZoom = 4
  const zoomStep = 0.1
  const EPS = 0.0001

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

  const applyZoom = useCallback((nextZoom, focalX, focalY) => {
    const container = containerRef.current
    if (!container) return

    const prevZoom = zoom
    const minAllowed = fitScaleRef.current
    const newZoom = clamp(nextZoom, minAllowed, maxZoom)

    // Keep scroll focus around the pointer (or center if not provided)
    const rect = container.getBoundingClientRect()
    const cx = focalX ?? (rect.left + rect.width / 2)
    const cy = focalY ?? (rect.top + rect.height / 2)

    const preScrollLeft = container.scrollLeft
    const preScrollTop = container.scrollTop
    const offsetX = cx - rect.left + preScrollLeft
    const offsetY = cy - rect.top + preScrollTop

    const scaleRatio = newZoom / prevZoom

    setZoom(newZoom)

    // Defer scroll adjustment to after render using requestAnimationFrame
    requestAnimationFrame(() => {
      container.scrollLeft = offsetX * scaleRatio - (cx - rect.left)
      container.scrollTop = offsetY * scaleRatio - (cy - rect.top)
      // If we are at (or below) fit scale, lock vertical scroll to top and hide it
      const atFit = newZoom <= fitScaleRef.current + EPS
      if (atFit) {
        container.scrollTop = 0
        container.style.overflowY = 'hidden'
      }
    })
  }, [zoom])

  // Wheel behavior: always zoom (desktop). On touch, we handle pinch via Pointer Events.
  const handleWheel = useCallback((e) => {
    const el = containerRef.current
    if (!el) return
    e.preventDefault()
    const direction = e.deltaY > 0 ? -1 : 1
    const next = zoom + direction * zoomStep
    applyZoom(next, e.clientX, e.clientY)
  }, [zoom, applyZoom])

  // Drag to pan with mouse
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onMouseDown = (e) => {
      // Only left button
      if (e.button !== 0) return
      e.preventDefault()
      isDraggingRef.current = true
      dragAxisRef.current = null
      el.classList.add('cursor-grabbing')
      el.classList.remove('cursor-grab')
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        left: el.scrollLeft,
        top: el.scrollTop,
      }
    }
    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      // Free pan on both axes
      el.scrollLeft = dragStartRef.current.left - dx
      el.scrollTop = dragStartRef.current.top - dy
    }
    const endDrag = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      dragAxisRef.current = null
      el.classList.remove('cursor-grabbing')
      el.classList.add('cursor-grab')
    }

    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', endDrag)
    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', endDrag)
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Touch and pen gestures via Pointer Events (pinch to zoom, one-finger pan)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const getTwoPointersInfo = () => {
      const pts = Array.from(activePointersRef.current.values())
      if (pts.length < 2) return null
      const [p1, p2] = pts
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const distance = Math.hypot(dx, dy)
      const centerX = (p1.x + p2.x) / 2
      const centerY = (p1.y + p2.y) / 2
      return { distance, centerX, centerY }
    }

    const onPointerDown = (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        // Prevent browser gestures; we manage them
        e.preventDefault()
        el.setPointerCapture?.(e.pointerId)
        activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

        if (activePointersRef.current.size === 2) {
          const info = getTwoPointersInfo()
          if (info) {
            pinchStartDistanceRef.current = info.distance
            pinchStartZoomRef.current = zoom
            // end any drag state when pinch starts
            isDraggingRef.current = false
            dragAxisRef.current = null
          }
        } else if (activePointersRef.current.size === 1) {
          // initialize drag state for single finger pan
          isDraggingRef.current = true
          dragAxisRef.current = null
          const p = activePointersRef.current.get(e.pointerId)
          dragStartRef.current = {
            x: p.x,
            y: p.y,
            left: el.scrollLeft,
            top: el.scrollTop,
          }
        }
      }
    }

    const onPointerMove = (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        // Keep map updated
        if (activePointersRef.current.has(e.pointerId)) {
          activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        }

        if (activePointersRef.current.size >= 2 && pinchStartDistanceRef.current) {
          e.preventDefault()
          const info = getTwoPointersInfo()
          if (!info) return
          const scale = info.distance / (pinchStartDistanceRef.current || 1)
          const nextZoom = pinchStartZoomRef.current * scale
          applyZoom(nextZoom, info.centerX, info.centerY)
        } else if (isDraggingRef.current && activePointersRef.current.size === 1) {
          e.preventDefault()
          const p = activePointersRef.current.get(e.pointerId)
          if (!p) return
          const dx = p.x - dragStartRef.current.x
          const dy = p.y - dragStartRef.current.y
          // Free pan on both axes
          el.scrollLeft = dragStartRef.current.left - dx
          el.scrollTop = dragStartRef.current.top - dy
        }
      }
    }

    const clearPointer = (pointerId) => {
      activePointersRef.current.delete(pointerId)
      if (activePointersRef.current.size < 2) {
        pinchStartDistanceRef.current = null
      }
      if (activePointersRef.current.size === 0) {
        isDraggingRef.current = false
        dragAxisRef.current = null
      }
    }

    const onPointerUp = (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        e.preventDefault()
        el.releasePointerCapture?.(e.pointerId)
        clearPointer(e.pointerId)
      }
    }
    const onPointerCancel = (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        el.releasePointerCapture?.(e.pointerId)
        clearPointer(e.pointerId)
      }
    }

    el.addEventListener('pointerdown', onPointerDown, { passive: false })
    el.addEventListener('pointermove', onPointerMove, { passive: false })
    el.addEventListener('pointerup', onPointerUp, { passive: false })
    el.addEventListener('pointercancel', onPointerCancel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [applyZoom, zoom])

  // Auto-fit to fill screen on mount, on image load, and on resize (cover behavior)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const fit = () => {
      const widthRatio = el.clientWidth / baseWidth
      const heightRatio = el.clientHeight / baseHeight
      let scale = Math.max(widthRatio, heightRatio)
      // Ensure true cover with slight margin to avoid fractional pixel gaps
      const margin = el.clientWidth <= 768 ? 0.01 : 0.002
      scale = Math.max(scale, widthRatio + margin, heightRatio + margin)
      fitScaleRef.current = scale
      setZoom((prev) => (prev < scale ? scale : prev))
      requestAnimationFrame(() => {
        const contentW = baseWidth * scale
        const contentH = baseHeight * scale
        el.scrollLeft = Math.max(0, (contentW - el.clientWidth) / 2)
        el.scrollTop = 0
        // Hide vertical scroll when exactly at fit scale
        el.style.overflowY = (scale - fitScaleRef.current <= EPS) ? 'hidden' : 'auto'
      })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [baseWidth, baseHeight])

  // Toggle vertical overflow based on current zoom relative to fit scale
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const atFit = zoom <= fitScaleRef.current + EPS
    el.style.overflowY = atFit ? 'hidden' : 'auto'
  }, [zoom])

  return (
    <div className="fixed inset-0 h-[100svh] bg-white flex flex-col overflow-hidden">
      <div
        ref={containerRef}
        className="relative flex-1 h-full overflow-auto overscroll-none cursor-grab touch-none"
      >
        <div
          className="origin-top-left"
          style={{ width: `${baseWidth}px`, height: `${baseHeight}px`, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          <img
            className="block select-none pointer-events-none"
            src={"../../../assets/image/WhiteWest Map Illustration-01-01 1.svg"}
            alt="Map Illustration"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget
              const naturalW = img.naturalWidth || baseWidth
              const naturalH = img.naturalHeight || baseHeight
              if (naturalW && naturalH && (naturalW !== baseWidth || naturalH !== baseHeight)) {
                setBaseWidth(naturalW)
                setBaseHeight(naturalH)
              }
            }}
            onError={() => {
              // keep defaults if natural size not available
            }}
          />
        </div>
      </div>
    </div>
  )
}
