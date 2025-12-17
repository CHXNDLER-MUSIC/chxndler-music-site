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
  element: 'center' | 'heart' | 'water' | 'lightning' | 'darkness';
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

  // Orbital configuration for two-tier system
  const elementalOrbitConfig = {
    heart: { orbitRadius: 8, orbitSpeed: 0.3, startAngle: 0 },
    water: { orbitRadius: 8, orbitSpeed: 0.3, startAngle: Math.PI / 2 },
    lightning: { orbitRadius: 8, orbitSpeed: 0.3, startAngle: Math.PI },
    darkness: { orbitRadius: 8, orbitSpeed: 0.3, startAngle: (3 * Math.PI) / 2 }
  };

  const planetData: PlanetData[] = [
    {
      id: 'CENTER',
      name: 'Heartverse Core',
      color: 0xffaa00,
      radius: 3,
      distance: 0,
      speed: 0,
      element: 'center'
    },
    {
      id: 'HEART',
      name: 'Heart Planet',
      color: 0xff6b9d,
      radius: 2,
      distance: 18,
      speed: 0.008,
      element: 'heart'
    },
    {
      id: 'WATER',
      name: 'Water Planet',
      color: 0x4fc3f7,
      radius: 2,
      distance: 18,
      speed: 0.008,
      element: 'water'
    },
    {
      id: 'LIGHTNING',
      name: 'Lightning Planet',
      color: 0xffeb3b,
      radius: 2,
      distance: 18,
      speed: 0.008,
      element: 'lightning'
    },
    {
      id: 'DARKNESS',
      name: 'Darkness Planet',
      color: 0x9c27b0,
      radius: 2,
      distance: 18,
      speed: 0.008,
      element: 'darkness'
    }
  ];

  // Element-specific geometry creation functions
  const createHeartGeometry = (radius: number): THREE.BufferGeometry => {
    const heartShape = new THREE.Shape();
    const scale = radius * 0.6;
    
    // Create accurate heart shape matching the texture
    heartShape.moveTo(0, -scale * 0.3);
    // Right curve of heart
    heartShape.bezierCurveTo(scale * 0.4, -scale * 0.8, scale * 0.8, -scale * 0.4, scale * 0.4, 0);
    // Right side to bottom point
    heartShape.bezierCurveTo(scale * 0.4, scale * 0.4, 0, scale * 0.8, 0, scale * 0.8);
    // Left side from bottom point
    heartShape.bezierCurveTo(0, scale * 0.8, -scale * 0.4, scale * 0.4, -scale * 0.4, 0);
    // Left curve of heart
    heartShape.bezierCurveTo(-scale * 0.8, -scale * 0.4, -scale * 0.4, -scale * 0.8, 0, -scale * 0.3);
    
    const extrudeSettings = { 
      depth: radius * 0.5, 
      bevelEnabled: true, 
      bevelSize: 0.05, 
      bevelThickness: 0.02 
    };
    return new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
  };

  const createWaterDropGeometry = (radius: number): THREE.BufferGeometry => {
    const points = [];
    const height = radius * 1.6;
    const baseRadius = radius * 0.8;
    
    // Create water droplet using LatheGeometry
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const angle = t * Math.PI;
      let currentRadius;
      
      if (t < 0.7) {
        // Rounded bottom part
        currentRadius = baseRadius * Math.sin(angle * 0.7 / 0.7);
      } else {
        // Tapering top part
        const tapering = (1 - t) / 0.3;
        currentRadius = baseRadius * tapering * 0.5;
      }
      
      const y = height * (t - 0.5);
      points.push(new THREE.Vector2(currentRadius, y));
    }
    
    return new THREE.LatheGeometry(points, 16);
  };

  const createLightningGeometry = (radius: number): THREE.BufferGeometry => {
    const lightningShape = new THREE.Shape();
    const scale = radius * 0.8;
    
    // Create lightning bolt matching the texture - more angular and sharp
    lightningShape.moveTo(-scale * 0.15, scale * 0.9);  // Top left
    lightningShape.lineTo(scale * 0.1, scale * 0.9);    // Top right
    lightningShape.lineTo(scale * 0.25, scale * 0.3);   // Upper right angle
    lightningShape.lineTo(scale * 0.45, scale * 0.4);   // Right spike
    lightningShape.lineTo(scale * 0.15, scale * 0.1);   // Back in
    lightningShape.lineTo(scale * 0.3, -scale * 0.1);   // Middle right
    lightningShape.lineTo(scale * 0.6, -scale * 0.9);   // Bottom right point
    lightningShape.lineTo(scale * 0.2, -scale * 0.6);   // Bottom right inner
    lightningShape.lineTo(scale * 0.05, -scale * 0.7);  // Bottom inner point
    lightningShape.lineTo(-scale * 0.15, -scale * 0.2); // Bottom left
    lightningShape.lineTo(-scale * 0.35, -scale * 0.1); // Left spike
    lightningShape.lineTo(-scale * 0.05, scale * 0.2);  // Back in left
    lightningShape.lineTo(-scale * 0.15, scale * 0.9);  // Close to top
    
    const extrudeSettings = { 
      depth: radius * 0.25, 
      bevelEnabled: true, 
      bevelSize: 0.03, 
      bevelThickness: 0.01 
    };
    return new THREE.ExtrudeGeometry(lightningShape, extrudeSettings);
  };

  const createCenterPlanetGeometry = (radius: number): THREE.BufferGeometry => {
    // For now, create a larger, more complex heart shape
    // In future, we could add antennas as separate meshes
    const heartShape = new THREE.Shape();
    const scale = radius * 0.7; // Larger than regular heart
    
    // Create heart shape matching center planet texture
    heartShape.moveTo(0, -scale * 0.2);
    // Right curve of heart - more pronounced
    heartShape.bezierCurveTo(scale * 0.5, -scale * 0.9, scale * 0.9, -scale * 0.3, scale * 0.4, 0.1);
    // Right side to bottom point
    heartShape.bezierCurveTo(scale * 0.4, scale * 0.5, 0, scale * 0.9, 0, scale * 0.9);
    // Left side from bottom point
    heartShape.bezierCurveTo(0, scale * 0.9, -scale * 0.4, scale * 0.5, -scale * 0.4, 0.1);
    // Left curve of heart - more pronounced
    heartShape.bezierCurveTo(-scale * 0.9, -scale * 0.3, -scale * 0.5, -scale * 0.9, 0, -scale * 0.2);
    
    const extrudeSettings = { 
      depth: radius * 0.6, 
      bevelEnabled: true, 
      bevelSize: 0.08, 
      bevelThickness: 0.04 
    };
    return new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
  };

  const createElementGeometry = (element: string, radius: number): THREE.BufferGeometry => {
    switch (element) {
      case 'heart':
        return createHeartGeometry(radius);
      case 'water':
        return createWaterDropGeometry(radius);
      case 'lightning':
        return createLightningGeometry(radius);
      case 'center':
        return createCenterPlanetGeometry(radius);
      case 'darkness':
      default:
        // Darkness stays as sphere but with modified material
        return new THREE.SphereGeometry(radius, 32, 32);
    }
  };

  const getElementGlowConfig = (element: string) => {
    switch (element) {
      case 'heart':
        return { color: 0xff69b4, intensity: 1.2, pulseSpeed: 2.5 };
      case 'water':
        return { color: 0x00bfff, intensity: 0.8, pulseSpeed: 1.8 };
      case 'lightning':
        return { color: 0xffff00, intensity: 1.5, pulseSpeed: 8.0 };
      case 'darkness':
        return { color: 0x8a2be2, intensity: 0.4, pulseSpeed: 1.0 };
      case 'center':
        return { color: 0xffd700, intensity: 2.0, pulseSpeed: 1.5 };
      default:
        return { color: 0xffffff, intensity: 1.0, pulseSpeed: 1.0 };
    }
  };

  // Orbital calculation helper functions
  const calculateOrbitPosition = (time: number, orbitRadius: number, orbitSpeed: number, startAngle: number) => {
    const angle = startAngle + time * orbitSpeed;
    return {
      x: Math.cos(angle) * orbitRadius,
      z: Math.sin(angle) * orbitRadius,
      y: 0 // Can be modified for subtle bobbing if needed
    };
  };

  const calculateSongOrbitPosition = (time: number, localRadius: number, localSpeed: number, localStartAngle: number) => {
    const localAngle = localStartAngle + time * localSpeed;
    return {
      x: Math.cos(localAngle) * localRadius,
      z: Math.sin(localAngle) * localRadius,
      y: 0.2 * Math.sin(time * 2) // Subtle vertical bobbing
    };
  };

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
    let elementOrbitGroups: { [key: string]: THREE.Group } = {};
    let centerPlanet: THREE.Mesh;
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

      // Create planets using two-tier orbit system
      planetData.forEach((planetInfo, index) => {
        // Use element-specific geometry
        const geometry = createElementGeometry(planetInfo.element, planetInfo.radius);
        const glowConfig = getElementGlowConfig(planetInfo.element);
        
        // Create emissive material for each planet
        const material = new THREE.MeshStandardMaterial({ 
          color: planetInfo.color,
          emissive: new THREE.Color(glowConfig.color),
          emissiveIntensity: glowConfig.intensity * 0.3,
          metalness: planetInfo.element === 'water' ? 0.8 : 0.1,
          roughness: planetInfo.element === 'water' ? 0.1 : 0.8,
          transparent: planetInfo.element === 'water',
          opacity: planetInfo.element === 'water' ? 0.9 : 1.0
        });

        const planet = new THREE.Mesh(geometry, material);
        
        // Create glow effect using additional geometry
        const glowGeometry = new THREE.SphereGeometry(planetInfo.radius * 1.3, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: glowConfig.color,
          transparent: true,
          opacity: 0.3,
          side: THREE.BackSide
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        
        // Outer glow
        const outerGlowGeometry = new THREE.SphereGeometry(planetInfo.radius * 1.6, 16, 16);
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
          color: glowConfig.color,
          transparent: true,
          opacity: 0.1,
          side: THREE.BackSide
        });
        const outerGlowMesh = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);

        // Store planet data for animation
        (planet as any).planetData = planetInfo;
        (planet as any).glowMesh = glowMesh;
        (planet as any).outerGlowMesh = outerGlowMesh;
        (planet as any).glowConfig = glowConfig;

        if (planetInfo.element === 'center') {
          // Tier 0: Center planet fixed at origin
          planet.position.set(0, 0, 0);
          glowMesh.position.set(0, 0, 0);
          outerGlowMesh.position.set(0, 0, 0);
          
          centerPlanet = planet;
          scene.add(planet);
          scene.add(glowMesh);
          scene.add(outerGlowMesh);
        } else {
          // Tier 1: Elemental planets orbit the center
          const elementKey = planetInfo.element as keyof typeof elementalOrbitConfig;
          const orbitConfig = elementalOrbitConfig[elementKey];
          
          // Create orbit group for this element
          const orbitGroup = new THREE.Group();
          elementOrbitGroups[elementKey] = orbitGroup;
          
          // Position planet at local origin within its orbit group
          planet.position.set(0, 0, 0);
          glowMesh.position.set(0, 0, 0);
          outerGlowMesh.position.set(0, 0, 0);
          
          // Add planet and glows to the orbit group
          orbitGroup.add(planet);
          orbitGroup.add(glowMesh);
          orbitGroup.add(outerGlowMesh);
          
          // Store orbit configuration
          (orbitGroup as any).orbitConfig = orbitConfig;
          (orbitGroup as any).elementKey = elementKey;
          
          // Add orbit group to scene
          scene.add(orbitGroup);
          
          planets.push(planet);
        }
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

        const time = Date.now() * 0.001;

        // Tier 0: Center planet animation (rotation only)
        if (centerPlanet) {
          const planetInfo = (centerPlanet as any).planetData;
          const glowMesh = (centerPlanet as any).glowMesh;
          const outerGlowMesh = (centerPlanet as any).outerGlowMesh;
          const glowConfig = (centerPlanet as any).glowConfig;

          // Center planet stays at origin, only rotates
          centerPlanet.rotation.y += 0.006;

          // Center planet glow effects
          const pulse = 0.8 + 0.3 * Math.sin(time * glowConfig.pulseSpeed);
          const emissiveIntensity = glowConfig.intensity * 0.4 * (1.0 + 0.2 * Math.sin(time * glowConfig.pulseSpeed));

          if (glowMesh && outerGlowMesh) {
            glowMesh.scale.setScalar(pulse);
            outerGlowMesh.scale.setScalar(pulse * 0.8);
            
            if (centerPlanet.material instanceof THREE.MeshStandardMaterial) {
              centerPlanet.material.emissiveIntensity = emissiveIntensity;
            }
          }
        }

        // Tier 1: Elemental planets orbit around center
        Object.values(elementOrbitGroups).forEach((orbitGroup) => {
          const orbitConfig = (orbitGroup as any).orbitConfig;
          const elementKey = (orbitGroup as any).elementKey;

          // Calculate orbital position
          const orbitPos = calculateOrbitPosition(time, orbitConfig.orbitRadius, orbitConfig.orbitSpeed, orbitConfig.startAngle);
          orbitGroup.position.set(orbitPos.x, orbitPos.y, orbitPos.z);

          // Animate the planet within its orbit group
          const planet = orbitGroup.children.find(child => child instanceof THREE.Mesh && (child as any).planetData) as THREE.Mesh;
          if (planet) {
            const planetInfo = (planet as any).planetData;
            const glowMesh = (planet as any).glowMesh;
            const outerGlowMesh = (planet as any).outerGlowMesh;
            const glowConfig = (planet as any).glowConfig;

            // Element-specific animations
            let pulse = 1.0;
            let emissiveIntensity = glowConfig.intensity * 0.3;
            
            switch (planetInfo.element) {
              case 'heart':
                // Pulsing heart effect
                pulse = 0.9 + 0.2 * Math.sin(time * glowConfig.pulseSpeed);
                emissiveIntensity = glowConfig.intensity * 0.3 * (1.0 + 0.3 * Math.sin(time * glowConfig.pulseSpeed));
                planet.rotation.y += 0.003;
                // Subtle bobbing
                planet.position.y = 0.1 * Math.sin(time * 2);
                if (glowMesh) glowMesh.position.y = planet.position.y;
                if (outerGlowMesh) outerGlowMesh.position.y = planet.position.y;
                break;
              case 'lightning':
                // Quick flicker for lightning
                pulse = 0.9 + 0.3 * Math.sin(time * glowConfig.pulseSpeed) + 0.2 * Math.sin(time * 12);
                emissiveIntensity = glowConfig.intensity * 0.3 * (1.0 + 0.5 * Math.sin(time * glowConfig.pulseSpeed));
                planet.rotation.y += 0.008;
                planet.rotation.z += 0.002;
                break;
              case 'water':
                // Gentle wave-like movement
                pulse = 0.85 + 0.25 * Math.sin(time * glowConfig.pulseSpeed);
                planet.rotation.y += 0.004;
                planet.position.y = 0.15 * Math.sin(time * 1.5);
                if (glowMesh) glowMesh.position.y = planet.position.y;
                if (outerGlowMesh) outerGlowMesh.position.y = planet.position.y;
                break;
              case 'darkness':
                // Subtle, mysterious pulse
                pulse = 0.95 + 0.1 * Math.sin(time * glowConfig.pulseSpeed);
                emissiveIntensity = glowConfig.intensity * 0.3 * (0.8 + 0.4 * Math.sin(time * glowConfig.pulseSpeed));
                planet.rotation.y += 0.002;
                planet.rotation.x += 0.001;
                break;
              default:
                planet.rotation.y += 0.005;
            }
            
            // Update glow scale and material properties
            if (glowMesh && outerGlowMesh) {
              glowMesh.scale.setScalar(pulse);
              outerGlowMesh.scale.setScalar(pulse * 0.8);
              
              // Update emissive intensity
              if (planet.material instanceof THREE.MeshStandardMaterial) {
                planet.material.emissiveIntensity = emissiveIntensity;
              }
            }
          }
        });

        // Future: Tier 2 song planets would be animated here
        // Each song planet orbits within its elemental planet's group

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
      <div className="absolute top-0 left-0 z-10 bg-purple-500 text-white p-2 text-sm pointer-events-none min-w-[320px]">
        Interactive Planetarium - Drag to orbit • Scroll to zoom • {planetData.length} Planets
      </div>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}