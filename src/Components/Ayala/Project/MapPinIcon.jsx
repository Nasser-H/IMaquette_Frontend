export default function MapPinIcon({imageTransform, iconPos, baseSizeIcon, setClickableIcon, baseSizeClickableIcon}) {
  if (!imageTransform && !iconPos) return null
  
  // حساب الموقع النسبي للأيقونة بناء على موقع الصورة الحالي
  const iconX = imageTransform.x + (iconPos.coordinate_x * imageTransform.width)
  const iconY = imageTransform.y + (iconPos.coordinate_y * imageTransform.height)

  const baseSize = iconPos.clickable == 1 ? baseSizeClickableIcon : baseSizeIcon;

  // حساب الحجم المتناسب للأيقونة بناء على نسبة تكبير الصورة
  const scaledSize = (baseSize) * imageTransform.scale
  
  // حساب الحجم المتناسب للأيقونة بناء على نسبة تكبير الصورة
  // const x = {
  //     coordinate_x: 0.4407552083333333,
  //     coordinate_y: 0.516937255859375,
  //     description: "asdasd",
  //     icon_id: 2,
  //     id: 2,
  //     image: null,
  //     clickable: "1",
  //     name: "adsasdas",
  //     project_id: 1,
  //     type: "a",
  //     type_media: "2d"
  //   }
  // تحديد حدود للحجم (اختياري - لتجنب الأحجام المفرطة)
  const minSize = 32  // حد أدنى
  const maxSize = 400 // حد أقصى
  const finalSize = Math.max(minSize, Math.min(maxSize, scaledSize))
  return <>
    <div 
      className={`absolute h-auto hover:z-20 pointer-events-auto group transform -translate-x-1/2 -translate-y-1/2 ${iconPos.clickable == 1 && 'cursor-pointer'}`}
      onClick={() => {
        if (iconPos.clickable == 1) {
          setClickableIcon(true)
        }
      }}
      style={{
        left: `${iconX}px`,
        top: `${iconY}px`,
        width: `${finalSize}px`
      }}
        >
      <img 
      className="block w-full h-auto"
        src={`http://localhost:8000/${iconPos.icon.icon}`} 
        alt={iconPos.name}
      />
      <div 
      className={`bg-[#22C55ECC] text-white pe-[14%] opacity-0 ${iconPos.clickable == 0 && 'lg:group-hover:opacity-100 group-active:opacity-100'} duration-[400ms] ps-[32%] py-[6px] rounded-e-full flex items-center justify-center absolute -z-10 w-max size-auto`}
      style={{
        top: '15%',
        left: '80%',
        paddingBlock: `${finalSize / 10}px`,
        paddingRight: `${finalSize / 4}px`,
        fontSize: `${finalSize / 3.5}px`,
      }}
      > 
        <p>{iconPos.name}</p>
      </div>
    </div>
  </>
}
// transform -translate-x-1/2 -translate-y-1/2