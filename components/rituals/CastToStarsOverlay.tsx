"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { ElementType } from "@/components/planetarium/Pure3DPlanets";

/**
 * CastToStarsOverlay
 *
 * A ritual animation that plays when a user submits their journal entry.
 * The animation sequence:
 * 1. Sigil ring appears at the button position, expands and fades
 * 2. Star "births" with a twinkle effect
 * 3. Star flies along a curved path to the glowing planet
 * 4. Particles trail behind the star
 * 5. Animation completes and overlay unmounts
 *
 * Total duration: ~1-1.2 seconds
 */

interface CastToStarsOverlayProps {
  /** Starting position (where the Cast button was) */
  startPosition: { x: number; y: number };
  /** Target position (glowing planet or fallback) */
  targetPosition: { x: number; y: number };
  /** Called when animation completes - triggers reward flow */
  onComplete: () => void;
  /** Current element for theming (optional) */
  element?: ElementType | null;
}

// Element color theming
const ELEMENT_COLORS: Record<string, { color: string; glow: string }> = {
  heart: { color: "#F91880", glow: "#FF69B4" },
  water: { color: "#38B6FF", glow: "#00BFFF" },
  lightning: { color: "#F2EF1D", glow: "#FFD700" },
  darkness: { color: "#FFFFFF", glow: "#E0E0E0" },
};

// Particle configuration
const PARTICLE_COUNT = 15;

interface Particle {
  id: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  delay: number;
}

