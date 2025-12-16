'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface VanillaThreeSceneProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

export default function VanillaThreeScene({ 
  zoomLevel, 
  initialActivePlanet, 
  onPlanetSelect, 
  worldId 
}: VanillaThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mountRef.current) return;

    console.log('VanillaThreeScene: Initializing Three.js scene');

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let sphere: THREE.Mesh;
    let animationId: number;

    try {
      // Scene setup
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);

      // Camera setup
      camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 5);

      // Renderer setup
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Create a simple sphere
      const geometry = new THREE.SphereGeometry(1, 32, 32);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0xff6600,
        metalness: 0.3,
        roughness: 0.7 
      });
      sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 5);
      scene.add(directionalLight);

      // Add to DOM
      mountRef.current.appendChild(renderer.domElement);

      // Animation loop
      const animate = () => {
        animationId = requestAnimationFrame(animate);

        // Rotate sphere
        sphere.rotation.y += 0.01;
        sphere.rotation.x += 0.005;

        renderer.render(scene, camera);
      };

      animate();
      console.log('VanillaThreeScene: Successfully initialized');

    } catch (err) {
      console.error('VanillaThreeScene: Error initializing Three.js:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize WebGL');
    }

    // Cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (renderer) {
        renderer.dispose();
        if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
      }
      if (scene) {
        // Clean up scene resources
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
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="w-full h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Mounting Three.js Scene...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[500px] bg-red-900 rounded flex items-center justify-center text-white p-4">
        <div className="text-center">
          <h3 className="font-bold mb-2">WebGL Error</h3>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-2 text-gray-300">Your browser may not support WebGL or it's disabled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] relative">
      <div className="absolute top-0 left-0 z-10 bg-blue-500 text-white p-2 text-sm">
        Vanilla Three.js - Orange sphere should be rotating
      </div>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}