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

    // Texture loader
    const textureLoader = new THREE.TextureLoader();

    // Create element as a sprite showing the full image with transparency and glow
    const createElementSprite = (texturePath: string, scale: number, position: [number, number, number], glowColor: number) => {
      const group = new THREE.Group();
      group.position.set(...position);

      // Main sprite
      const texture = textureLoader.load(texturePath);
      texture.colorSpace = THREE.SRGBColorSpace;

      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        sizeAttenuation: true
      });

      const sprite = new THREE.Sprite(material);
      sprite.scale.set(scale * 5, scale * 5, 1);
      group.add(sprite);

      // Glow effect - larger semi-transparent sprite behind
      const glowGeometry = new THREE.SphereGeometry(scale * 3, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      group.add(glowMesh);

      // Point light for additional glow
      const light = new THREE.PointLight(glowColor, 0.8, 20);
      group.add(light);

      return group;
    };

    // Central Sun - positioned higher up as sprite
    const sunY = 12;
    const sun = createElementSprite('/textures/center-planet.webp', 2.5, [0, sunY, 0]);
    scene.add(sun);

    // Orbiting planets evenly spaced (90 degrees apart) around the sun
    const orbitRadius = 18;
    const planets = [
      { id: 'heart', texture: '/textures/planet_heart.webp', pos: [orbitRadius, 0, 0] as [number, number, number], speed: 0.3 },           // 0°
      { id: 'water', texture: '/textures/planet_water.webp', pos: [0, 0, orbitRadius] as [number, number, number], speed: 0.3 },           // 90°
      { id: 'lightning', texture: '/textures/planet_lightning.webp', pos: [-orbitRadius, 0, 0] as [number, number, number], speed: 0.3 },  // 180°
      { id: 'darkness', texture: '/textures/planet_darkness.webp', pos: [0, 0, -orbitRadius] as [number, number, number], speed: 0.3 }     // 270°
    ];

    const orbitGroups: { group: THREE.Group; speed: number }[] = [];

    planets.forEach(p => {
      const group = new THREE.Group();
      // Position group at sun's location so planets orbit around the sun
      group.position.set(0, sunY, 0);
      // Create sprite showing full texture image
      const planet = createElementSprite(p.texture, 1.8, p.pos);
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
