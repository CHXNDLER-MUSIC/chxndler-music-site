'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { usePlanetPositions } from '../planet-positions-context';
import { centerPlanet, elementPlanets, songPlanets, SongPlanet } from '../planet-data';
import { generatePlanetMaterial, getShapeModifications } from '../planet-material-generator';
import { addDefaultLights } from './Lights';
import { getElementGlowColor, getElementLightColor } from './assets';
import { useCameraControls } from './CameraRig';

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

// Create particle system for atmospheric effects
function createParticleSystem(song: SongPlanet, planetMesh: THREE.Mesh, particleCount: number, scene: THREE.Scene) {
  const particles = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);

  const atmosphere = song.appearance?.atmosphere.toLowerCase() || '';
  
  // Set particle color based on atmosphere description
  let particleColor = new THREE.Color(0xffffff);
  if (atmosphere.includes('pink')) particleColor = new THREE.Color(0xff69b4);
  else if (atmosphere.includes('blue')) particleColor = new THREE.Color(0x4169e1);
  else if (atmosphere.includes('yellow') || atmosphere.includes('gold')) particleColor = new THREE.Color(0xffd700);
  else if (atmosphere.includes('violet') || atmosphere.includes('purple')) particleColor = new THREE.Color(0x9400d3);
  else if (atmosphere.includes('green')) particleColor = new THREE.Color(0x32cd32);
  else if (atmosphere.includes('orange')) particleColor = new THREE.Color(0xff8c00);
  else if (atmosphere.includes('red')) particleColor = new THREE.Color(0xff0000);
  else if (atmosphere.includes('teal') || atmosphere.includes('cyan')) particleColor = new THREE.Color(0x008b8b);

  for (let i = 0; i < particleCount; i++) {
    // Random positions around the planet
    const radius = 0.4 + Math.random() * 0.6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    // Particle colors with some variation
    colors[i * 3] = particleColor.r + (Math.random() - 0.5) * 0.2;
    colors[i * 3 + 1] = particleColor.g + (Math.random() - 0.5) * 0.2;
    colors[i * 3 + 2] = particleColor.b + (Math.random() - 0.5) * 0.2;

    // Particle velocities for movement
    velocities[i * 3] = (Math.random() - 0.5) * 0.02;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
  }

  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particleSystem = new THREE.Points(particles, particleMaterial);
  particleSystem.position.copy(planetMesh.position);
  scene.add(particleSystem);

  // Store reference for animation
  (planetMesh as any).particleSystem = particleSystem;
}

interface PlanetsProps {
  zoomLevel: number;
  setZoomLevel: (value: number | ((prev: number) => number)) => void;
}

