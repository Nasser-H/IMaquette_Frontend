import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function Three() {
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, lon: 0, lat: 0 });
  const isDraggingRef = useRef(false);
  const [currentScene, setCurrentScene] = useState(0);

  // Define scenes with their images and hotspots
  const scenes = [
    {
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2048&q=80',
      hotspots: [
        { position: [0, 0, -400], targetScene: 1, label: 'Go Forward' },
        { position: [400, 0, 0], targetScene: 2, label: 'Go Right' }
      ]
    },
    {
      image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=2048&q=80',
      hotspots: [
        { position: [0, 0, 400], targetScene: 0, label: 'Go Back' },
        { position: [-400, 0, 0], targetScene: 2, label: 'Go Left' }
      ]
    },
    {
      image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=2048&q=80',
      hotspots: [
        { position: [-400, 0, 0], targetScene: 0, label: 'Go Left' },
        { position: [0, 0, -400], targetScene: 1, label: 'Go Forward' }
      ]
    }
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    let lon = 0;
    let lat = 0;
    let phi = 0;
    let theta = 0;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      1100
    );
    camera.target = new THREE.Vector3(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Raycaster for hotspot detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const hotspotMeshes = [];

    // Sphere geometry
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    // Texture
    const textureLoader = new THREE.TextureLoader();
    let sphereMesh;
    let newSphereMesh;
    let isTransitioning = false;
    let transitionProgress = 0;
    let targetFOV = 75;
    let startFOV = 75;
    let targetHotspotPosition = null;

    const loadScene = (sceneIndex, hotspotPos = null) => {
      if (isTransitioning) return;
      
      isTransitioning = true;
      transitionProgress = 0;
      startFOV = camera.fov;
      targetFOV = 75;
      
      if (hotspotPos) {
        targetHotspotPosition = new THREE.Vector3(...hotspotPos);
      }

      // Remove old hotspots during transition
      hotspotMeshes.forEach(h => {
        scene.remove(h);
        h.geometry.dispose();
        h.material.dispose();
      });
      hotspotMeshes.length = 0;

      // Load new texture
      const texture = textureLoader.load(scenes[sceneIndex].image, () => {
        // Create new sphere with new texture
        const material = new THREE.MeshBasicMaterial({ 
          map: texture,
          transparent: true,
          opacity: 0
        });
        newSphereMesh = new THREE.Mesh(geometry.clone(), material);
        scene.add(newSphereMesh);

        // Start zoom transition
        const zoomTransition = () => {
          if (transitionProgress < 1) {
            transitionProgress += 0.015;
            const eased = easeInOutCubic(transitionProgress);
            
            // Phase 1: Zoom in (0 to 0.5)
            if (transitionProgress < 0.5) {
              const zoomProgress = transitionProgress * 2;
              camera.fov = startFOV + (30 - startFOV) * zoomProgress;
              
              if (sphereMesh) {
                sphereMesh.material.opacity = 1 - zoomProgress;
              }
            } 
            // Phase 2: Zoom out (0.5 to 1)
            else {
              const zoomProgress = (transitionProgress - 0.5) * 2;
              camera.fov = 30 + (targetFOV - 30) * zoomProgress;
              newSphereMesh.material.opacity = zoomProgress;
            }
            
            camera.updateProjectionMatrix();
            requestAnimationFrame(zoomTransition);
          } else {
            // Transition complete
            if (sphereMesh) {
              scene.remove(sphereMesh);
              sphereMesh.geometry.dispose();
              sphereMesh.material.dispose();
            }
            
            sphereMesh = newSphereMesh;
            sphereMesh.material.transparent = false;
            sphereMesh.material.opacity = 1;
            newSphereMesh = null;
            isTransitioning = false;
            camera.fov = targetFOV;
            camera.updateProjectionMatrix();

            // Create new hotspots after transition
            createHotspots(sceneIndex);
          }
        };
        zoomTransition();
      });
    };

    // Easing function for smooth animation
    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const createHotspots = (sceneIndex) => {
      scenes[sceneIndex].hotspots.forEach((hotspot, index) => {
        // Circle geometry for hotspot
        const hotspotGeometry = new THREE.CircleGeometry(20, 32);
        const hotspotMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        const hotspotMesh = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
        
        hotspotMesh.position.set(...hotspot.position);
        hotspotMesh.lookAt(0, 0, 0);
        hotspotMesh.userData = { 
          targetScene: hotspot.targetScene,
          label: hotspot.label,
          isHotspot: true 
        };
        
        scene.add(hotspotMesh);
        hotspotMeshes.push(hotspotMesh);

        // Add pulsing animation data
        hotspotMesh.userData.originalScale = hotspotMesh.scale.clone();
        hotspotMesh.userData.time = Math.random() * Math.PI * 2;
      });
    };

    loadScene(currentScene);

    // Mouse/Touch handlers
    let clickStartPos = { x: 0, y: 0 };

    const onPointerStart = (e) => {
      isDraggingRef.current = true;
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      
      mouseRef.current.x = clientX;
      mouseRef.current.y = clientY;
      mouseRef.current.lon = lon;
      mouseRef.current.lat = lat;
      
      clickStartPos = { x: clientX, y: clientY };
      renderer.domElement.style.cursor = 'grabbing';
    };

    const onPointerMove = (e) => {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      if (isDraggingRef.current) {
        lon = (mouseRef.current.x - clientX) * 0.1 + mouseRef.current.lon;
        lat = (clientY - mouseRef.current.y) * 0.1 + mouseRef.current.lat;
      } else {
        // Check hotspot hover
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(hotspotMeshes);

        hotspotMeshes.forEach(h => {
          h.material.color.setHex(0x00ff00);
        });

        if (intersects.length > 0 && intersects[0].object.userData.isHotspot) {
          intersects[0].object.material.color.setHex(0xffff00);
          renderer.domElement.style.cursor = 'pointer';
        } else {
          renderer.domElement.style.cursor = 'grab';
        }
      }
    };

    const onPointerEnd = (e) => {
      isDraggingRef.current = false;
      renderer.domElement.style.cursor = 'grab';

      const clientX = e.clientX || e.changedTouches[0].clientX;
      const clientY = e.clientY || e.changedTouches[0].clientY;

      // Check if it was a click (not a drag)
      const distance = Math.sqrt(
        Math.pow(clientX - clickStartPos.x, 2) + 
        Math.pow(clientY - clickStartPos.y, 2)
      );

      if (distance < 5) {
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(hotspotMeshes);

        if (intersects.length > 0 && intersects[0].object.userData.isHotspot) {
          const targetScene = intersects[0].object.userData.targetScene;
          const hotspotPos = intersects[0].object.position.toArray();
          setCurrentScene(targetScene);
          loadScene(targetScene, hotspotPos);
        }
      }
    };

    // Event listeners
    renderer.domElement.addEventListener('mousedown', onPointerStart);
    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('mouseup', onPointerEnd);
    renderer.domElement.addEventListener('touchstart', onPointerStart);
    renderer.domElement.addEventListener('touchmove', onPointerMove);
    renderer.domElement.addEventListener('touchend', onPointerEnd);
    renderer.domElement.style.cursor = 'grab';

    // Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      update();
    };

    const update = () => {
      lat = Math.max(-85, Math.min(85, lat));
      phi = THREE.MathUtils.degToRad(90 - lat);
      theta = THREE.MathUtils.degToRad(lon);

      const x = 500 * Math.sin(phi) * Math.cos(theta);
      const y = 500 * Math.cos(phi);
      const z = 500 * Math.sin(phi) * Math.sin(theta);

      camera.lookAt(x, y, z);

      // Animate hotspots (pulsing effect)
      hotspotMeshes.forEach(hotspot => {
        hotspot.userData.time += 0.03;
        const scale = 1 + Math.sin(hotspot.userData.time) * 0.2;
        hotspot.scale.set(scale, scale, 1);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onPointerStart);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('mouseup', onPointerEnd);
      renderer.domElement.removeEventListener('touchstart', onPointerStart);
      renderer.domElement.removeEventListener('touchmove', onPointerMove);
      renderer.domElement.removeEventListener('touchend', onPointerEnd);
      
      hotspotMeshes.forEach(h => {
        scene.remove(h);
        h.geometry.dispose();
        h.material.dispose();
      });

      if (sphereMesh) {
        scene.remove(sphereMesh);
        sphereMesh.geometry.dispose();
        sphereMesh.material.dispose();
      }
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      renderer.dispose();
    };
  }, [currentScene]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        margin: 0, 
        padding: 0, 
        overflow: 'hidden'
      }} 
    />
  );
}