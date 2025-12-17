"use client";

import { useRef, useCallback, useEffect, useState } from "react";

interface TiltState {
  rotateX: number;
  rotateY: number;
  isInteracting: boolean;
  isFlipping: boolean;
  flipDirection: 'left' | 'right' | null;
}

interface UseCardTiltSpinOptions {
  disabled?: boolean;
  maxRotateX?: number;
  maxRotateY?: number;
  sensitivity?: number;
  returnDuration?: number;
  enableSpin?: boolean; // Enable full 360 spin mode
  spinSensitivity?: number; // How fast the card spins when dragging
  onRotationChange?: (rotation: number) => void; // Callback with current rotation
  onTap?: () => void; // Callback when user taps (not drags)
}

interface UseCardTiltSpinReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  style: React.CSSProperties;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
  tiltState: TiltState;
  resetTilt: () => void;
  wasDragged: () => boolean;
  spinRotation: number; // Current spin rotation in degrees
}

export function useCardTiltSpin(options: UseCardTiltSpinOptions = {}): UseCardTiltSpinReturn {
  const {
    disabled = false,
    maxRotateX = 10,
    maxRotateY = 18,
    sensitivity = 0.3,
    returnDuration = 400,
    enableSpin = false,
    spinSensitivity = 0.5,
    onRotationChange,
    onTap,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const currentTiltRef = useRef<{ rotateX: number; rotateY: number }>({ rotateX: 0, rotateY: 0 });
  const isCapturingRef = useRef(false);
  const wasDraggedRef = useRef(false); // Track if user dragged (to prevent click after drag)
  const dragThreshold = 15; // Minimum pixels to consider it a drag vs click (increased for touch reliability)
  const lastXRef = useRef(0); // Track last X position for spin mode
  const spinRotationRef = useRef(0); // Current spin rotation

  const [spinRotation, setSpinRotation] = useState(0);

  const [tiltState, setTiltState] = useState<TiltState>({
    rotateX: 0,
    rotateY: 0,
    isInteracting: false,
    isFlipping: false,
    flipDirection: null,
  });

  // Clamp value between min and max
  const clamp = useCallback((value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  }, []);

  // Apply transform using RAF for smooth updates
  const applyTransform = useCallback((rotateX: number, rotateY: number, transition: boolean) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      currentTiltRef.current = { rotateX, rotateY };
      setTiltState(prev => ({
        ...prev,
        rotateX,
        rotateY,
      }));
    });
  }, []);

  // Reset tilt to center
  const resetTilt = useCallback(() => {
    setTiltState({
      rotateX: 0,
      rotateY: 0,
      isInteracting: false,
      isFlipping: false,
      flipDirection: null,
    });
    currentTiltRef.current = { rotateX: 0, rotateY: 0 };
  }, []);

  // Handle pointer down - start tracking
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;

    // Only handle primary button (left click / touch)
    if (e.button !== 0) return;

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    isCapturingRef.current = true;
    wasDraggedRef.current = false; // Reset drag flag for new interaction
    lastXRef.current = e.clientX; // Track initial X for spin mode

    startPosRef.current = { x: e.clientX, y: e.clientY };

    setTiltState(prev => ({
      ...prev,
      isInteracting: true,
    }));
  }, [disabled]);

  // Handle pointer move - update tilt or spin
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (disabled || !isCapturingRef.current || !startPosRef.current) return;

    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;

    // Mark as dragged if moved past threshold
    if (!wasDraggedRef.current && (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)) {
      wasDraggedRef.current = true;
    }

    if (enableSpin) {
      // Spin mode: continuous rotation based on drag
      const movementX = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;

      const newRotation = spinRotationRef.current + (movementX * spinSensitivity);
      spinRotationRef.current = newRotation;
      setSpinRotation(newRotation);
      onRotationChange?.(newRotation);

      // Also apply slight vertical tilt
      const newRotateX = clamp(-deltaY * sensitivity * 0.3, -maxRotateX, maxRotateX);
      applyTransform(newRotateX, 0, false);
    } else {
      // Normal tilt mode
      const newRotateY = clamp(deltaX * sensitivity, -maxRotateY, maxRotateY);
      const newRotateX = clamp(-deltaY * sensitivity, -maxRotateX, maxRotateX);
      applyTransform(newRotateX, newRotateY, false);
    }
  }, [disabled, sensitivity, maxRotateX, maxRotateY, enableSpin, spinSensitivity, onRotationChange, clamp, applyTransform]);

  // Handle pointer up/cancel - release and animate back
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isCapturingRef.current) return;

    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);

    // If it was a tap (not a drag), trigger onTap callback
    if (!wasDraggedRef.current && onTap) {
      onTap();
    }

    isCapturingRef.current = false;
    startPosRef.current = null;

    // Animate back to center (but preserve flip state if flipping)
    setTiltState(prev => ({
      rotateX: 0,
      rotateY: 0,
      isInteracting: false,
      isFlipping: prev.isFlipping,
      flipDirection: prev.flipDirection,
    }));
    currentTiltRef.current = { rotateX: 0, rotateY: 0 };
  }, [onTap]);

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    onPointerUp(e);
  }, [onPointerUp]);

  const onPointerLeave = useCallback((e: React.PointerEvent) => {
    // Only reset if we're not capturing (pointer might leave during drag with capture)
    if (!isCapturingRef.current) {
      setTiltState(prev => {
        if (prev.isFlipping) return prev; // Don't interrupt flip animation
        if (prev.rotateX !== 0 || prev.rotateY !== 0) {
          return { ...prev, rotateX: 0, rotateY: 0, isInteracting: false };
        }
        return prev;
      });
    }
  }, []);

  // Keyboard accessibility
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    const nudgeAmount = 3;
    let newRotateX = currentTiltRef.current.rotateX;
    let newRotateY = currentTiltRef.current.rotateY;

    switch (e.key) {
      case "ArrowLeft":
        newRotateY = clamp(newRotateY - nudgeAmount, -maxRotateY, maxRotateY);
        e.preventDefault();
        break;
      case "ArrowRight":
        newRotateY = clamp(newRotateY + nudgeAmount, -maxRotateY, maxRotateY);
        e.preventDefault();
        break;
      case "ArrowUp":
        newRotateX = clamp(newRotateX + nudgeAmount, -maxRotateX, maxRotateX);
        e.preventDefault();
        break;
      case "ArrowDown":
        newRotateX = clamp(newRotateX - nudgeAmount, -maxRotateX, maxRotateX);
        e.preventDefault();
        break;
      case "Escape":
        resetTilt();
        e.preventDefault();
        return;
      default:
        return;
    }

    setTiltState(prev => ({
      ...prev,
      rotateX: newRotateX,
      rotateY: newRotateY,
      isInteracting: true,
    }));
    currentTiltRef.current = { rotateX: newRotateX, rotateY: newRotateY };
  }, [disabled, maxRotateX, maxRotateY, clamp, resetTilt]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Generate style object
  const getTransform = () => {
    if (enableSpin) {
      // In spin mode, only apply perspective and vertical tilt (rotateX)
      // The Y rotation is handled by the child elements via onRotationChange
      return `perspective(1000px) rotateX(${tiltState.rotateX}deg)`;
    }
    return `perspective(1000px) rotateX(${tiltState.rotateX}deg) rotateY(${tiltState.rotateY}deg)`;
  };

  const style: React.CSSProperties = {
    transform: getTransform(),
    transition: tiltState.isInteracting ? "none" : `transform ${returnDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
    willChange: "transform",
    touchAction: disabled ? "auto" : "none",
    cursor: disabled ? "default" : "grab",
    userSelect: "none",
    transformStyle: "preserve-3d",
  };

  // Function to check if user dragged (vs simple click)
  const wasDragged = useCallback(() => wasDraggedRef.current, []);

  return {
    containerRef,
    style,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave,
      onKeyDown,
    },
    tiltState,
    resetTilt,
    wasDragged,
    spinRotation,
  };
}

export default useCardTiltSpin;
