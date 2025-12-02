'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PlanetPositionsProvider, usePlanetPositions } from './planet-positions-context';
import { PlanetMinimapV2 } from './PlanetMinimapV2';
import { centerPlanet, elementPlanets, songPlanets } from './planet-data';

interface Planet3D {
  mesh: THREE.Mesh;
  id: string;
  kind: string;
  orbitRadius?: number;
  orbitSpeed?: number;
  elementId?: string;
  released?: boolean;
  startAngle?: number;
}

function ThreeJSScene({ zoomLevel }: { zoomLevel: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const planetsRef = useRef<Planet3D[]>([]);
  const animationRef = useRef<number>();
  const controlsRef = useRef({ theta: 0, phi: Math.PI * 0.3, radius: 35 });
  const zoomRef = useRef({ current: 1, target: 1 }); // For smooth zoom interpolation
  const { updatePosition, activePlanetId } = usePlanetPositions();

  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      1,
      1000
    );
    camera.position.set(0, 18, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Add lights for better texture visibility
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.3);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // Add additional side lighting for better texture detail
    const sideLight1 = new THREE.DirectionalLight(0x8888ff, 0.3);
    sideLight1.position.set(-10, 5, 0);
    scene.add(sideLight1);

    const sideLight2 = new THREE.DirectionalLight(0xff8888, 0.3);
    sideLight2.position.set(10, -5, 0);
    scene.add(sideLight2);

    // Create texture loader
    const textureLoader = new THREE.TextureLoader();
    
    // Create planets
    const planets: Planet3D[] = [];

    // Center planet with texture
    const centerGeometry = new THREE.SphereGeometry(3.5, 64, 64);
    const centerTexture = textureLoader.load('/textures/center-planet.webp');
    centerTexture.wrapS = THREE.RepeatWrapping;
    centerTexture.wrapT = THREE.RepeatWrapping;
    const centerMaterial = new THREE.MeshStandardMaterial({ 
      map: centerTexture,
      emissive: 0x221100,
      emissiveIntensity: 0.1,
      roughness: 0.8,
      metalness: 0.2
    });
    const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
    centerMesh.position.set(0, 0, 0);
    scene.add(centerMesh);
    planets.push({
      mesh: centerMesh,
      id: centerPlanet.id,
      kind: 'center'
    });

    // Element planets - space them evenly around the center (90° apart) with custom shapes
    elementPlanets.forEach((planet, index) => {
      const geometry = getElementGeometry(planet.elementId);
      const texture = textureLoader.load(planet.texturePath);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      const material = new THREE.MeshStandardMaterial({ 
        map: texture,
        emissive: getElementEmissive(planet.elementId),
        emissiveIntensity: 0.05,
        roughness: 0.7,
        metalness: 0.3
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      planets.push({
        mesh,
        id: planet.id,
        kind: 'element',
        orbitRadius: planet.orbitRadius,
        orbitSpeed: planet.orbitSpeed,
        startAngle: (index * Math.PI * 2) / elementPlanets.length // Evenly space around circle
      });
    });

    // Song planets - group by element and space them around each element
    const songsByElement: { [key: string]: typeof songPlanets } = {};
    songPlanets.forEach(song => {
      if (!songsByElement[song.elementId]) songsByElement[song.elementId] = [];
      songsByElement[song.elementId].push(song);
    });

    Object.entries(songsByElement).forEach(([elementId, songs]) => {
      songs.forEach((song, index) => {
        const geometry = new THREE.SphereGeometry(1, 16, 16);
        const material = new THREE.MeshStandardMaterial({ 
          color: song.released ? 0x00ff88 : 0x666666,
          opacity: song.released ? 1 : 0.7,
          transparent: !song.released
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        
        // Space songs evenly around their element
        const angleOffset = (index * Math.PI * 2) / songs.length;
        planets.push({
          mesh,
          id: song.id,
          kind: 'song',
          orbitRadius: song.orbitRadius,
          orbitSpeed: song.orbitSpeed,
          elementId: song.elementId,
          released: song.released,
          startAngle: angleOffset
        });
      });
    });

    planetsRef.current = planets;

    // Mouse controls (proper spherical coordinate orbit)
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;

    const onMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return;
      
      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;
      
      controlsRef.current.theta -= deltaX * 0.005; // horizontal rotation
      controlsRef.current.phi += deltaY * 0.005;   // vertical rotation
      
      // Clamp phi to prevent flipping
      controlsRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, controlsRef.current.phi));
      
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const onWheel = (event: WheelEvent) => {
      // Disable scroll wheel zoom - only buttons should control zoom
      event.preventDefault();
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onWheel);

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      
      // Smooth zoom interpolation
      zoomRef.current.target = zoomLevel;
      zoomRef.current.current += (zoomRef.current.target - zoomRef.current.current) * 0.1;
      
      // Update camera position using spherical coordinates
      const baseRadius = controlsRef.current.radius; // Use the current radius from mouse wheel/controls
      const effectiveRadius = baseRadius / zoomRef.current.current; // Simple division for zoom
      const x = effectiveRadius * Math.sin(controlsRef.current.phi) * Math.cos(controlsRef.current.theta);
      const y = effectiveRadius * Math.cos(controlsRef.current.phi);
      const z = effectiveRadius * Math.sin(controlsRef.current.phi) * Math.sin(controlsRef.current.theta);
      
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
      
      // Update planets
      planetsRef.current.forEach((planet) => {
        if (planet.kind === 'center') {
          // Center planet stays at origin and rotates slowly to show texture
          planet.mesh.rotation.y = time * 0.02;
          updatePosition(planet.id, {
            x: 0, y: 0, z: 0,
            data: centerPlanet
          });
        } else if (planet.kind === 'element' && planet.orbitRadius && planet.orbitSpeed) {
          // Element planets orbit center with starting angle offset and rotate to show texture
          const angle = (planet.startAngle || 0) + (time * planet.orbitSpeed);
          const x = Math.cos(angle) * planet.orbitRadius;
          const z = Math.sin(angle) * planet.orbitRadius;
          planet.mesh.position.set(x, 0, z);
          
          // Rotate the planet to show texture detail
          planet.mesh.rotation.y = time * 0.05;
          planet.mesh.rotation.x = time * 0.02;
          
          const elementData = elementPlanets.find(p => p.id === planet.id)!;
          updatePosition(planet.id, {
            x, y: 0, z,
            data: elementData
          });
        } else if (planet.kind === 'song' && planet.elementId && planet.orbitRadius && planet.orbitSpeed) {
          // Song planets orbit their element planet (which is also moving)
          const elementPlanet = planetsRef.current.find(p => p.id === planet.elementId);
          if (elementPlanet) {
            const elementPos = elementPlanet.mesh.position;
            
            // Song planets orbit their element with their own speed
            const songAngle = (planet.startAngle || 0) + (time * planet.orbitSpeed);
            const localX = Math.cos(songAngle) * planet.orbitRadius;
            const localZ = Math.sin(songAngle) * planet.orbitRadius;
            
            // Position relative to the element planet's current position
            const x = elementPos.x + localX;
            const z = elementPos.z + localZ;
            planet.mesh.position.set(x, 0, z);
            
            const songData = songPlanets.find(p => p.id === planet.id)!;
            updatePosition(planet.id, {
              x, y: 0, z,
              data: songData
            });
          }
        }

        // Handle highlighting
        if (planet.id === activePlanetId) {
          planet.mesh.scale.setScalar(1.2);
        } else {
          planet.mesh.scale.setScalar(1.0);
        }
      });


      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Zoom level is handled in the animation loop

  return <div ref={containerRef} className="w-full h-full" />;
}

function getElementColor(elementId: string): number {
  switch (elementId) {
    case 'HEART': return 0xff6b9d;
    case 'WATER': return 0x4fc3f7;
    case 'LIGHTNING': return 0xffeb3b;
    case 'DARKNESS': return 0x9c27b0;
    default: return 0x888888;
  }
}

function getElementEmissive(elementId: string): number {
  switch (elementId) {
    case 'HEART': return 0x330a15;
    case 'WATER': return 0x0a1a33;
    case 'LIGHTNING': return 0x332a0a;
    case 'DARKNESS': return 0x1a0a33;
    default: return 0x111111;
  }
}

// Create custom geometries for element planets
function createWaterDropletGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  
  // Create a water droplet shape
  const scale = 2;
  shape.moveTo(0, -1.5 * scale);
  shape.bezierCurveTo(-0.8 * scale, -1.5 * scale, -1.2 * scale, -0.5 * scale, -1.2 * scale, 0.2 * scale);
  shape.bezierCurveTo(-1.2 * scale, 1 * scale, -0.6 * scale, 1.5 * scale, 0, 1.5 * scale);
  shape.bezierCurveTo(0.6 * scale, 1.5 * scale, 1.2 * scale, 1 * scale, 1.2 * scale, 0.2 * scale);
  shape.bezierCurveTo(1.2 * scale, -0.5 * scale, 0.8 * scale, -1.5 * scale, 0, -1.5 * scale);
  
  const extrudeSettings = {
    depth: 0.3,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 2,
    bevelSize: 0.1,
    bevelThickness: 0.1
  };
  
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

function createLightningBoltGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  
  // Create a lightning bolt shape
  const scale = 1.2;
  shape.moveTo(-0.3 * scale, 1.5 * scale);
  shape.lineTo(0.1 * scale, 1.5 * scale);
  shape.lineTo(-0.4 * scale, 0.3 * scale);
  shape.lineTo(0 * scale, 0.3 * scale);
  shape.lineTo(-0.6 * scale, -1.5 * scale);
  shape.lineTo(-0.2 * scale, -1.5 * scale);
  shape.lineTo(0.3 * scale, -0.3 * scale);
  shape.lineTo(-0.1 * scale, -0.3 * scale);
  shape.lineTo(0.5 * scale, 1.5 * scale);
  shape.lineTo(-0.3 * scale, 1.5 * scale);
  
  const extrudeSettings = {
    depth: 0.4,
    bevelEnabled: true,
    bevelSegments: 6,
    steps: 2,
    bevelSize: 0.05,
    bevelThickness: 0.05
  };
  
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

function createHeartGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  
  // Create a heart shape
  const scale = 1.3;
  const x = 0, y = 0;
  
  shape.moveTo(x, y);
  shape.bezierCurveTo(x, y - 0.3 * scale, x - 0.6 * scale, y - 0.3 * scale, x - 0.6 * scale, y);
  shape.bezierCurveTo(x - 0.6 * scale, y + 0.3 * scale, x - 0.3 * scale, y + 0.6 * scale, x, y + 1 * scale);
  shape.bezierCurveTo(x + 0.3 * scale, y + 0.6 * scale, x + 0.6 * scale, y + 0.3 * scale, x + 0.6 * scale, y);
  shape.bezierCurveTo(x + 0.6 * scale, y - 0.3 * scale, x, y - 0.3 * scale, x, y);
  
  const extrudeSettings = {
    depth: 0.3,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 2,
    bevelSize: 0.1,
    bevelThickness: 0.1
  };
  
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

function createDarknessGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  
  // Create a crescent moon/shadow shape
  const scale = 1.5;
  const outerRadius = 1 * scale;
  const innerRadius = 0.7 * scale;
  const offsetX = 0.3 * scale;
  
  // Outer circle
  for (let i = 0; i <= 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const x = Math.cos(angle) * outerRadius;
    const y = Math.sin(angle) * outerRadius;
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  
  // Inner circle (hole) to create crescent
  const hole = new THREE.Path();
  for (let i = 0; i <= 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const x = Math.cos(angle) * innerRadius + offsetX;
    const y = Math.sin(angle) * innerRadius;
    if (i === 0) {
      hole.moveTo(x, y);
    } else {
      hole.lineTo(x, y);
    }
  }
  shape.holes.push(hole);
  
  const extrudeSettings = {
    depth: 0.2,
    bevelEnabled: true,
    bevelSegments: 6,
    steps: 2,
    bevelSize: 0.05,
    bevelThickness: 0.05
  };
  
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

function getElementGeometry(elementId: string): THREE.BufferGeometry {
  switch (elementId) {
    case 'HEART': return createHeartGeometry();
    case 'WATER': return createWaterDropletGeometry();
    case 'LIGHTNING': return createLightningBoltGeometry();
    case 'DARKNESS': return createDarknessGeometry();
    default: return new THREE.SphereGeometry(2, 64, 64);
  }
}

export function PlanetSystemV2() {
  const [zoomLevel, setZoomLevel] = useState(1);

  return (
    <PlanetPositionsProvider>
      <div className="relative w-full h-[500px]">
        {/* Zoom controls */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2))}
            className="rounded-xl bg-black/60 px-3 py-1 text-xs text-white backdrop-blur hover:bg-black/70 transition-colors"
          >
            Zoom In
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.4))}
            className="rounded-xl bg-black/60 px-3 py-1 text-xs text-white backdrop-blur hover:bg-black/70 transition-colors"
          >
            Zoom Out
          </button>
        </div>

        <ThreeJSScene zoomLevel={zoomLevel} />
      </div>

      <div className="mt-3">
        <PlanetMinimapV2 />
      </div>
    </PlanetPositionsProvider>
  );
}