export function Planets({ zoomLevel, setZoomLevel }: PlanetsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const planetsRef = useRef<Planet3D[]>([]);
  const animationRef = useRef<number>();
  const { updatePosition, activePlanetId } = usePlanetPositions();

  const { setupControls, updateCameraPosition } = useCameraControls(
    cameraRef.current,
    zoomLevel,
    setZoomLevel,
    rendererRef.current?.domElement || null
  );

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

    // Add lights
    addDefaultLights(scene);

    // Create texture loader
    const textureLoader = new THREE.TextureLoader();
    
    // Create planets
    const planets: Planet3D[] = [];

    // Center planet - heart shape with antennas using plane geometry to show texture properly
    const centerGeometry = new THREE.PlaneGeometry(7, 7);
    const centerTexture = textureLoader.load('/textures/center-planet.webp');
    centerTexture.colorSpace = THREE.SRGBColorSpace;
    const centerMaterial = new THREE.MeshStandardMaterial({ 
      map: centerTexture,
      transparent: true,
      alphaTest: 0.2,
      side: THREE.DoubleSide,
      emissive: 0xff1493,  // Bright pink emissive
      emissiveIntensity: 1.5, // Much brighter than elemental planets (1.0)
      roughness: 0.05, // Very smooth for maximum glow
      metalness: 0.0   // No metallic for pure glow
    });
    const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
    centerMesh.position.set(0, 0, 0);
    scene.add(centerMesh);

    // Add bright pink point light to center planet for maximum glow
    const centerLight = new THREE.PointLight(
      0xff1493, // Bright pink light
      2.5,      // Very high intensity (higher than elemental planets' 1.5)
      30,       // Large range to illuminate everything
      0.8       // Slower decay for wider illumination
    );
    centerLight.position.set(0, 0, 0);
    scene.add(centerLight);

    planets.push({
      mesh: centerMesh,
      id: centerPlanet.id,
      kind: 'center'
    });

    // Element planets - space them evenly around the center (90° apart) using sprite planes
    elementPlanets.forEach((planet, index) => {
      const geometry = new THREE.PlaneGeometry(4, 4);
      const texture = textureLoader.load(planet.texturePath);
      texture.colorSpace = THREE.SRGBColorSpace;
      
      const material = new THREE.MeshStandardMaterial({ 
        map: texture,
        transparent: true,
        alphaTest: 0.2,
        side: THREE.DoubleSide,
        emissive: getElementGlowColor(planet.elementId),
        emissiveIntensity: 1.0, // Maximum brightness for light emission
        roughness: 0.1, // Very smooth for maximum glow
        metalness: 0.0  // No metallic for pure glow effect
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Add bright point light for each elemental planet
      const pointLight = new THREE.PointLight(
        getElementLightColor(planet.elementId), 
        1.5, // High intensity
        20,  // Range of light
        1    // Decay rate
      );
      scene.add(pointLight);

      planets.push({
        mesh,
        id: planet.id,
        kind: 'element',
        orbitRadius: planet.orbitRadius,
        orbitSpeed: planet.orbitSpeed,
        startAngle: (index * Math.PI * 2) / elementPlanets.length // Evenly space around circle
      });

      // Store light reference for position updates
      planets.push({
        mesh: pointLight as any, // Store light as mesh for position updates
        id: `${planet.id}_light`,
        kind: 'element_light',
        orbitRadius: planet.orbitRadius,
        orbitSpeed: planet.orbitSpeed,
        startAngle: (index * Math.PI * 2) / elementPlanets.length
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
        // Generate material based on visual appearance
        let planetMaterial;
        let geometry;
        let materialData;
        
        if (song.appearance && song.released) {
          // Only use unique appearance for released songs
          materialData = generatePlanetMaterial(song.appearance, textureLoader, song.id);
          planetMaterial = materialData.material;
          
          // Get shape modifications
          const shapeData = getShapeModifications(song.appearance);
          
          if (shapeData.geometry.type === 'box') {
            geometry = new THREE.BoxGeometry(1, 1, 1, 8, 8, 8);
          } else {
            geometry = new THREE.SphereGeometry(1, shapeData.geometry.segments, shapeData.geometry.segments);
          }
          
          // Apply scale modifications
          geometry.scale(shapeData.scaleModification.x, shapeData.scaleModification.y, shapeData.scaleModification.z);
          
          // Apply advanced deformations for unique planet shapes
          if (shapeData.deformation !== 'none') {
            const positions = geometry.attributes.position;
            
            switch (shapeData.deformation) {
              case 'jagged':
                // Chaotic noise for jagged, angular planets
                for (let i = 0; i < positions.count; i++) {
                  const x = positions.getX(i);
                  const y = positions.getY(i);
                  const z = positions.getZ(i);
                  
                  const noise = (Math.random() - 0.5) * 0.3;
                  positions.setX(i, x + noise);
                  positions.setY(i, y + noise);
                  positions.setZ(i, z + noise);
                }
                break;
                
              case 'fragmented':
                // Break apart into chunks
                for (let i = 0; i < positions.count; i++) {
                  const x = positions.getX(i);
                  const y = positions.getY(i);
                  const z = positions.getZ(i);
                  
                  // Create separation between vertex clusters
                  const chunkNoise = Math.random() > 0.7 ? (Math.random() - 0.5) * 0.5 : 0;
                  positions.setX(i, x + chunkNoise);
                  positions.setY(i, y + chunkNoise);
                  positions.setZ(i, z + chunkNoise);
                }
                break;
                
              case 'cracked':
                // Create crack-like indentations
                for (let i = 0; i < positions.count; i++) {
                  const x = positions.getX(i);
                  const y = positions.getY(i);
                  const z = positions.getZ(i);
                  
                  const length = Math.sqrt(x*x + y*y + z*z);
                  const crack = Math.sin(x * 10) * Math.sin(y * 10) * Math.sin(z * 10) * 0.1;
                  const factor = (length + crack) / length;
                  
                  positions.setX(i, x * factor);
                  positions.setY(i, y * factor);
                  positions.setZ(i, z * factor);
                }
                break;
                
              case 'bumpy':
                // Add bumpy dance floor texture
                for (let i = 0; i < positions.count; i++) {
                  const x = positions.getX(i);
                  const y = positions.getY(i);
                  const z = positions.getZ(i);
                  
                  const bump = Math.sin(x * 8) * Math.cos(z * 8) * 0.1;
                  positions.setY(i, y + bump);
                }
                break;
                
              case 'hexagonal':
                // Create hexagonal faceting for honeycomb effect
                for (let i = 0; i < positions.count; i++) {
                  const x = positions.getX(i);
                  const y = positions.getY(i);
                  const z = positions.getZ(i);
                  
                  const angle = Math.atan2(z, x);
                  const hexAngle = Math.round(angle / (Math.PI / 3)) * (Math.PI / 3);
                  const radius = Math.sqrt(x*x + z*z);
                  
                  positions.setX(i, Math.cos(hexAngle) * radius);
                  positions.setZ(i, Math.sin(hexAngle) * radius);
                }
                break;
                
              case 'pixelated':
                // Quantize positions for 8-bit effect
                for (let i = 0; i < positions.count; i++) {
                  const x = positions.getX(i);
                  const y = positions.getY(i);
                  const z = positions.getZ(i);
                  
                  const quantize = (val: number) => Math.round(val * 4) / 4;
                  positions.setX(i, quantize(x));
                  positions.setY(i, quantize(y));
                  positions.setZ(i, quantize(z));
                }
                break;
            }
            
            positions.needsUpdate = true;
            geometry.computeVertexNormals();
          }
        } else {
          // Fallback for unreleased songs or songs without appearance data
          geometry = new THREE.SphereGeometry(1, 16, 16);
          planetMaterial = new THREE.MeshStandardMaterial({ 
            color: song.released ? 0x00ff88 : 0x666666,
            opacity: song.released ? 1 : 0.6,
            transparent: !song.released,
            roughness: 0.8,
            metalness: 0.1
          });
          
          // Create empty materialData for unreleased songs
          materialData = {
            material: planetMaterial,
            hasGlow: false,
            hasParticles: false
          };
        }
        
        const scale = 0.3;
        geometry.scale(scale, scale, scale);
        const mesh = new THREE.Mesh(geometry, planetMaterial);
        scene.add(mesh);

        // Create glow effect if needed (only for released songs)
        if (song.released && song.appearance && materialData.hasGlow && materialData.glowMaterial) {
          const glowGeometry = new THREE.SphereGeometry(scale * 1.1, 32, 32);
          const glowMesh = new THREE.Mesh(glowGeometry, materialData.glowMaterial);
          glowMesh.position.copy(mesh.position);
          scene.add(glowMesh);
          
          // Store reference for position updates
          planets.push({
            mesh: glowMesh,
            id: `${song.id}_glow`,
            kind: 'glow',
            orbitRadius: song.orbitRadius,
            orbitSpeed: song.orbitSpeed,
            elementId: song.elementId,
            released: song.released,
            startAngle: (index * Math.PI * 2) / songs.length
          });
        }

        // Particle systems removed per user request - no floating effects around song planets
        
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

    // Setup mouse controls
    const cleanupControls = setupControls();

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      
      // Update camera position
      updateCameraPosition();
      
      // Update planets
      planetsRef.current.forEach((planet) => {
        if (planet.kind === 'center') {
          // Center planet stays at origin and faces camera (billboard behavior)
          planet.mesh.lookAt(camera.position);
          updatePosition(planet.id, {
            x: 0, y: 0, z: 0,
            data: centerPlanet
          });
        } else if (planet.kind === 'element' && planet.orbitRadius && planet.orbitSpeed) {
          // Element planets orbit center with starting angle offset and always face camera
          const angle = (planet.startAngle || 0) + (time * planet.orbitSpeed);
          const x = Math.cos(angle) * planet.orbitRadius;
          const z = Math.sin(angle) * planet.orbitRadius;
          planet.mesh.position.set(x, 0, z);
          
          // Make sprite always face the camera (billboard behavior)
          planet.mesh.lookAt(camera.position);
          
          const elementData = elementPlanets.find(p => p.id === planet.id)!;
          updatePosition(planet.id, {
            x, y: 0, z,
            data: elementData
          });
          
        } else if (planet.kind === 'element_light' && planet.orbitRadius && planet.orbitSpeed) {
          // Element lights follow their planets
          const angle = (planet.startAngle || 0) + (time * planet.orbitSpeed);
          const x = Math.cos(angle) * planet.orbitRadius;
          const z = Math.sin(angle) * planet.orbitRadius;
          planet.mesh.position.set(x, 0, z);
          
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
        } else if (planet.kind === 'glow' && planet.elementId && planet.orbitRadius && planet.orbitSpeed) {
          // Glow effects follow their parent planet
          const parentPlanet = planetsRef.current.find(p => p.id === planet.id.replace('_glow', ''));
          if (parentPlanet) {
            planet.mesh.position.copy(parentPlanet.mesh.position);
            
            // Animate glow intensity
            const glowMaterial = planet.mesh.material as THREE.MeshBasicMaterial;
            glowMaterial.opacity = 0.2 + Math.sin(time * 2) * 0.1;
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
      cleanupControls();
      window.removeEventListener('resize', handleResize);
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update zoom when zoomLevel prop changes
  useEffect(() => {
    // This will trigger re-calculation in the animation loop
  }, [zoomLevel]);

  return <div ref={containerRef} className="w-full h-full" />;
}