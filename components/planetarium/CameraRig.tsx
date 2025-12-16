import * as THREE from 'three';
import { useRef } from 'react';

export interface CameraControls {
  theta: number;
  phi: number;
  radius: number;
}

export function useCameraControls(
  camera: THREE.PerspectiveCamera | null,
  zoomLevel: number,
  setZoomLevel: (value: number | ((prev: number) => number)) => void,
  canvasElement: HTMLCanvasElement | null
) {
  const controlsRef = useRef<CameraControls>({ theta: 0, phi: Math.PI * 0.3, radius: 35 });

  const setupControls = () => {
    if (!canvasElement) return () => {};

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
      event.preventDefault();
      
      // Slow scroll wheel zoom - smaller increments for smooth zooming
      const zoomSpeed = 0.05; // Small increment for gradual zoom
      const deltaY = event.deltaY;
      
      if (deltaY > 0) {
        // Zoom out
        const newZoom = Math.max(zoomLevel - zoomSpeed, 0.4);
        setZoomLevel(newZoom);
      } else {
        // Zoom in  
        const newZoom = Math.min(zoomLevel + zoomSpeed, 2);
        setZoomLevel(newZoom);
      }
    };

    canvasElement.addEventListener('mousedown', onMouseDown);
    canvasElement.addEventListener('mouseup', onMouseUp);
    canvasElement.addEventListener('mousemove', onMouseMove);
    canvasElement.addEventListener('wheel', onWheel);

    return () => {
      canvasElement.removeEventListener('mousedown', onMouseDown);
      canvasElement.removeEventListener('mouseup', onMouseUp);
      canvasElement.removeEventListener('mousemove', onMouseMove);
      canvasElement.removeEventListener('wheel', onWheel);
    };
  };

  const updateCameraPosition = () => {
    if (!camera) return;

    // Apply zoom directly from state
    const effectiveZoom = zoomLevel;
    
    // Update camera position using spherical coordinates
    const baseRadius = controlsRef.current.radius; // Use the current radius from mouse wheel/controls
    const effectiveRadius = baseRadius / effectiveZoom; // Apply zoom directly
    const x = effectiveRadius * Math.sin(controlsRef.current.phi) * Math.cos(controlsRef.current.theta);
    const y = effectiveRadius * Math.cos(controlsRef.current.phi);
    const z = effectiveRadius * Math.sin(controlsRef.current.phi) * Math.sin(controlsRef.current.theta);
    
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  };

  return {
    setupControls,
    updateCameraPosition,
    controlsRef
  };
}