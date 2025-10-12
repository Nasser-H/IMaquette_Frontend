import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function Three() {
  const containerRef = useRef(null);
  const [currentScene, setCurrentScene] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null); // 🆕 local image file URL

  const scenes = [
    {
      image: null, // this will be replaced by uploaded image
      hotspots: []
    }
  ];

  useEffect(() => {
    if (!containerRef.current) return;
    if (!uploadedImage) return; // wait until user uploads

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      1100
    );
    camera.position.set(0, 0, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(uploadedImage);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(sphereMesh);

    let lon = 0, lat = 0;
    let isUserInteracting = false;
    let onPointerDownMouseX = 0, onPointerDownMouseY = 0;
    let onPointerDownLon = 0, onPointerDownLat = 0;

    function onPointerDown(event) {
      isUserInteracting = true;
      const clientX = event.clientX || event.touches?.[0]?.clientX;
      const clientY = event.clientY || event.touches?.[0]?.clientY;
      onPointerDownMouseX = clientX;
      onPointerDownMouseY = clientY;
      onPointerDownLon = lon;
      onPointerDownLat = lat;
      renderer.domElement.style.cursor = "grabbing";
    }

    function onPointerMove(event) {
      const clientX = event.clientX || event.touches?.[0]?.clientX;
      const clientY = event.clientY || event.touches?.[0]?.clientY;
      if (isUserInteracting) {
        lon = (onPointerDownMouseX - clientX) * 0.1 + onPointerDownLon;
        lat = (clientY - onPointerDownMouseY) * 0.1 + onPointerDownLat;
      }
    }

    function onPointerUp() {
      isUserInteracting = false;
      renderer.domElement.style.cursor = "grab";
    }

    renderer.domElement.addEventListener("mousedown", onPointerDown);
    renderer.domElement.addEventListener("mousemove", onPointerMove);
    renderer.domElement.addEventListener("mouseup", onPointerUp);
    renderer.domElement.addEventListener("touchstart", onPointerDown);
    renderer.domElement.addEventListener("touchmove", onPointerMove);
    renderer.domElement.addEventListener("touchend", onPointerUp);
    renderer.domElement.style.cursor = "grab";

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onWindowResize);

    function animate() {
      requestAnimationFrame(animate);
      lat = Math.max(-85, Math.min(85, lat));
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);
      const x = 500 * Math.sin(phi) * Math.cos(theta);
      const y = 500 * Math.cos(phi);
      const z = 500 * Math.sin(phi) * Math.sin(theta);
      camera.lookAt(x, y, z);
      renderer.render(scene, camera);
    }

    animate();

    return () => {
      window.removeEventListener("resize", onWindowResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [uploadedImage]);

  // 🆕 handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setUploadedImage(url);
  };

  return (
    <div className="w-screen h-screen bg-black flex flex-col items-center justify-center">
      {!uploadedImage && (
        <div className="absolute z-10 top-10 flex flex-col items-center space-y-4">
          <h2 className="text-white text-lg font-semibold">Upload a 360° image</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-white"
          />
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          background: "#000"
        }}
      />
    </div>
  );
}
