'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

export interface Pure3DPlanetsProps {
  songs: any[];
  songsByElement: Record<string, any[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  quality: 'low' | 'high';
}

export default function Pure3DPlanets({ quality, onPlanetSelect }: Pure3DPlanetsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 400;

    // Scene setup
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 20, 40);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: quality === 'high',
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(quality === 'high' ? Math.min(window.devicePixelRatio, 2) : 1);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 15;
    controls.maxDistance = 100;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.2);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-10, -10, -10);
    scene.add(directionalLight);

    // Create planet function
    const createPlanet = (color: number, emissive: number, size: number, position: [number, number, number]) => {
      const geometry = new THREE.SphereGeometry(size, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: 0.3,
        metalness: 0.2,
        roughness: 0.6
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      return mesh;
    };

    // Central Sun
    const sun = createPlanet(0xffaa00, 0xff6600, 4, [0, 0, 0]);
    scene.add(sun);

    // Orbiting planets with their orbit groups
    const planets = [
      { color: 0xff6b9d, emissive: 0xff1166, pos: [20, 0, 0] as [number, number, number], speed: 0.3, id: 'heart' },
      { color: 0x4fc3f7, emissive: 0x0099cc, pos: [0, 0, 20] as [number, number, number], speed: 0.25, id: 'water' },
      { color: 0xffeb3b, emissive: 0xffcc00, pos: [-20, 0, 0] as [number, number, number], speed: 0.35, id: 'lightning' },
      { color: 0x9c27b0, emissive: 0x660099, pos: [0, 0, -20] as [number, number, number], speed: 0.2, id: 'darkness' }
    ];

    const orbitGroups: { group: THREE.Group; speed: number }[] = [];

    planets.forEach(p => {
      const group = new THREE.Group();
      const planet = createPlanet(p.color, p.emissive, 2.5, p.pos);
      group.add(planet);
      scene.add(group);
      orbitGroups.push({ group, speed: p.speed });
    });

    // Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 200; i++) {
      const seed = i * 137.508;
      starPositions.push(
        Math.sin(seed) * 150,
        Math.cos(seed * 2.3) * 150,
        Math.sin(seed * 1.7) * 150
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (obj === sun) {
          onPlanetSelect?.('center');
        } else {
          // Check which planet was clicked
          orbitGroups.forEach((og, idx) => {
            if (og.group.children.includes(obj)) {
              onPlanetSelect?.(planets[idx].id);
            }
          });
        }
      }
    };

    container.addEventListener('click', handleClick);

    // Animation loop
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Rotate sun
      sun.rotation.y = elapsed * 0.5;

      // Orbit planets
      orbitGroups.forEach(og => {
        og.group.rotation.y = elapsed * og.speed;
      });

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isClient, quality, onPlanetSelect]);

  if (!isClient) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading 3D Planets...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
    />
  );
}
