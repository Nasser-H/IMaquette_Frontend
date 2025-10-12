import React, { useEffect, useRef, useState } from 'react';

export default function Orbite() {
  const canvasRef = useRef(null);
  const [images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [zoom, setZoom] = useState(1);

  const totalFrames = 36;
  const dragging = useRef(false);
  const startX = useRef(0);

  // Load images
  useEffect(() => {
    async function loadImages() {
      const imgs = [];
      const promises = [];

      for (let i = 0; i < totalFrames; i++) {
        const img = new Image();
        img.src = `/assets/image/pics-o/36_${i.toString().padStart(4, '0')}_Ultra.jpg`;
        imgs.push(img);
        promises.push(new Promise((resolve) => {
          img.onload = () => resolve(null);
        }));
      }

      await Promise.all(promises);
      setImages(imgs);
    }

    loadImages();
  }, []);

  // Draw current frame
  function drawImage() {
    const canvas = canvasRef.current;
    if (!canvas || !images[currentFrame]) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameImage = images[currentFrame];

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const scale = Math.min(
      canvas.width / frameImage.width,
      canvas.height / frameImage.height
    ) * zoom;

    const imageWidth = frameImage.width * scale;
    const imageHeight = frameImage.height * scale;

    const x = (canvas.width - imageWidth) / 2;
    const y = (canvas.height - imageHeight) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frameImage, x, y, imageWidth, imageHeight);
  }

  useEffect(() => {
    drawImage();
  }, [currentFrame, zoom, images]);

  // Mouse and touch events
  function handleStart(x) {
    dragging.current = true;
    setIsDragging(true);
    startX.current = x;
  }

  function handleMove(x) {
    if (!dragging.current) return;

    const deltaX = x - startX.current;
    const sensitivity = 5;

    if (Math.abs(deltaX) > sensitivity) {
      const direction = deltaX > 0 ? 1 : -1;
      setCurrentFrame((prev) => (prev + direction + totalFrames) % totalFrames);
      startX.current = x;
    }
  }

  function handleEnd() {
    dragging.current = false;
    setIsDragging(false);
  }

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-gray-900">
      <div className="absolute w-full h-full flex justify-center items-center">
        <div className="relative w-full h-full overflow-hidden">
          <canvas
            ref={canvasRef}
            className={`w-full h-full ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            } select-none`}
            onMouseDown={(e) => handleStart(e.clientX)}
            onMouseMove={(e) => handleMove(e.clientX)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
          />
        </div>
      </div>
    </div>
  );
}
