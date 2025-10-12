import React, { useRef, useEffect, useState } from 'react'
import MapPinIcon from './MapPinIcon'
import SurroundingDetails from './SurroundingDetails'
import { AnimatePresence } from 'framer-motion'

export default function HandleCanva({iconPositions, imgSrc}) {
  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const [image, setImage] = useState(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 })
  const [imageTransform, setImageTransform] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    scale: 1
  })
  const [clickableIcon, setClickableIcon] = useState(false)
  // حساب حدود الحركة المسموحة مع حساب نسبة التكبير
  const getBounds = (img, canvasWidth, canvasHeight) => {
    if (!img) return { minX: 0, maxX: 0, minY: 0, maxY: 0, scale: 1 }

    const canvasRatio = canvasWidth / canvasHeight
    const imgRatio = img.naturalWidth / img.naturalHeight

    let drawWidth, drawHeight, initialX, initialY

    if (canvasRatio > imgRatio) {
      drawWidth = canvasWidth
      drawHeight = canvasWidth / imgRatio
      initialX = 0
      initialY = (canvasHeight - drawHeight) / 2
    } else {
      drawHeight = canvasHeight
      drawWidth = canvasHeight * imgRatio
      initialX = (canvasWidth - drawWidth) / 2
      initialY = 0
    }

    // حساب نسبة التكبير: نسبة العرض الحالي للصورة إلى عرضها الأصلي
    const scale = drawWidth / img.naturalWidth

    const maxX = Math.max(0, -initialX)
    const minX = Math.min(0, canvasWidth - drawWidth - initialX)
    const maxY = Math.max(0, -initialY)
    const minY = Math.min(0, canvasHeight - drawHeight - initialY)

    return { minX, maxX, minY, maxY, drawWidth, drawHeight, initialX, initialY, scale }
  }

  // تقييد حركة Pan ضمن الحدود المسموحة
  const constrainPan = (newPan, bounds) => {
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, newPan.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, newPan.y))
    }
  }

  // تحميل الصورة
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImage(img)
      drawCanvas(img, pan)
    }
    img.src = imgSrc
    }, [imgSrc])

  // رسم Canvas مع تحديث فوري لمعلومات التحويل
  const drawCanvas = (img, currentPan = { x: 0, y: 0 }) => {

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    // مسح Canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // حساب مقاييس object-cover
    const canvasRatio = canvasWidth / canvasHeight
    const imgRatio = img.naturalWidth / img.naturalHeight

    let drawWidth, drawHeight, initialX, initialY

    if (canvasRatio > imgRatio) {
      drawWidth = canvasWidth
      drawHeight = canvasWidth / imgRatio
      initialX = 0
      initialY = (canvasHeight - drawHeight) / 2
    } else {
      drawHeight = canvasHeight
      drawWidth = canvasHeight * imgRatio
      initialX = (canvasWidth - drawWidth) / 2
      initialY = 0
    }

    // حساب نسبة التكبير
    const scale = drawWidth / img.naturalWidth
    const finalX = initialX + currentPan.x
    const finalY = initialY + currentPan.y

    // رسم الصورة
    ctx.drawImage(img, finalX, finalY, drawWidth, drawHeight)

    // تحديث فوري ومتزامن لمعلومات التحويل
    const newTransform = {
      x: finalX,
      y: finalY,
      width: drawWidth,
      height: drawHeight,
      scale: scale
    }
    
    // تحديث فوري بدلاً من useState للتجنب التأخير
    setImageTransform(prevTransform => {
      // تحديث فقط إذا كانت هناك تغييرات فعلية
      if (prevTransform.x !== newTransform.x || 
          prevTransform.y !== newTransform.y || 
          prevTransform.width !== newTransform.width || 
          prevTransform.height !== newTransform.height ||
          prevTransform.scale !== newTransform.scale) {
        return newTransform
      }
      return prevTransform
    })
  }

  // تحديث الرسم عند تغيير Pan
  useEffect(() => {
    if (image) {
      drawCanvas(image, pan)
    }
  }, [image, pan])

  // تحديث حجم Canvas عند تغيير النافذة مع تحديث فوري
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current && image) {
        const canvas = canvasRef.current
        const container = canvas.parentElement
        canvas.width = container.offsetWidth
        canvas.height = container.offsetHeight

        // حساب المعلومات الجديدة فوراً
        const bounds = getBounds(image, canvas.width, canvas.height)
        const constrainedPan = constrainPan(pan, bounds)
        
        // تحديث imageTransform فوراً قبل الرسم
        const canvasRatio = canvas.width / canvas.height
        const imgRatio = image.naturalWidth / image.naturalHeight

        let drawWidth, drawHeight, initialX, initialY

        if (canvasRatio > imgRatio) {
          drawWidth = canvas.width
          drawHeight = canvas.width / imgRatio
          initialX = 0
          initialY = (canvas.height - drawHeight) / 2
        } else {
          drawHeight = canvas.height
          drawWidth = canvas.height * imgRatio
          initialX = (canvas.width - drawWidth) / 2
          initialY = 0
        }

        const scale = drawWidth / image.naturalWidth
        const finalX = initialX + constrainedPan.x
        const finalY = initialY + constrainedPan.y

        // تحديث فوري للمعلومات
        setImageTransform({
          x: finalX,
          y: finalY,
          width: drawWidth,
          height: drawHeight,
          scale: scale
        })

        // تحديث Pan إذا لزم الأمر
        if (constrainedPan.x !== pan.x || constrainedPan.y !== pan.y) {
          setPan(constrainedPan)
        }
        
        // رسم Canvas
        drawCanvas(image, constrainedPan)
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [image])

  // دوال التحكم في السحب
  const getEventPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const handleStart = (e) => {
    // e.preventDefault()
    const pos = getEventPos(e)
    setIsDragging(true)
    setDragStart({
      x: pos.x,
      y: pos.y,
      panX: pan.x,
      panY: pan.y
    })
  }

  const handleMove = (e) => {
    if (!isDragging || !image || !canvasRef.current) return
    // e.preventDefault()

    const canvas = canvasRef.current
    const bounds = getBounds(image, canvas.width, canvas.height)

    const pos = getEventPos(e)
    const deltaX = pos.x - dragStart.x
    const deltaY = pos.y - dragStart.y

    const newPan = {
      x: dragStart.panX + deltaX,
      y: dragStart.panY + deltaY
    }

    const constrainedPan = constrainPan(newPan, bounds)
    setPan(constrainedPan)
  }

  const handleEnd = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  return <>
    <div className='w-screen h-screen relative overflow-hidden bg-gray-900 font-ibm select-none'>
      <div className='absolute w-full h-full flex justify-center items-center'>
        <div className='relative w-full h-full overflow-hidden'>
          <canvas
            ref={canvasRef}
            className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            style={{ touchAction: 'none' }}
          />
          {image &&
          <div ref={overlayRef} className="absolute inset-0 pointer-events-none">
            {iconPositions.map(iconPos => 
            <div key={iconPos.id}>
              <MapPinIcon imageTransform={imageTransform} iconPos={iconPos} setClickableIcon={setClickableIcon} baseSizeClickableIcon="72" baseSizeIcon="32" />
                <AnimatePresence>
                  {clickableIcon && iconPos.clickable == 1 && 
                    <SurroundingDetails setClickableIcon={setClickableIcon} />
                  }
                </AnimatePresence>
            </div>
            )}
          </div>
          }
        </div>
      </div>
    </div>
  </>
}