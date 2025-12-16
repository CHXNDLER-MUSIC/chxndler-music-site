'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface VanillaPlanetariumProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

interface PlanetData {
  id: string;
  name: string;
  color: number;
  radius: number;
  distance: number;
  speed: number;
  texture?: string;
}

export default function VanillaPlanetarium({ 
  zoomLevel, 
  initialActivePlanet, 
  onPlanetSelect, 
  worldId 
}: VanillaPlanetariumProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('VanillaPlanetarium: Component loading...');

  const planetData: PlanetData[] = [
    {
      id: 'CENTER',
      name: 'Heartverse Core',
      color: 0xffaa00,
      radius: 3,
      distance: 0,
      speed: 0,
      texture: '/textures/center-planet.webp'
    },
    {
      id: 'HEART',
      name: 'Heart Planet',
      color: 0xff6b9d,
      radius: 2,
      distance: 18,
      speed: 0.008,
      texture: '/textures/planet_heart.webp'
    },
    {
      id: 'WATER',
      name: 'Water Planet',
      color: 0x4fc3f7,
      radius: 2,
      distance: 18,
      speed: 0.008,
      texture: '/textures/planet_water.webp'
    },
    {
      id: 'LIGHTNING',
      name: 'Lightning Planet',
      color: 0xffeb3b,
      radius: 2,
      distance: 18,
      speed: 0.008,
      texture: '/textures/planet_lightning.webp'
    },
    {
      id: 'DARKNESS',
      name: 'Darkness Planet',
      color: 0x9c27b0,
      radius: 2,
      distance: 18,
      speed: 0.008,
      texture: '/textures/planet_darkness.webp'
    }
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mountRef.current) return;

    console.log('VanillaPlanetarium: Initializing planetarium scene');

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let planets: THREE.Mesh[] = [];
    let animationId: number;
    let textureLoader: THREE.TextureLoader;

    // Camera control variables
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraDistance = 25;
    let cameraTheta = 0; // horizontal rotation
    let cameraPhi = Math.PI / 4; // vertical rotation (45 degrees)
    let targetTheta = 0;
    let targetPhi = Math.PI / 4;
    let targetDistance = 25;

    try {
      // Scene setup
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a1a);

      // Camera setup
      camera = new THREE.PerspectiveCamera(
        60,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 10, 25);
      camera.lookAt(0, 0, 0);

      // Renderer setup
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      // Ensure canvas can receive pointer events with high z-index
      renderer.domElement.style.pointerEvents = 'auto';
      renderer.domElement.style.touchAction = 'none';
      renderer.domElement.style.position = 'relative';
      renderer.domElement.style.zIndex = '999';

      // Texture loader
      textureLoader = new THREE.TextureLoader();

      // Create planets
      planetData.forEach((planetInfo, index) => {
        const geometry = new THREE.SphereGeometry(planetInfo.radius, 32, 32);
        
        // Create material with or without texture
        let material: THREE.MeshStandardMaterial;
        if (planetInfo.texture) {
          const texture = textureLoader.load(planetInfo.texture);
          texture.colorSpace = THREE.SRGBColorSpace;
          material = new THREE.MeshStandardMaterial({ 
            map: texture,
            metalness: 0.1,
            roughness: 0.8
          });
        } else {
          material = new THREE.MeshStandardMaterial({ 
            color: planetInfo.color,
            metalness: 0.1,
            roughness: 0.8
          });
        }

        const planet = new THREE.Mesh(geometry, material);
        
        // Position planets
        if (planetInfo.distance === 0) {
          // Center planet
          planet.position.set(0, 0, 0);
        } else {
          // Orbiting planets - distribute them evenly around the center
          const angle = (index - 1) * (Math.PI * 2 / 4); // Skip center planet (index 0)
          planet.position.set(
            Math.cos(angle) * planetInfo.distance,
            0,
            Math.sin(angle) * planetInfo.distance
          );
        }

        // Store planet data for animation
        (planet as any).planetData = planetInfo;
        (planet as any).initialAngle = planetInfo.distance === 0 ? 0 : (index - 1) * (Math.PI * 2 / 4);

        planets.push(planet);
        scene.add(planet);
      });

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(10, 15, 10);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0xffffff, 0.5);
      pointLight.position.set(0, 10, 0);
      scene.add(pointLight);

      // Add starfield
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 1000;
      const starPositions = new Float32Array(starCount * 3);
      
      for (let i = 0; i < starCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 200;     // x
        starPositions[i + 1] = (Math.random() - 0.5) * 200; // y
        starPositions[i + 2] = (Math.random() - 0.5) * 200; // z
      }
      
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({ 
        color: 0xffffff, 
        size: 2,
        sizeAttenuation: false
      });
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // Add to DOM
      mountRef.current.appendChild(renderer.domElement);

      // Camera control functions
      const updateCameraPosition = () => {
        // Smoothly interpolate camera position
        cameraTheta = THREE.MathUtils.lerp(cameraTheta, targetTheta, 0.05);
        cameraPhi = THREE.MathUtils.lerp(cameraPhi, targetPhi, 0.05);
        cameraDistance = THREE.MathUtils.lerp(cameraDistance, targetDistance, 0.05);

        // Apply zoom level
        const finalDistance = cameraDistance / zoomLevel;

        // Convert spherical coordinates to Cartesian
        camera.position.x = finalDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta);
        camera.position.y = finalDistance * Math.cos(cameraPhi);
        camera.position.z = finalDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta);

        camera.lookAt(0, 0, 0);
      };

      // Mouse event handlers
      const onMouseDown = (event: MouseEvent) => {
        console.log('🚀 MOUSE DOWN DETECTED ON CANVAS!');
        isDragging = true;
        previousMousePosition = { x: event.clientX, y: event.clientY };
        renderer.domElement.style.cursor = 'grabbing';
        event.preventDefault();
      };

      const onMouseMove = (event: MouseEvent) => {
        if (!isDragging) return;

        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        // Horizontal rotation (around Y axis)
        targetTheta -= deltaX * 0.005;

        // Vertical rotation (around X axis) - limit the range
        targetPhi = THREE.MathUtils.clamp(
          targetPhi + deltaY * 0.005,
          0.1, // Don't go completely to the top
          Math.PI - 0.1 // Don't go completely to the bottom
        );

        previousMousePosition = { x: event.clientX, y: event.clientY };
        event.preventDefault();
      };

      const onMouseUp = () => {
        isDragging = false;
        renderer.domElement.style.cursor = 'grab';
      };

      const onWheel = (event: WheelEvent) => {
        const delta = event.deltaY * 0.001;
        targetDistance = THREE.MathUtils.clamp(
          targetDistance + delta * targetDistance,
          10, // Minimum distance
          100 // Maximum distance
        );
        event.preventDefault();
      };

      // Touch event handlers for mobile
      let touchStart = { x: 0, y: 0 };
      let touchDistance = 0;

      const onTouchStart = (event: TouchEvent) => {
        if (event.touches.length === 1) {
          // Single touch - orbit
          touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
          isDragging = true;
        } else if (event.touches.length === 2) {
          // Two touches - zoom
          const touch1 = event.touches[0];
          const touch2 = event.touches[1];
          touchDistance = Math.sqrt(
            Math.pow(touch1.clientX - touch2.clientX, 2) + 
            Math.pow(touch1.clientY - touch2.clientY, 2)
          );
        }
        event.preventDefault();
      };

      const onTouchMove = (event: TouchEvent) => {
        if (event.touches.length === 1 && isDragging) {
          // Single touch orbit
          const deltaX = event.touches[0].clientX - touchStart.x;
          const deltaY = event.touches[0].clientY - touchStart.y;

          targetTheta -= deltaX * 0.005;
          targetPhi = THREE.MathUtils.clamp(
            targetPhi + deltaY * 0.005,
            0.1,
            Math.PI - 0.1
          );

          touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        } else if (event.touches.length === 2) {
          // Two touch zoom
          const touch1 = event.touches[0];
          const touch2 = event.touches[1];
          const newDistance = Math.sqrt(
            Math.pow(touch1.clientX - touch2.clientX, 2) + 
            Math.pow(touch1.clientY - touch2.clientY, 2)
          );

          const delta = (touchDistance - newDistance) * 0.01;
          targetDistance = THREE.MathUtils.clamp(
            targetDistance + delta,
            10,
            100
          );

          touchDistance = newDistance;
        }
        event.preventDefault();
      };

      const onTouchEnd = (event: TouchEvent) => {
        isDragging = false;
        event.preventDefault();
      };

      // Add event listeners
      renderer.domElement.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      renderer.domElement.addEventListener('wheel', onWheel);
      
      // Touch events
      renderer.domElement.addEventListener('touchstart', onTouchStart);
      renderer.domElement.addEventListener('touchmove', onTouchMove);
      renderer.domElement.addEventListener('touchend', onTouchEnd);

      // Set initial cursor
      renderer.domElement.style.cursor = 'grab';

      // Animation loop
      const animate = () => {
        animationId = requestAnimationFrame(animate);

        // Update camera position
        updateCameraPosition();

        // Animate planets
        planets.forEach((planet) => {
          const planetInfo = (planet as any).planetData;
          const initialAngle = (planet as any).initialAngle;

          if (planetInfo.distance > 0) {
            // Orbit animation
            const time = Date.now() * 0.001;
            const angle = initialAngle + time * planetInfo.speed;
            planet.position.x = Math.cos(angle) * planetInfo.distance;
            planet.position.z = Math.sin(angle) * planetInfo.distance;
          }

          // Rotate planet on its axis
          planet.rotation.y += 0.005;
        });

        renderer.render(scene, camera);
      };

      animate();
      console.log('VanillaPlanetarium: Successfully initialized planetarium');

    } catch (err) {
      console.error('VanillaPlanetarium: Error initializing:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize planetarium');
    }

    // Cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      // Remove event listeners - check if handlers exist before removing
      if (renderer && renderer.domElement) {
        const canvas = renderer.domElement;
        // Remove all event listeners by cloning the element
        const newCanvas = canvas.cloneNode(true);
        if (canvas.parentNode) {
          canvas.parentNode.replaceChild(newCanvas, canvas);
        }
      }
      
      if (renderer) {
        renderer.dispose();
        if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
      }
      if (scene) {
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(mat => mat.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [mounted, zoomLevel]);

  if (!mounted) {
    return (
      <div className="w-full h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Initializing Planetarium...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[500px] bg-red-900 rounded flex items-center justify-center text-white p-4">
        <div className="text-center">
          <h3 className="font-bold mb-2">Planetarium Error</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] relative overflow-hidden">
      <div className="absolute top-0 left-0 z-10 bg-purple-500 text-white p-2 text-sm pointer-events-none">
        Interactive Planetarium - Drag to orbit • Scroll to zoom • {planetData.length} Planets
      </div>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}