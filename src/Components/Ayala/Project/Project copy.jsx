import React, { useRef, useEffect, useState } from 'react'
import { MapPin, Info, Star, Home, Coffee, Circle } from 'lucide-react'

export default function Project() {
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
    height: 0
  })

  // مواضع الأيقونات SVG على الصورة (كنسب مئوية من الصورة الأصلية)
  const [iconPositions, setIconPositions] = useState([
    {
      id: 1,
      x: 0.46,
      y: 0.48,
      color: '#9333ea',
      icon: './assets/image/icons/Map pin.svg',
      title: 'موقع A',
      description: 'وصف الموقع A'
    },
    {
      id: 2,
      x: 0.5,
      y: 0.5,
      color: '#ef4444',
      icon: './assets/image/icons/Map pin2.svg',
      title: 'موقع B',
      description: 'وصف الموقع B'
    },
    {
      id: 3,
      x: 0.42,
      y: 0.35,
      color: '#10b981',
      icon: './assets/image/icons/Map pin3.svg',
      title: 'موقع C',
      description: 'وصف الموقع C'
    },
    {
      id: 4,
      x: 0.6,
      y: 0.4,
      color: '#f59e0b',
      icon: './assets/image/icons/Map pin2.svg',
      title: 'مقهى',
      description: 'مقهى رائع للاستراحة'
    }
  ])


  // مكونات الأيقونات المتاحة
  const iconComponents = {
    MapPin,
    Info,
    Star,
    Home,
    Coffee,
    Circle
  }

  // حساب حدود الحركة المسموحة
  const getBounds = (img, canvasWidth, canvasHeight) => {
    if (!img) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }

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

    const maxX = Math.max(0, -initialX)
    const minX = Math.min(0, canvasWidth - drawWidth - initialX)
    const maxY = Math.max(0, -initialY)
    const minY = Math.min(0, canvasHeight - drawHeight - initialY)

    return { minX, maxX, minY, maxY, drawWidth, drawHeight, initialX, initialY }
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
    // استخدام صورة من unsplash كمثال
    img.src = './assets/image/WhiteWest Map Illustration-01-01 1.svg'
  }, [])

  // رسم Canvas (الصورة فقط)
  const drawCanvas = (img, currentPan = { x: 0, y: 0 }) => {
    if (!img || !canvasRef.current) return

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

    const finalX = initialX + currentPan.x
    const finalY = initialY + currentPan.y

    // رسم الصورة فقط
    ctx.drawImage(img, finalX, finalY, drawWidth, drawHeight)

    // حفظ معلومات التحويل للأيقونات
    setImageTransform({
      x: finalX,
      y: finalY,
      width: drawWidth,
      height: drawHeight
    })
  }

  // تحديث الرسم عند تغيير Pan
  useEffect(() => {
    if (image) {
      drawCanvas(image, pan)
    }
  }, [image, pan])

  // تحديث حجم Canvas عند تغيير النافذة
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const container = canvas.parentElement
        canvas.width = container.offsetWidth
        canvas.height = container.offsetHeight

        if (image) {
          const bounds = getBounds(image, canvas.width, canvas.height)
          const constrainedPan = constrainPan(pan, bounds)

          if (constrainedPan.x !== pan.x || constrainedPan.y !== pan.y) {
            setPan(constrainedPan)
          } else {
            drawCanvas(image, pan)
          }
        }
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [image, pan])

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
    e.preventDefault()
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
    e.preventDefault()

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


  // دالة تغيير لون الأيقونة
  const changeIconColor = (iconId, newColor) => {
    setIconPositions(prev => prev.map(icon =>
      icon.id === iconId ? { ...icon, color: newColor } : icon
    ))
  }

  // إضافة أيقونة جديدة
  const addNewIcon = () => {
    const colors = ['#9333ea', '#ef4444', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6']
    const icons = ['MapPin', 'Star', 'Home', 'Coffee', 'Info', 'Circle']

    const newIcon = {
      id: Date.now(),
      x: Math.random() * 0.8 + 0.1,
      y: Math.random() * 0.8 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
      icon: icons[Math.floor(Math.random() * icons.length)],
      title: `موقع جديد ${iconPositions.length + 1}`,
      description: 'موقع تم إضافته حديثًا'
    }

    setIconPositions(prev => [...prev, newIcon])
  }

  return (
    <div className='w-screen h-screen relative overflow-hidden bg-gray-900'>

      <div className='absolute w-full h-full flex justify-center items-center'>
        <div className='relative w-full h-full overflow-hidden'>
          {/* Canvas للصورة */}
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
          <div
            ref={overlayRef}
            className="absolute inset-0 pointer-events-none">
            {iconPositions.map(iconPos => {
              const IconComponent = iconComponents[iconPos.icon] || MapPin
              // حساب الموقع النسبي للأيقونة بناء على موقع الصورة الحالي
              const iconX = imageTransform.x + (iconPos.x * imageTransform.width)
              const iconY = imageTransform.y + (iconPos.y * imageTransform.height)

              return (
                <div
                  key={iconPos.id}
                  className="absolute pointer-events-auto group  transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${iconX}px`,
                    top: `${iconY}px`,
                    zIndex: 20
                  }}
                >
                  {/* الأيقونة مع خلفية دائرية */}
                  <img className='w-16' src={iconPos.icon} alt="" />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}