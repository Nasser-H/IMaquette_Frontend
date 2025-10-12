import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react'
import IconDropdown from './IconDropdown';
import { useFormik } from 'formik';

export default function DashbordAddIcons() {
  const canvasRef = useRef(null);
  const formRef = useRef(null);
  const overlayRef = useRef(null);
  const positionIconRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [image, setImage] = useState(null);
  const [isDraggingNewIcon, setIsDraggingNewIcon] = useState(false); // claude
  const [isHidden, setIsHidden] = useState(false);
  const [isCheckedEditMode, setIsCheckedEditMode] = useState(false);
  const [pois, setPois] = useState([]);
  const [icons, setIcons] = useState([]);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [coordinate, setCoordinate] = useState({ x: 0.5, y: 0.5 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [imageTransform, setImageTransform] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    scale: 1
  })

  function getBounds (img, canvasWidth, canvasHeight){
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
  function constrainPan (newPan, bounds) {
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
    img.src = './assets/image/snazzy-image 1.svg'
    }, [])
  function drawCanvas(img, currentPan = {x:0, y:0}){
    
    let drawWidth, drawHeight, initialX, initialY;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const canvasRatio = canvasWidth / canvasHeight;
    const imgRatio = img.naturalWidth / img.naturalHeight;
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
    
    const newTransform = {
      x: finalX,
      y: finalY,
      width: drawWidth,
      height: drawHeight,
      scale: scale
    }
    setImageTransform(prevTransform => {
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



  /// claude
   const handleNewIconDragStart = (e) => {
    e.stopPropagation()
    setIsDraggingNewIcon(true);
  }
    const handleNewIconDragMove = (e) => {

    if (!isDraggingNewIcon || !imageTransform.width || !imageTransform.height) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    let clientX, clientY
    
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    
    const canvasX = clientX - rect.left
    const canvasY = clientY - rect.top
    
    // Calculate relative position on the image (0 to 1)
    const relativeX = (canvasX - imageTransform.x) / imageTransform.width
    const relativeY = (canvasY - imageTransform.y) / imageTransform.height
    
    // Constrain to image bounds (0 to 1)
    const constrainedX = Math.max(0, Math.min(1, relativeX))
    const constrainedY = Math.max(0, Math.min(1, relativeY))
    
    setCoordinate({
      x: parseFloat(constrainedX.toFixed(4)),
      y: parseFloat(constrainedY.toFixed(4))
    })
  }
  const handleNewIconDragEnd = (e) => {
      e.stopPropagation()
      setIsDraggingNewIcon(false)
  }
  useEffect(() => {
    if (isDraggingNewIcon) {
      const handleGlobalMove = (e) => handleNewIconDragMove(e)
      const handleGlobalEnd = (e) => handleNewIconDragEnd(e)
      
      window.addEventListener('mousemove', handleGlobalMove)
      window.addEventListener('mouseup', handleGlobalEnd)
      window.addEventListener('touchmove', handleGlobalMove)
      window.addEventListener('touchend', handleGlobalEnd)
      
      return () => {
        window.removeEventListener('mousemove', handleGlobalMove)
        window.removeEventListener('mouseup', handleGlobalEnd)
        window.removeEventListener('touchmove', handleGlobalMove)
        window.removeEventListener('touchend', handleGlobalEnd)
      }
    }
  }, [isDraggingNewIcon, imageTransform])





function getPois(){
  return axios.get('http://localhost:8000/api/v1/project/1');
}
function getIcons(){
  return axios.get('http://localhost:8000/api/v1/icon');
}
const queryClient = useQueryClient();
const cachedPois = queryClient.getQueryData(['pois']);
const {data: poisData, isLoading: poisLoading, isError: poisError} = useQuery({
  queryKey: ['pois'],
  queryFn: getPois,
  initialData: cachedPois,
  staleTime: Infinity,
  refetchOnMount: false,
})
const {data: iconsData, isLoading: iconsLoading, isError: iconsError} = useQuery({
  queryKey: ['icons'],
  queryFn: getIcons,
  staleTime: Infinity,
  refetchOnMount: false,
})
useEffect(() => {
  if(poisData && iconsData){
    //i want use filter to get each poi -> type == s;
    const filteredPois = poisData.data.data.pois.filter(poi => poi.type === 's');
    setPois(filteredPois);
    setIcons(iconsData.data.data);
  }
  },[poisData, iconsData]);

  
function handleDeletePoi(id){
  axios.delete(`http://localhost:8000/api/v1/poi/${id}`)
  const poisAfterDelete = poisData.data.data.pois = poisData.data.data.pois.filter(poi => poi.id !== id && poi.type === 's');
  setPois(poisAfterDelete);
}
//formik
async function registerPoi(values){
  values.icon_id = selectedIcon.id;
  values.coordinate_x = coordinate.x;
  values.coordinate_y = coordinate.y;
  values.project_id = poisData.data.data.id;

  const formData = new FormData();
  formData.append("name", values.name);
  formData.append("coordinate_x", values.coordinate_x);
  formData.append("coordinate_y", values.coordinate_y);
  formData.append("type", values.type);
  formData.append("type_media", values.type_media);
  formData.append("description", values.description);
  formData.append("image", values.image);
  formData.append("clickable", values.clickable);
  formData.append("icon_id", values.icon_id);
  formData.append("project_id", values.project_id);
  const {data} = await axios.post(`http://localhost:8000/api/v1/poi`, formData);
  if(data.status == true){
    formik.resetForm;
  }
  console.log(data);
}

const formik = useFormik({
  initialValues:{
    "name": '',
    "image": '',
    "coordinate_x": '',
    "coordinate_y": '',
    "type_media": '',
    "description": '',
    "clickable": '',
    "icon_id": '',
    "project_id": ''
  },
  onSubmit:registerPoi
})

  return <>
  <div className='w-screen h-screen relative overflow-hidden bg-gray-900 frot-ibm'>
    <div className='absolute w-full h-full flex justify-center items-center'>
      <div className='relative w-full h-full flex overflow-hidden'>
        <canvas
        ref={canvasRef}
        className={`w-full h-full ${isDragging ? 'cursor-grabbing': 'cursor-grab'} select-none`}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            style={{ touchAction: 'none' }}            
        />
        <div onClick={()=>{isHidden?setIsHidden(false):setIsHidden(true)}} className='absolute m-5 mt-40 flex gap-x-10'>
         <div className='bg-slate-400 size-10 rounded-full flex justify-center items-center text-yellow-200 cursor-pointer'>
          <span>X</span>
         </div>         
        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" defaultValue className="sr-only peer" defaultChecked={isCheckedEditMode} onChange={() => setIsCheckedEditMode(!isCheckedEditMode)}  />
          <div className="relative w-11 h-6 bg-gray-800 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600" />
          <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Edite Mode</span>
        </label>
        </div>

        <div ref={formRef} className={`${isHidden && 'hidden'} absolute right-0 w-1/4 pointer-events-auto z-50 overflow-auto`}>
          <div className='bg-gray-800 w-full min-h-screen py-10'>
            <form onSubmit={formik.handleSubmit} className="max-w-md mx-auto">
              <div className="relative z-0 w-full mb-5 group">
                <input onChange={formik.handleChange} value={formik.values.name} type="text" name="name" id="name" className="block py-2.5 px-0 w-full text-sm text-gray-200 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-gray-300 focus:outline-none focus:ring-0 focus:border-gray-400 peer" placeholder=" " />
                <label className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-gray-600 peer-focus:dark:text-gborder-gray-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">name</label>
              </div>
              <div>
                <div className="relative z-0 w-full mb-5 group">
                  <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-white">Select an type media</label>
                  <select onChange={formik.handleChange} value={formik.values.type_media} id="type_media" name="type_media" className="bg-gray-800 text-gray-300 border border-gray-500 text-sm rounded-lg focus:ring-gborder-gray-300 focus:border-gray-300 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gborder-gray-300 dark:focus:border-gray-300">
                    <option >Choose a type media</option>
                    <option value="2d">2D</option>
                    <option value="3d">3D</option>
                  </select>
                </div>                
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="image" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-400 border-dashed rounded-lg cursor-pointer bg-gray-800 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-400 dark:border-gray-600 dark:hover:border-gray-500">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg  className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
                    </div>
                    <input id="image" name='image' onChange={(e) => formik.setFieldValue('image',e.currentTarget.files[0])} type="file" className="hidden" />
                  </label>
                </div>
                <div className="relative z-0 w-full mb-5 group">
                  <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-white">Select an type</label>
                  <select onChange={formik.handleChange} value={formik.values.type} id="type" name="type" className="bg-gray-800 text-gray-300 border border-gray-500 text-sm rounded-lg focus:ring-gborder-gray-300 focus:border-gray-300 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gborder-gray-300 dark:focus:border-gray-300">
                    <option >Choose a type</option>
                    <option value="s">Srounding</option>
                    <option value="a">Amenity</option>
                  </select>
                </div>
              </div>

              <div className="relative z-0 w-full mb-5 group">
                <textarea onChange={formik.handleChange} value={formik.values.description} type="description" name="description" id="description" className="block py-2.5 px-0 w-full text-sm text-gray-200 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-gray-300 focus:outline-none focus:ring-0 focus:border-gray-400 peer" placeholder=" "></textarea>
                <label className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-gborder-gray-400 peer-focus:dark:text-gborder-gray-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Description</label>
              </div>
              <div>
                <div className="relative z-0 w-full mb-5 group">
                  <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-white">Select an clickable</label>
                  <select onChange={formik.handleChange} value={formik.values.clickable} id="clickable" name="clickable" className="bg-gray-800 text-gray-300 border border-gray-500 text-sm rounded-lg focus:ring-gborder-gray-300 focus:border-gray-300 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gborder-gray-300 dark:focus:border-gray-300">
                    <option >Choose a clickable</option>
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>              
                <div className="relative z-0 w-full mb-5 group">
                  <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-white">Select an icon</label>
                    <IconDropdown
                      icons={icons}
                      selectedIcon={selectedIcon}
                      onSelect={(icon) => setSelectedIcon(icon)}
                    />
                </div>
              </div>

              <div className="relative z-0 w-full mb-5 group">
              <div>
                <div className='flex text-gray-200 justify-around mx-2'>
                  <span>X: {coordinate.x}</span>
                  <span>Y: {coordinate.y}</span>
                </div>
              </div>
              </div>                                             
              <button type="submit" className="text-white bg-gray-700 hover:bg-gray-600 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-gborder-gray-400 dark:hover:bg-gray-400 dark:focus:ring-gray-800">Submit</button>
            </form>
          </div>
        </div>

        <div
          ref={overlayRef}
          className='absolute inset-0 w-3/8 pointer-events-none'>
            {pois && pois.map((poi) => 
              {
                  const iconX = imageTransform.x + (poi.coordinate_x * imageTransform.width)
                  const iconY = imageTransform.y + (poi.coordinate_y * imageTransform.height)
                  const baseSize = poi.clickable == 1 ? 72 : 32;
                  const scaledSize = (baseSize) * imageTransform.scale
                  const minSize = 32  // حد أدنى
                  const maxSize = 800 // حد أقصى
                  const finalSize = Math.max(minSize, Math.min(maxSize, scaledSize))
            return <div key={poi.id}
              className={`absolute h-auto hover:z-20 pointer-events-auto group transform -translate-x-1/2 -translate-y-1/2 ${poi.clickable == 1 && 'cursor-pointer'}`}
              onClick={() => {
                if (poi.clickable == 1) {
                  setClickableIcon(true)
                }
              }}
              style={{
                left: `${iconX}px`,
                top: `${iconY}px`,
                width: `${finalSize}px`
              }}
            >
            <div className={`absolute ${poi.clickable == 1 ? '-top-[8%] -right-[4%]' : '-top-[20%] -right-[20%]'} ${isCheckedEditMode ? 'block' : 'hidden'}`}>
              <div className='flex justify-center space-x-2'>
                <div onClick={() => handleDeletePoi(poi.id)} className='bg-red-600 size-4 rounded-md flex justify-center items-center text-white cursor-pointer hover:bg-red-700'>
                  X
                </div>
                <div className=''>
                    <svg className='cursor-pointer' width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path opacity="0.4" d="M6.0061 21.9996H7.5061C8.7161 21.9996 9.3261 21.9995 9.8661 21.7695C10.4161 21.5395 10.8361 21.1196 11.6961 20.2596L19.8461 12.1095C20.3861 11.5695 20.6561 11.2996 20.7961 11.0096C21.0661 10.4596 21.0661 9.80956 20.7961 9.24956C20.6561 8.95956 20.3861 8.68955 19.8461 8.14955C19.3061 7.60955 19.0361 7.33957 18.7461 7.19957C18.1961 6.92957 17.5461 6.92957 16.9861 7.19957C16.6961 7.33957 16.4261 7.60955 15.8861 8.14955L7.7361 16.2995C6.8761 17.1595 6.4461 17.5896 6.2261 18.1296C5.9961 18.6696 5.99609 19.2795 5.99609 20.4895V21.9895L6.0061 21.9996Z" fill="#161616" />
                      <path d="M16.6475 6.54004C17.4074 6.16009 18.3174 6.16018 19.0674 6.54004C19.4674 6.74004 19.7882 7.05988 20.3682 7.62988C20.948 8.20974 21.258 8.51976 21.458 8.92969C21.838 9.68959 21.8379 10.5897 21.458 11.3496C21.2581 11.7495 20.9379 12.0697 20.3682 12.6494L12.2178 20.7998C11.3178 21.6998 10.8275 22.1897 10.1475 22.4697C9.46758 22.7496 8.76774 22.75 7.49805 22.75H6.00781C5.59785 22.75 5.25788 22.4099 5.25781 22V20.5C5.25781 19.23 5.25809 18.5296 5.53809 17.8496C5.8181 17.1698 6.31821 16.6701 7.20801 15.7803L13.8574 9.12988H13.8682C13.8682 9.12988 13.8679 9.10961 13.8779 9.09961L15.3477 7.62988C15.9275 7.05005 16.2376 6.74004 16.6475 6.54004ZM18.4277 7.87988C18.0778 7.70992 17.6879 7.70992 17.3379 7.87988C17.1579 7.96988 16.8875 8.23949 16.4375 8.68945L15.4883 9.63965L16.4375 10.5898C16.7275 10.8798 16.7274 11.3594 16.4375 11.6494C16.1475 11.9394 15.6679 11.9394 15.3779 11.6494L14.4277 10.7002L8.28809 16.8398C7.44812 17.6798 7.09751 18.0297 6.9375 18.4297C6.76751 18.8397 6.76758 19.3898 6.76758 20.5098V21.25H7.50781C8.6178 21.25 9.17789 21.2501 9.58789 21.0801C9.97789 20.9201 10.3377 20.5695 11.1777 19.7295L19.3281 11.5801C19.7781 11.1301 20.0477 10.8597 20.1377 10.6797C20.3076 10.3297 20.3077 9.93981 20.1377 9.58984C20.0477 9.40984 19.7781 9.13939 19.3281 8.68945C18.8782 8.23949 18.6077 7.96988 18.4277 7.87988ZM7.00781 1.25098C7.53767 1.25098 7.98765 1.57077 8.17773 2.06055L8.8877 3.98145C8.90774 4.05109 8.95766 4.09117 9.02734 4.12109L10.9482 4.83105C11.438 5.01116 11.7578 5.47112 11.7578 6.00098C11.7578 6.53083 11.438 6.98081 10.9482 7.1709L9.02734 7.88086C8.9577 7.9009 8.91762 7.95082 8.8877 8.02051L8.17773 9.94141C7.99763 10.4312 7.53767 10.751 7.00781 10.751C6.47796 10.751 6.02798 10.4312 5.83789 9.94141L5.12793 8.02051C5.10789 7.95087 5.05797 7.91079 4.98828 7.88086L3.06738 7.1709C2.57761 6.99079 2.25781 6.53083 2.25781 6.00098C2.25781 5.47112 2.57761 5.02114 3.06738 4.83105L4.98828 4.12109C5.05792 4.10105 5.098 4.05113 5.12793 3.98145L5.83789 2.06055C6.01799 1.57077 6.47796 1.25098 7.00781 1.25098ZM6.53809 4.50098C6.36809 4.98098 5.98781 5.35125 5.50781 5.53125L4.23828 6.00098L5.50781 6.4707C5.98781 6.6407 6.35809 7.02098 6.53809 7.50098L7.00781 8.77051L7.47754 7.50098C7.64754 7.02098 8.02781 6.6507 8.50781 6.4707L9.77734 6.00098L8.50781 5.53125C8.02781 5.36125 7.65754 4.98098 7.47754 4.50098L7.00781 3.23145L6.53809 4.50098Z" fill="#161616" />
                    </svg>
                </div>
              </div>
            </div>
            <img 
            className="block w-full h-auto"
              src={`http://localhost:8000/${poi.icon.icon}`} 
              alt={poi.name}
            />
            <div
            className={`bg-[#22C55ECC] text-white pe-[14%] opacity-0 ${poi.clickable == 0 ? 'lg:group-hover:opacity-100 group-active:opacity-100':'hidden'} duration-[400ms] ps-[32%] py-[6px] rounded-e-full flex items-center justify-center absolute -z-10 w-max size-auto`}
            style={{
              top: '15%',
              left: '80%',
              paddingBlock: `${finalSize / 10}px`,
              paddingRight: `${finalSize / 4}px`,
              fontSize: `${finalSize / 3.5}px`,
            }}
            >
            <p>{poi.name}</p>
            </div>
            </div>
              }
            )}
          </div>
          <div
          ref={positionIconRef}
          className='absolute inset-0 w-3/8 pointer-events-none'>
            {
              (()=>{
                const poiIconX = imageTransform.x + (coordinate.x * imageTransform.width)
                const poiIconY = imageTransform.y + (coordinate.y * imageTransform.height)
                const baseSize = 32
                const scaledSize = (baseSize) * imageTransform.scale
                const minSize = 32  // حد أدنى
                const maxSize = 800 // حد أقصى
                const finalSize = Math.max(minSize, Math.min(maxSize, scaledSize))
                return<>
                <div
                className='absolute z-20 h-auto cursor-pointer hover:z-20 pointer-events-auto group transform -translate-x-1/2 -translate-y-1/2'
                    style={{
                      left: `${poiIconX}px`,
                      top: `${poiIconY}px`,
                      width: `${finalSize}px`
                    }}
                    onMouseDown={handleNewIconDragStart}
                    onTouchStart={handleNewIconDragStart}                    
                    >
                {selectedIcon && 
                <img className='w-full block h-auto' src={`http://localhost:8000/${selectedIcon.icon}`} alt="" />
                }
                </div>
                </>
              })()
            }
          </div>
      </div>
    </div>
  </div>
  </>
}
