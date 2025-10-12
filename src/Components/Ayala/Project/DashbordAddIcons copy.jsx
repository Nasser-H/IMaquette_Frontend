import axios from 'axios'
import React, { useRef, useEffect, useState } from 'react'

export default function MapIconDashboard() {
  const canvasRef = useRef(null)
  const [image, setImage] = useState(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 })
  const [draggingIcon, setDraggingIcon] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [imageTransform, setImageTransform] = useState({
    x: 0, y: 0, width: 0, height: 0, scale: 1
  })
  
  // Dashboard states
  const [editMode, setEditMode] = useState(true)
  const [iconPositions, setIconPositions] = useState([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [selectedIcon, setSelectedIcon] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    image: null,
    coordinate_x: 0,
    coordinate_y: 0,
    type: 's', // 's' for surrounding, 'a' for amenity
    type_media: '2d', // '3d' for orbit, '2d' for 2d map
    description: '',
    is_interactive: '0',
    icon_id: '',
    project_id: 1 // يمكنك تغييره حسب المشروع
  })
  const [showIconDropdown, setShowIconDropdown] = useState(false)
  const [isAddingIcon, setIsAddingIcon] = useState(false)
  const [tempClickPosition, setTempClickPosition] = useState(null)
  const [availableIcons, setAvailableIcons] = useState([])
  const [imagePreview, setImagePreview] = useState(null)

  const imgSrc = './assets/image/WhiteWest Map Illustration-01-01 1.svg'

  // Fetch Icons from API
  async function fetchIcons() {
    try {
      const {data} = await axios.get('http://localhost:8000/api/v1/icon')
      console.log('Icons:', data.data)
      setAvailableIcons(data.data)
    } catch (error) {
      console.error('Error fetching icons:', error)
    }
  }

  useEffect(() => {
    fetchIcons()
  }, [])

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({...formData, image: file})
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

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

    const scale = drawWidth / img.naturalWidth
    const maxX = Math.max(0, -initialX)
    const minX = Math.min(0, canvasWidth - drawWidth - initialX)
    const maxY = Math.max(0, -initialY)
    const minY = Math.min(0, canvasHeight - drawHeight - initialY)

    return { minX, maxX, minY, maxY, drawWidth, drawHeight, initialX, initialY, scale }
  }

  const constrainPan = (newPan, bounds) => {
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, newPan.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, newPan.y))
    }
  }

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImage(img)
      drawCanvas(img, pan)
    }
    img.src = imgSrc
  }, [imgSrc])

  const drawCanvas = (img, currentPan = { x: 0, y: 0 }) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

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

    const scale = drawWidth / img.naturalWidth
    const finalX = initialX + currentPan.x
    const finalY = initialY + currentPan.y

    ctx.drawImage(img, finalX, finalY, drawWidth, drawHeight)

    setImageTransform({
      x: finalX,
      y: finalY,
      width: drawWidth,
      height: drawHeight,
      scale: scale
    })
  }

  useEffect(() => {
    if (image) {
      drawCanvas(image, pan)
    }
  }, [image, pan])

  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current && image) {
        const canvas = canvasRef.current
        const container = canvas.parentElement
        canvas.width = container.offsetWidth
        canvas.height = container.offsetHeight

        const bounds = getBounds(image, canvas.width, canvas.height)
        const constrainedPan = constrainPan(pan, bounds)
        
        if (constrainedPan.x !== pan.x || constrainedPan.y !== pan.y) {
          setPan(constrainedPan)
        }
        
        drawCanvas(image, constrainedPan)
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [image])

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
    if (!editMode || isAddingIcon) return
    
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

    const canvas = canvasRef.current
    const bounds = getBounds(image, canvas.width, canvas.height)
    const pos = getEventPos(e)
    const deltaX = pos.x - dragStart.x
    const deltaY = pos.y - dragStart.y

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      const newPan = {
        x: dragStart.panX + deltaX,
        y: dragStart.panY + deltaY
      }

      const constrainedPan = constrainPan(newPan, bounds)
      setPan(constrainedPan)
    }
  }

  const handleEnd = (e) => {
    setIsDragging(false)
  }

  const handleCanvasClick = (e) => {
    if (!editMode || isDragging) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const clickX = e.clientX
    const clickY = e.clientY
    
    const relativeX = (clickX - imageTransform.x) / imageTransform.width
    const relativeY = (clickY - imageTransform.y) / imageTransform.height

    if (relativeX >= 0 && relativeX <= 1 && relativeY >= 0 && relativeY <= 1) {
      setTempClickPosition({ x: relativeX, y: relativeY })
      setIsAddingIcon(true)
    }
  }

  const confirmAddIcon = async () => {
    if (!tempClickPosition || !formData.icon_id) {
      alert('الرجاء اختيار أيقونة وملء البيانات المطلوبة')
      return
    }

    try {
      const selectedIconData = availableIcons.find(icon => icon.id === formData.icon_id)
      
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      if (formData.image) {
        formDataToSend.append('image', formData.image)
      }
      formDataToSend.append('coordinate_x', tempClickPosition.x)
      formDataToSend.append('coordinate_y', tempClickPosition.y)
      formDataToSend.append('type', formData.type)
      formDataToSend.append('type_media', formData.type_media)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('is_interactive', formData.is_interactive)
      formDataToSend.append('icon_id', formData.icon_id)
      formDataToSend.append('project_id', formData.project_id)

      // Send to API
      const response = await axios.post('http://localhost:8000/api/v1/poi', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      console.log('Response:', response.data)

      // Add to local state
      const newIcon = {
        id: response.data.id || Date.now(),
        x: tempClickPosition.x,
        y: tempClickPosition.y,
        name: formData.name,
        description: formData.description,
        is_interactive: formData.is_interactive,
        type: formData.type,
        type_media: formData.type_media,
        icon: selectedIconData.icon,
        iconId: formData.icon_id,
        iconData: selectedIconData
      }
      
      setIconPositions([...iconPositions, newIcon])
      
      // Reset form
      setFormData({
        name: '',
        image: null,
        coordinate_x: 0,
        coordinate_y: 0,
        type: 's',
        type_media: '2d',
        description: '',
        is_interactive: '0',
        icon_id: '',
        project_id: 1
      })
      setImagePreview(null)
      setTempClickPosition(null)
      setIsAddingIcon(false)
      
      alert('تم إضافة الأيقونة بنجاح!')
    } catch (error) {
      console.error('Error adding icon:', error)
      alert('حدث خطأ أثناء إضافة الأيقونة')
    }
  }

  const cancelAddIcon = () => {
    setTempClickPosition(null)
    setIsAddingIcon(false)
  }

  const deleteIcon = (id) => {
    setIconPositions(iconPositions.filter(icon => icon.id !== id))
    if (selectedIcon?.id === id) {
      setSelectedIcon(null);
    }
  }

  const exportData = () => {
    const exportedData = iconPositions.map(icon => ({
      id: icon.id,
      name: icon.name,
      coordinate_x: icon.x,
      coordinate_y: icon.y,
      type: icon.type,
      type_media: icon.type_media,
      description: icon.description,
      is_interactive: icon.is_interactive,
      icon_id: icon.iconId,
      project_id: formData.project_id
    }))
    
    const dataStr = JSON.stringify(exportedData, null, 2)
    console.log('Icon Positions Data:', dataStr)
    
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'icon-positions.json'
    a.click()
    
    alert('تم تصدير البيانات وتنزيلها كملف JSON')
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingIcon || !image || !canvasRef.current) return

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()

      const mouseX = e.clientX
      const mouseY = e.clientY

      const canvasX = mouseX - rect.left - dragOffset.x
      const canvasY = mouseY - rect.top - dragOffset.y

      const relativeX = (canvasX - imageTransform.x) / imageTransform.width
      const relativeY = (canvasY - imageTransform.y) / imageTransform.height

      const clampedX = Math.min(1, Math.max(0, relativeX))
      const clampedY = Math.min(1, Math.max(0, relativeY))

      setIconPositions(prev =>
        prev.map(icon =>
          icon.id === draggingIcon
            ? { ...icon, x: clampedX, y: clampedY }
            : icon
        )
      )
    }

    const handleMouseUp = () => {
      setDraggingIcon(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingIcon, dragOffset, imageTransform])

  const getIconDisplay = (iconId) => {
    return availableIcons.find(icon => icon.id === iconId)
  }

  return (
    <div className='w-screen h-screen relative overflow-hidden bg-gray-100 flex' dir='rtl'>
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-96' : 'w-0'} bg-gray-800 transition-all duration-300 overflow-hidden flex flex-col border-l border-gray-700`}>
        <div className='p-4 border-b border-gray-700 flex justify-between items-center'>
          <h2 className='text-white font-bold text-xl'>لوحة التحكم</h2>
          <button onClick={() => setShowSidebar(false)} className='text-gray-400 hover:text-white'>
            X
          </button>
        </div>

        {/* Form */}
        <div className='p-4 border-b border-gray-700 flex-shrink-0 overflow-y-auto max-h-[calc(100vh-200px)]'>
          <h3 className='text-white font-semibold mb-4 text-lg'>إضافة أيقونة جديدة</h3>
          
          <div className='space-y-4'>
            {/* Name */}
            <div>
              <label className='text-gray-300 text-sm block mb-2 font-medium'>الاسم *</label>
              <input
                type='text'
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className='w-full bg-gray-700 text-white px-4 py-3 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none'
                placeholder='اسم الموقع'
                required
              />
            </div>

            {/* Icon Selector */}
            <div>
              <label className='text-gray-300 text-sm block mb-2 font-medium'>اختر الأيقونة *</label>
              <div className='relative'>
                <button
                  type='button'
                  onClick={() => setShowIconDropdown(!showIconDropdown)}
                  className='w-full bg-gray-700 text-white px-4 py-3 rounded flex items-center justify-between hover:bg-gray-600 transition-colors'
                >
                  {formData.icon_id ? (
                    <div className='flex items-center gap-3'>
                      <img 
                        src={`http://localhost:8000/${getIconDisplay(formData.icon_id)?.icon}`} 
                        width={24} 
                        height={24}
                        alt='icon' 
                      />
                      <span>{getIconDisplay(formData.icon_id)?.title}</span>
                    </div>
                  ) : (
                    <span className='text-gray-400'>اختر الأيقونة</span>
                  )}
                ChevronDown
                </button>
                
                {showIconDropdown && (
                  <div className='absolute top-full left-0 right-0 mt-2 bg-gray-700 rounded shadow-lg z-50 max-h-64 overflow-y-auto border border-gray-600'>
                    {availableIcons.map(icon => (
                      <button
                        key={icon.id}
                        type='button'
                        onClick={() => {
                          setFormData({...formData, icon_id: icon.id})
                          setShowIconDropdown(false)
                        }}
                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-600 transition-colors ${
                          formData.icon_id === icon.id ? 'bg-gray-600' : ''
                        }`}
                      >
                        <img src={`http://localhost:8000/${icon.icon}`} width={32} height={32} alt={icon.title} />
                        <div className='text-right flex-1'>
                          <div className='text-white font-medium text-sm'>{icon.title}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className='text-gray-300 text-sm block mb-2 font-medium'>النوع *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className='w-full bg-gray-700 text-white px-4 py-3 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none'
              >
                <option value='s'>Surrounding (محيط)</option>
                <option value='a'>Amenity (مرفق)</option>
              </select>
            </div>

            {/* Type Media */}
            <div>
              <label className='text-gray-300 text-sm block mb-2 font-medium'>نوع الوسائط *</label>
              <select
                value={formData.type_media}
                onChange={(e) => setFormData({...formData, type_media: e.target.value})}
                className='w-full bg-gray-700 text-white px-4 py-3 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none'
              >
                <option value='2d'>2D Map</option>
                <option value='3d'>3D Orbit</option>
              </select>
            </div>

            {/* Image Upload */}
            <div>
              <label className='text-gray-300 text-sm block mb-2 font-medium'>رفع صورة (اختياري)</label>
              <input
                type='file'
                accept='image/*'
                onChange={handleImageUpload}
                className='w-full bg-gray-700 text-white px-4 py-3 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700'
              />
              {imagePreview && (
                <img src={imagePreview} alt='preview' className='mt-2 w-full h-32 object-cover rounded' />
              )}
            </div>

            {/* Description */}
            <div>
              <label className='text-gray-300 text-sm block mb-2 font-medium'>الوصف</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className='w-full bg-gray-700 text-white px-4 py-3 rounded text-sm h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none'
                placeholder='وصف الموقع'
              />
            </div>

            {/* Is Interactive */}
            <div className='flex items-center gap-3 bg-gray-700 px-4 py-3 rounded'>
              <input
                type='checkbox'
                id='interactive'
                checked={formData.is_interactive === '1'}
                onChange={(e) => setFormData({...formData, is_interactive: e.target.checked ? '1' : '0'})}
                className='w-5 h-5 accent-blue-500'
              />
              <label htmlFor='interactive' className='text-gray-300 text-sm font-medium cursor-pointer'>أيقونة تفاعلية</label>
            </div>

            {/* Project ID */}
            <div>
              <label className='text-gray-300 text-sm block mb-2 font-medium'>رقم المشروع *</label>
              <input
                type='number'
                value={formData.project_id}
                onChange={(e) => setFormData({...formData, project_id: parseInt(e.target.value)})}
                className='w-full bg-gray-700 text-white px-4 py-3 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none'
                placeholder='1'
                required
              />
            </div>
          </div>

          <div className='mt-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded'>
            <p className='text-blue-300 text-xs leading-relaxed'>
              💡 بعد ملء البيانات، انقر على المكان المطلوب في الخريطة لإضافة الأيقونة بدقة
            </p>
          </div>
        </div>

        {/* Icons List */}
        <div className='flex-1 overflow-y-auto p-4'>
          <div className='flex justify-between items-center mb-4'>
            <h3 className='text-white font-semibold text-lg'>الأيقونات المضافة ({iconPositions.length})</h3>
            {iconPositions.length > 0 && (
              <button
                onClick={exportData}
                className='text-green-400 hover:text-green-300 text-sm flex items-center gap-2 bg-green-900/20 px-3 py-2 rounded'
              >
                تصدير JSON
              </button>
            )}
          </div>

          {iconPositions.length === 0 ? (
            <div className='text-center text-gray-500 py-8'>
              <p className='text-sm'>لا توجد أيقونات مضافة بعد</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {iconPositions.map(icon => (
                <div
                  key={icon.id}
                  className='bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors'
                >
                  <div className='flex justify-between items-start'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-3 mb-2'>
                        <img 
                          src={`http://localhost:8000/${icon.icon}`} 
                          width={32} 
                          height={32}
                          alt={icon.name} 
                          className='rounded'
                        />
                        <h4 className='text-white font-medium'>{icon.name}</h4>
                      </div>
                      <p className='text-gray-400 text-xs mb-1'>
                        📍 X: {icon.x.toFixed(4)} - Y: {icon.y.toFixed(4)}
                      </p>
                      <p className='text-gray-400 text-xs mb-1'>
                        النوع: {icon.type === 's' ? 'Surrounding' : 'Amenity'} | الوسائط: {icon.type_media}
                      </p>
                      {icon.description && (
                        <p className='text-gray-400 text-xs mt-2 bg-gray-800 p-2 rounded'>{icon.description}</p>
                      )}
                      {icon.is_interactive === '1' && (
                        <span className='inline-block mt-2 text-xs bg-purple-600 text-white px-2 py-1 rounded'>تفاعلية</span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteIcon(icon.id)}
                      className='text-red-400 hover:text-red-300 mr-2 p-2 hover:bg-red-900/20 rounded transition-colors'
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className='flex-1 relative'>
        {!showSidebar && (
          <button
            onClick={() => setShowSidebar(true)}
            className='absolute top-4 right-4 z-10 bg-gray-800 text-white p-3 rounded-lg hover:bg-gray-700 shadow-lg'
          >
            Edite
          </button>
        )}

        <div className='absolute top-4 left-4 z-10 bg-gray-800 rounded-lg p-2 flex gap-2 shadow-lg'>
          <button
            onClick={() => setEditMode(true)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              editMode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            وضع التحرير
          </button>
          <button
            onClick={() => setEditMode(false)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              !editMode ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            وضع المعاينة
          </button>
        </div>

        {isAddingIcon && tempClickPosition && (
          <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-gray-800 p-6 rounded-lg shadow-2xl border border-gray-600 min-w-80'>
            <h3 className='text-white font-bold text-lg mb-3'>تأكيد إضافة الأيقونة</h3>
            <p className='text-gray-300 text-sm mb-4'>
              هل تريد إضافة الأيقونة في هذا الموقع؟
            </p>
            <div className='text-gray-400 text-xs mb-4 bg-gray-700 p-3 rounded'>
              <p>X: {tempClickPosition.x.toFixed(4)} - Y: {tempClickPosition.y.toFixed(4)}</p>
            </div>
            <div className='flex gap-3'>
              <button
                onClick={confirmAddIcon}
                className='flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium'
              >
                تأكيد
              </button>
              <button
                onClick={cancelAddIcon}
                className='flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium'
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        <div className='w-full h-full flex justify-center items-center'>
          <div className='relative w-full h-full overflow-hidden'>
            <canvas
              ref={canvasRef}
              className={`w-full h-full ${
                editMode && !isAddingIcon ? (isDragging ? 'cursor-grabbing' : 'cursor-crosshair') : 
                editMode && isAddingIcon ? 'cursor-not-allowed' :
                'cursor-grab'
              } select-none`}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onClick={handleCanvasClick}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              style={{ touchAction: 'none' }}
            />
            
            {tempClickPosition && image && (
              <div
                className='absolute pointer-events-none'
                style={{
                  left: `${imageTransform.x + (tempClickPosition.x * imageTransform.width)}px`,
                  top: `${imageTransform.y + (tempClickPosition.y * imageTransform.height)}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <img src={`http://localhost:8000/${getIconDisplay(formData.icon_id)?.icon}`}  alt={getIconDisplay(formData.icon_id)?.title} />
              </div>
            )}
            
            {image && (
              <div className="absolute inset-0 pointer-events-none">
                {iconPositions.map(iconPos => {
                  const screenX = imageTransform.x + (iconPos.x * imageTransform.width)
                  const screenY = imageTransform.y + (iconPos.y * imageTransform.height)
                  
                  return (
                    <div
                      key={iconPos.id}
                      className='absolute'
                      style={{
                        left: `${screenX}px`,
                        top: `${screenY}px`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onMouseDown={(e) => {
                        if (!editMode) return
                        e.stopPropagation()

                        const mouseX = e.clientX
                        const mouseY = e.clientY
                        setDraggingIcon(iconPos.id)
                        setDragOffset({
                          x: mouseX - screenX,
                          y: mouseY - screenY
                        })
                      }}
                    >
                      <div className='cursor-pointer transition-transform pointer-events-auto'>
                        <img 
                          src={`http://localhost:8000/${iconPos.icon}`} 
                          alt={iconPos.name}
                          className='w-10 h-10 object-contain'
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}