export default function CastToStarsOverlay({
  startPosition,
  targetPosition,
  onComplete,
  element = "heart",
}: CastToStarsOverlayProps) {
  const [phase, setPhase] = useState<"ring" | "star" | "flight" | "done">("ring");
  const [showParticles, setShowParticles] = useState(false);
  const starControls = useAnimation();
  const isMountedRef = useRef(false);

  // Get element colors (fallback to heart)
  const colors = ELEMENT_COLORS[element || "heart"] || ELEMENT_COLORS.heart;

  // Pre-generate particles for consistent rendering
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      offsetX: (Math.random() - 0.5) * 30,
      offsetY: (Math.random() - 0.5) * 30,
      scale: 0.3 + Math.random() * 0.5,
      delay: Math.random() * 0.15,
    }));
  }, []);

  // Calculate curved path midpoint for bezier animation
  const midpoint = useMemo(() => {
    const dx = targetPosition.x - startPosition.x;
    const dy = targetPosition.y - startPosition.y;
    // Create a curved path by offsetting the midpoint perpendicular to the line
    const midX = startPosition.x + dx * 0.5;
    const midY = startPosition.y + dy * 0.5 - Math.abs(dy) * 0.3 - 50; // Curve upward
    return { x: midX, y: midY };
  }, [startPosition, targetPosition]);

  // Track mount state for React 18 Strict Mode compatibility
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Animation sequence controller
  useEffect(() => {
    let cancelled = false;

    // Helper to create cancellable delay
    const delay = (ms: number): Promise<void> =>
      new Promise((resolve) => {
        const id = setTimeout(() => {
          if (!cancelled && isMountedRef.current) {
            resolve();
          }
        }, ms);
        // Store timeout id for potential cleanup
        return id;
      });

    // Helper to wait for next frame (ensures DOM is ready)
    const waitForFrame = (): Promise<void> =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled && isMountedRef.current) {
              resolve();
            }
          });
        });
      });

    const runAnimation = async () => {
      try {
        // Wait for mount + frame before starting any animations
        await waitForFrame();
        if (cancelled || !isMountedRef.current) return;

        // Phase 1: Sigil ring (~200ms)
        await delay(200);
        if (cancelled || !isMountedRef.current) return;

        // Phase 2: Star birth pause (~120ms)
        setPhase("star");
        await delay(120);
        if (cancelled || !isMountedRef.current) return;

        // Phase 3: Flight to planet (~400ms)
        setPhase("flight");
        setShowParticles(true);

        // Guard controls.start() with mount check
        if (cancelled || !isMountedRef.current) return;

        // Animate star along curved path using keyframes
        await starControls.start({
          x: [startPosition.x, midpoint.x, targetPosition.x],
          y: [startPosition.y, midpoint.y, targetPosition.y],
          scale: [1, 1.2, 0.3],
          opacity: [1, 1, 0],
          transition: {
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1], // cubic-bezier for smooth curve
            times: [0, 0.5, 1],
          },
        });

        if (cancelled || !isMountedRef.current) return;

        // Small buffer before cleanup
        await delay(100);
        if (cancelled || !isMountedRef.current) return;

        // Phase 4: Done - trigger completion callback
        setPhase("done");
        onComplete();
      } catch (error) {
        // Silently handle animation interruption (e.g., unmount during animation)
        // This prevents unhandled promise rejections when controls.start() is cancelled
        if (!cancelled && isMountedRef.current) {
          // Only log if it's a genuine error, not a cancellation
          console.warn("CastToStarsOverlay animation interrupted:", error);
        }
      }
    };

    runAnimation();

    // Cleanup: mark as cancelled and stop any running animations
    return () => {
      cancelled = true;
      starControls.stop();
    };
  }, [startPosition, midpoint, targetPosition, starControls, onComplete]);

  // Don't render if animation is complete
  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 2147483640, // High but below modals (2147483647)
      }}
    >
      <AnimatePresence>
        {/* Phase 1: Sigil Ring - expands and fades at button position */}
        {phase === "ring" && (
          <motion.div
            key="sigil-ring"
            initial={{
              x: startPosition.x,
              y: startPosition.y,
              scale: 0.2,
              opacity: 0.8,
            }}
            animate={{
              scale: 1.5,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
            }}
            style={{
              position: "absolute",
              width: 60,
              height: 60,
              marginLeft: -30,
              marginTop: -30,
              borderRadius: "50%",
              border: `2px solid ${colors.color}`,
              boxShadow: `0 0 15px ${colors.glow}, 0 0 30px ${colors.glow}40`,
            }}
          />
        )}

        {/* Phase 2 & 3: Star - births with twinkle, then flies to target */}
        {(phase === "star" || phase === "flight") && (
          <motion.div
            key="star"
            animate={starControls}
            initial={{
              x: startPosition.x,
              y: startPosition.y,
              scale: 0.6,
              opacity: 1,
            }}
            style={{
              position: "absolute",
              width: 20,
              height: 20,
              marginLeft: -10,
              marginTop: -10,
            }}
          >
            {/* Star shape using CSS */}
            <motion.div
              initial={{ scale: 0.6, rotate: 0 }}
              animate={
                phase === "star"
                  ? { scale: [0.6, 1.0, 0.9], rotate: [0, 15, 0] }
                  : { rotate: 360 }
              }
              transition={
                phase === "star"
                  ? { duration: 0.12, times: [0, 0.6, 1] }
                  : { duration: 0.4, ease: "linear" }
              }
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
              }}
            >
              {/* 4-point star using pseudo-elements via multiple divs */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 4,
                  height: 20,
                  marginLeft: -2,
                  marginTop: -10,
                  background: `linear-gradient(180deg, transparent 0%, ${colors.color} 50%, transparent 100%)`,
                  borderRadius: 2,
                  boxShadow: `0 0 10px ${colors.glow}, 0 0 20px ${colors.glow}`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 20,
                  height: 4,
                  marginLeft: -10,
                  marginTop: -2,
                  background: `linear-gradient(90deg, transparent 0%, ${colors.color} 50%, transparent 100%)`,
                  borderRadius: 2,
                  boxShadow: `0 0 10px ${colors.glow}, 0 0 20px ${colors.glow}`,
                }}
              />
              {/* Diagonal rays for extra sparkle */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 3,
                  height: 14,
                  marginLeft: -1.5,
                  marginTop: -7,
                  background: `linear-gradient(180deg, transparent 0%, ${colors.color}90 50%, transparent 100%)`,
                  borderRadius: 1.5,
                  transform: "rotate(45deg)",
                  boxShadow: `0 0 8px ${colors.glow}`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 3,
                  height: 14,
                  marginLeft: -1.5,
                  marginTop: -7,
                  background: `linear-gradient(180deg, transparent 0%, ${colors.color}90 50%, transparent 100%)`,
                  borderRadius: 1.5,
                  transform: "rotate(-45deg)",
                  boxShadow: `0 0 8px ${colors.glow}`,
                }}
              />
              {/* Central glow orb */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 8,
                  height: 8,
                  marginLeft: -4,
                  marginTop: -4,
                  background: colors.color,
                  borderRadius: "50%",
                  boxShadow: `0 0 12px ${colors.glow}, 0 0 24px ${colors.glow}, 0 0 36px ${colors.glow}60`,
                }}
              />
            </motion.div>
          </motion.div>
        )}

        {/* Phase 3: Particles - trail behind the star during flight */}
        {showParticles &&
          particles.map((particle) => (
            <motion.div
              key={`particle-${particle.id}`}
              initial={{
                x: startPosition.x + particle.offsetX,
                y: startPosition.y + particle.offsetY,
                scale: particle.scale,
                opacity: 0.8,
              }}
              animate={{
                x: midpoint.x + particle.offsetX * 0.5,
                y: midpoint.y + particle.offsetY * 0.5,
                scale: 0,
                opacity: 0,
              }}
              transition={{
                duration: 0.3,
                delay: particle.delay,
                ease: "easeOut",
              }}
              style={{
                position: "absolute",
                width: 6,
                height: 6,
                marginLeft: -3,
                marginTop: -3,
                background: colors.color,
                borderRadius: "50%",
                boxShadow: `0 0 6px ${colors.glow}, 0 0 12px ${colors.glow}60`,
              }}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Helper: Get the screen position of the glowing planet
 *
 * Since planets are rendered in a Three.js canvas, we can't directly
 * query DOM elements. This helper provides fallback logic.
 *
 * Usage:
 * const targetPos = getGlowingPlanetPosition(element);
 */
export function getGlowingPlanetPosition(
  element: ElementType | null
): { x: number; y: number } {
  // Fallback: top-center of screen (where planets typically appear)
  const fallback = {
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 500,
    y: typeof window !== "undefined" ? window.innerHeight * 0.25 : 200,
  };

  if (typeof window === "undefined" || !element) {
    return fallback;
  }

  // Try to find a DOM element that might expose planet position
  // (This could be a data attribute on the canvas container or a marker element)
  const planetMarker = document.querySelector(
    `[data-planet-element="${element}"]`
  );

  if (planetMarker) {
    const rect = planetMarker.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  // Try to find the planetarium container and estimate position based on element
  const planetarium = document.querySelector('[class*="planetarium"]');
  if (planetarium) {
    const rect = planetarium.getBoundingClientRect();
    // Estimate planet positions within the planetarium view
    // These are rough approximations based on typical orbital layout
    const elementOffsets: Record<string, { xRatio: number; yRatio: number }> = {
      heart: { xRatio: 0.3, yRatio: 0.4 },
      water: { xRatio: 0.7, yRatio: 0.35 },
      lightning: { xRatio: 0.5, yRatio: 0.25 },
      darkness: { xRatio: 0.5, yRatio: 0.55 },
    };

    const offset = elementOffsets[element] || { xRatio: 0.5, yRatio: 0.35 };
    return {
      x: rect.left + rect.width * offset.xRatio,
      y: rect.top + rect.height * offset.yRatio,
    };
  }

  return fallback;
}
