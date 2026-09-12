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
  addSpinRotation: (deltaDegrees: number) => void; // Add rotation from outside a drag (e.g. a flip)
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
  // The element/pointerId a drag captured, so a window-level safety net (see
  // the pointerup/pointercancel effect below) can release capture and finish
  // the interaction even if this element's own onPointerUp never fires (e.g.
  // the button was released outside the window, or the element re-rendered
  // mid-drag). Without this, isCapturingRef can get stuck `true` forever,
  // and every *future* onPointerMove — including plain hover, since it's
  // gated only on isCapturingRef — keeps computing a rotation from that
  // stale drag, making the card look like it's tilting just from the cursor
  // moving over it with no button pressed.
  const capturedElRef = useRef<HTMLElement | null>(null);
  const capturedPointerIdRef = useRef<number | null>(null);

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
    capturedElRef.current = target;
    capturedPointerIdRef.current = e.pointerId;
    isCapturingRef.current = true;
    wasDraggedRef.current = false; // Reset drag flag for new interaction
    lastXRef.current = e.clientX; // Track initial X for spin mode

    startPosRef.current = { x: e.clientX, y: e.clientY };

    setTiltState(prev => ({
      ...prev,
      isInteracting: true,
    }));
  }, [disabled]);

  // Shared "end the drag" logic, usable from this element's own
  // pointerup/cancel handlers, the window-level safety net, and
  // onPointerMove's own no-buttons-pressed guard below — they differ only in
  // how (or whether) they can call releasePointerCapture on the original
  // target.
  const finishInteraction = useCallback(() => {
    if (!isCapturingRef.current) return;

    // A pointermove just before release schedules applyTransform's rAF for
    // the *next* frame. Without cancelling it here, that stale callback can
    // fire right after this function's own reset-to-zero setState and
    // silently overwrite it back to the mid-drag tilt — the card then
    // stays visibly tilted forever, even though the drag has ended.
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // If it was a tap (not a drag), trigger onTap callback
    if (!wasDraggedRef.current && onTap) {
      onTap();
    }

    isCapturingRef.current = false;
    startPosRef.current = null;
    capturedElRef.current = null;
    capturedPointerIdRef.current = null;

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

  // Handle pointer move - update tilt or spin
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (disabled || !isCapturingRef.current || !startPosRef.current) return;
    // Belt-and-suspenders: a genuine drag always reports the primary button
    // held (e.buttons bit 1). If isCapturingRef ever desyncs from reality
    // (see the window-level safety net below for how), this alone still
    // stops a plain hover — no buttons pressed — from being treated as a
    // drag and rotating the card.
    if (e.buttons === 0) {
      finishInteraction();
      return;
    }

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
  }, [disabled, sensitivity, maxRotateX, maxRotateY, enableSpin, spinSensitivity, onRotationChange, clamp, applyTransform, finishInteraction]);

  // Handle pointer up/cancel - release and animate back
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isCapturingRef.current) return;
    const target = e.currentTarget as HTMLElement;
    try { target.releasePointerCapture(e.pointerId); } catch {}
    finishInteraction();
  }, [finishInteraction]);

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    onPointerUp(e);
  }, [onPointerUp]);

  // Safety net: if the pointer is released (or the gesture is cancelled)
  // anywhere in the window — not just over this element — while a drag is
  // still marked as capturing, force it to finish. Normally the element's
  // own onPointerUp/onPointerCancel handles this, but pointer capture can be
  // lost without either firing on this element (releasing outside the
  // window, the OS intercepting the gesture, the element unmounting mid-drag
  // from a re-render, etc.), which would otherwise leave isCapturingRef
  // stuck `true` and make every later onPointerMove — including plain
  // hover — keep computing a rotation as if still dragging.
  useEffect(() => {
    const onWindowPointerUp = (e: PointerEvent) => {
      if (!isCapturingRef.current) return;
      if (capturedPointerIdRef.current !== null && e.pointerId !== capturedPointerIdRef.current) return;
      try { capturedElRef.current?.releasePointerCapture(e.pointerId); } catch {}
      finishInteraction();
    };
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
    return () => {
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    };
  }, [finishInteraction]);

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

  // Lets a caller add to the spin rotation from outside a drag gesture (e.g.
  // a tap-to-flip that adds 180deg). Without this, spinRotationRef stays at
  // whatever the last drag left it at, so the *next* drag computes its delta
  // from that stale baseline instead of the rotation the card is actually
  // showing post-flip — the card visibly snaps back toward the pre-flip
  // angle the instant you start dragging again.
  const addSpinRotation = useCallback((delta: number) => {
    const newRotation = spinRotationRef.current + delta;
    spinRotationRef.current = newRotation;
    setSpinRotation(newRotation);
    onRotationChange?.(newRotation);
  }, [onRotationChange]);

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
    addSpinRotation,
  };
}

export default useCardTiltSpin;
