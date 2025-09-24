import React, { useCallback, useEffect, useRef, useState } from 'react'
import mapUrl from '../../../assets/image/WhiteWest Map Illustration-01-01 1.svg'

export default function Project() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  const fitScaleRef = useRef(1)
  const [imageWidth, setImageWidth] = useState(1440)
  const [imageHeight, setImageHeight] = useState(1024)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)

  const maxZoom = 4
  const zoomStep = 0.1
  const MIN_ZOOM_FACTOR = 1
  const INITIAL_ZOOM_FACTOR = 1

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(scale, 0, 0, scale, Math.round(tx), Math.round(ty))
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight)
  }, [scale, tx, ty, imageWidth, imageHeight])

  const didInitRef = useRef(false)

  const computeFit = useCallback(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const w = container.clientWidth
    const h = container.clientHeight
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h

    const widthRatio = w / imageWidth
    const heightRatio = h / imageHeight
    let fit = Math.max(widthRatio, heightRatio)
    const margin = w <= 768 ? 0.01 : 0.002
    fit = Math.max(fit, widthRatio + margin, heightRatio + margin)
    fitScaleRef.current = fit

    // On first init: start exactly at fit (cover)
    if (!didInitRef.current) {
      const initial = fit * INITIAL_ZOOM_FACTOR
      setScale(initial)
      const imgW = imageWidth * initial
      const imgH = imageHeight * initial
      const minTx = w - imgW
      const minTy = h - imgH
      // align to top-left at cover (no gaps)
      setTx(clamp(0, minTx, 0))
      setTy(clamp(0, minTy, 0))
      didInitRef.current = true
    } else {
      // Preserve current scale but clamp within new min/max (no zoom-out below fit)
      const minAllowed = fit * MIN_ZOOM_FACTOR
      setScale((prev) => clamp(prev, minAllowed, maxZoom))
      const current = clamp(scale, minAllowed, maxZoom)
      const imgW = imageWidth * current
      const imgH = imageHeight * current
      const minTx = w - imgW
      const minTy = h - imgH
      setTx((prev) => clamp(prev, minTx, 0))
      setTy((prev) => clamp(prev, minTy, 0))
    }

    requestAnimationFrame(redraw)
  }, [imageWidth, imageHeight, scale, redraw])

  useEffect(() => {
    // Lazy load image
    const img = new Image()
    imageRef.current = img
    img.decoding = 'async'
    img.src = mapUrl
    img.onload = () => {
      const naturalW = img.naturalWidth || imageWidth
      const naturalH = img.naturalHeight || imageHeight
      setImageWidth(naturalW)
      setImageHeight(naturalH)
      computeFit()
    }
    img.onerror = () => {
      computeFit()
    }
    return () => {
      imageRef.current = null
    }
  }, [])

  useEffect(() => {
    computeFit()
  }, [imageWidth, imageHeight, computeFit])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => computeFit())
    ro.observe(container)
    return () => ro.disconnect()
  }, [computeFit])

  useEffect(() => {
    redraw()
  }, [scale, tx, ty, redraw])

  const applyZoomCanvas = useCallback((nextScale, clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const prev = scale
    const minAllowed = fitScaleRef.current * MIN_ZOOM_FACTOR
    const newS = clamp(nextScale, minAllowed, maxZoom)
    const rect = canvas.getBoundingClientRect()
    const cx = clientX ?? (rect.left + rect.width / 2)
    const cy = clientY ?? (rect.top + rect.height / 2)
    const px = cx - rect.left
    const py = cy - rect.top
    // Convert to world coords
    const worldX = (px - tx) / prev
    const worldY = (py - ty) / prev
    // New translation to keep focal point stable
    let nextTx = px - worldX * newS
    let nextTy = py - worldY * newS
    // Clamp translation to avoid any gaps
    const imgW = imageWidth * newS
    const imgH = imageHeight * newS
    const minTx = canvas.width - imgW
    const minTy = canvas.height - imgH
    // do not allow gaps: clamp to edges
    nextTx = clamp(nextTx, minTx, 0)
    nextTy = clamp(nextTy, minTy, 0)
    setScale(newS)
    setTx(nextTx)
    setTy(nextTy)
  }, [scale, tx, ty, imageWidth, imageHeight])

  // Wheel zoom (desktop)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Ensure custom gesture handling across browsers
    canvas.style.touchAction = 'none'
    const onWheel = (e) => {
      e.preventDefault()
      const direction = e.deltaY > 0 ? -1 : 1
      const next = scale + direction * zoomStep
      applyZoomCanvas(next, e.clientX, e.clientY)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [scale, applyZoomCanvas])

  // Mouse drag to pan
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onDown = (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      isDraggingRef.current = true
      canvas.classList.add('cursor-grabbing')
      canvas.classList.remove('cursor-grab')
      dragStartRef.current = { x: e.clientX, y: e.clientY, tx, ty }
    }
    const onMove = (e) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      const imgW = imageWidth * scale
      const imgH = imageHeight * scale
      const minTx = canvas.width - imgW
      const minTy = canvas.height - imgH
      const rawTx = dragStartRef.current.tx + dx
      const rawTy = dragStartRef.current.ty + dy
      const nextTx = clamp(rawTx, minTx, 0)
      const nextTy = clamp(rawTy, minTy, 0)
      setTx(nextTx)
      setTy(nextTy)
    }
    const onUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      canvas.classList.remove('cursor-grabbing')
      canvas.classList.add('cursor-grab')
    }
    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [scale, tx, ty, imageWidth, imageHeight])

  // Touch pinch and pan via Pointer Events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const active = new Map()
    let pinchStartDist = null
    let pinchStartScale = scale

    const twoInfo = () => {
      const pts = Array.from(active.values())
      if (pts.length < 2) return null
      const [p1, p2] = pts
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.hypot(dx, dy)
      const cx = (p1.x + p2.x) / 2
      const cy = (p1.y + p2.y) / 2
      return { dist, cx, cy }
    }

    const onPointerDown = (e) => {
      if (e.pointerType !== 'touch') return
      e.preventDefault()
      canvas.setPointerCapture?.(e.pointerId)
      active.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (active.size === 1) {
        isDraggingRef.current = true
        dragStartRef.current = { x: e.clientX, y: e.clientY, tx, ty }
      } else if (active.size === 2) {
        const info = twoInfo()
        if (info) {
          pinchStartDist = info.dist
          pinchStartScale = scale
          isDraggingRef.current = false
        }
      }
    }
    const onPointerMove = (e) => {
      if (e.pointerType !== 'touch') return
      if (active.has(e.pointerId)) active.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (active.size >= 2 && pinchStartDist) {
        e.preventDefault()
        const info = twoInfo()
        if (!info) return
        const ratio = info.dist / (pinchStartDist || 1)
        const next = pinchStartScale * ratio
        applyZoomCanvas(next, info.cx, info.cy)
      } else if (isDraggingRef.current && active.size === 1) {
        e.preventDefault()
        const p = active.get(e.pointerId)
        if (!p) return
        const dx = p.x - dragStartRef.current.x
        const dy = p.y - dragStartRef.current.y
        const imgW = imageWidth * scale
        const imgH = imageHeight * scale
        const minTx = canvas.width - imgW
        const minTy = canvas.height - imgH
        const rawTx = dragStartRef.current.tx + dx
        const rawTy = dragStartRef.current.ty + dy
        const nextTx = clamp(rawTx, minTx, 0)
        const nextTy = clamp(rawTy, minTy, 0)
        setTx(nextTx)
        setTy(nextTy)
      }
    }
    const clear = (id) => {
      active.delete(id)
      if (active.size < 2) pinchStartDist = null
      if (active.size === 0) isDraggingRef.current = false
    }
    const onPointerUp = (e) => {
      if (e.pointerType !== 'touch') return
      canvas.releasePointerCapture?.(e.pointerId)
      clear(e.pointerId)
    }
    const onPointerCancel = (e) => {
      if (e.pointerType !== 'touch') return
      canvas.releasePointerCapture?.(e.pointerId)
      clear(e.pointerId)
    }
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false })
    canvas.addEventListener('pointermove', onPointerMove, { passive: false })
    canvas.addEventListener('pointerup', onPointerUp, { passive: false })
    canvas.addEventListener('pointercancel', onPointerCancel, { passive: false })
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [scale, tx, ty, imageWidth, imageHeight, applyZoomCanvas])

  // Fallback for browsers without Pointer Events: Touch Events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.style.touchAction = 'none'
    let touches = []
    let pinchStartDist = null
    let pinchStartScale = scale

    const getTouchPoint = (t) => ({ x: t.clientX, y: t.clientY, id: t.identifier })
    const rebuildTouches = (touchList) => Array.from(touchList).map(getTouchPoint)

    const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)
    const center = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

    const onTouchStart = (e) => {
      e.preventDefault()
      touches = rebuildTouches(e.touches)
      if (touches.length === 1) {
        isDraggingRef.current = true
        dragStartRef.current = { x: touches[0].x, y: touches[0].y, tx, ty }
      } else if (touches.length >= 2) {
        pinchStartDist = distance(touches[0], touches[1])
        pinchStartScale = scale
        isDraggingRef.current = false
      }
    }

    const onTouchMove = (e) => {
      if (e.touches.length === 0) return
      e.preventDefault()
      touches = rebuildTouches(e.touches)
      if (touches.length >= 2 && pinchStartDist) {
        const d = distance(touches[0], touches[1])
        const c = center(touches[0], touches[1])
        const ratio = d / (pinchStartDist || 1)
        const next = pinchStartScale * ratio
        applyZoomCanvas(next, c.x, c.y)
      } else if (isDraggingRef.current && touches.length === 1) {
        const dx = touches[0].x - dragStartRef.current.x
        const dy = touches[0].y - dragStartRef.current.y
        const nextTx = clamp(dragStartRef.current.tx + dx, canvas.width - imageWidth * scale, 0)
        const nextTy = clamp(dragStartRef.current.ty + dy, canvas.height - imageHeight * scale, 0)
        setTx(nextTx)
        setTy(nextTy)
      }
    }

    const onTouchEnd = (e) => {
      touches = rebuildTouches(e.touches)
      if (touches.length < 2) pinchStartDist = null
      if (touches.length === 0) isDraggingRef.current = false
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [scale, tx, ty, imageWidth, imageHeight, applyZoomCanvas])

  // iOS Safari gesture events fallback
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let gestureStartScale = scale
    const onGestureStart = (e) => {
      // @ts-ignore: non-standard event on iOS
      e.preventDefault()
      gestureStartScale = scale
    }
    const onGestureChange = (e) => {
      // @ts-ignore: non-standard event on iOS
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      // @ts-ignore
      const next = gestureStartScale * (e.scale || 1)
      // Use canvas center as focal for lack of touch points
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      applyZoomCanvas(next, cx, cy)
    }
    const onGestureEnd = (e) => {
      // @ts-ignore
      e.preventDefault()
    }
    // @ts-ignore
    canvas.addEventListener('gesturestart', onGestureStart, { passive: false })
    // @ts-ignore
    canvas.addEventListener('gesturechange', onGestureChange, { passive: false })
    // @ts-ignore
    canvas.addEventListener('gestureend', onGestureEnd, { passive: false })
    return () => {
      // @ts-ignore
      canvas.removeEventListener('gesturestart', onGestureStart)
      // @ts-ignore
      canvas.removeEventListener('gesturechange', onGestureChange)
      // @ts-ignore
      canvas.removeEventListener('gestureend', onGestureEnd)
    }
  }, [scale, applyZoomCanvas])

  return (
    <div className="fixed inset-0 h-[100svh] bg-white flex flex-col overflow-hidden">
      <div ref={containerRef} className="relative flex-1 h-full overflow-hidden">
        <canvas ref={canvasRef} className="block w-full h-full touch-none cursor-grab" />
      </div>
    </div>
  )
}
