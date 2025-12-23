"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { ElementType } from "@/lib/planetConfig";

interface ElementOfDayData {
  element: ElementType;
  intention: string | null;
}

const ELEMENT_CONFIG: Record<ElementType, { name: string; color: string; icon: string }> = {
  heart: { name: "HEART", color: "#FC54AF", icon: "/elements/heart.webp" },
  water: { name: "WATER", color: "#38B6FF", icon: "/elements/water.webp" },
  lightning: { name: "LIGHTNING", color: "#F2EF1D", icon: "/elements/lightning.webp" },
  darkness: { name: "DARKNESS", color: "#FFFFFF", icon: "/elements/darkness.webp" },
};

export default function ElementOfDayModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<ElementOfDayData | null>(null);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  useEffect(() => {
    const handleShow = (e: CustomEvent<ElementOfDayData>) => {
      if (e.detail?.element) {
        setData(e.detail);
        setIsOpen(true);
      }
    };

    window.addEventListener("element-of-day:show" as any, handleShow);
    return () => {
      window.removeEventListener("element-of-day:show" as any, handleShow);
    };
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, handleClose]);

  if (!isOpen || !data) return null;
  if (typeof document === "undefined") return null;

  const config = ELEMENT_CONFIG[data.element];
  const elementColor = config?.color || "#FC54AF";

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        style={{ zIndex: 2147483647 }}
        onClick={handleClose}
      />

      {/* Hologram base glow */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 2147483648 }}
      >
        <div
          style={{
            width: "min(100vw, 500px)",
            height: "250px",
            background: `radial-gradient(ellipse 80% 100% at 50% 50%, ${elementColor}70 0%, ${elementColor}40 30%, ${elementColor}10 60%, transparent 100%)`,
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Modal Content */}
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ zIndex: 2147483648 }}
      >
        <div
          className="relative"
          style={{
            width: "min(90vw, 380px)",
            padding: "24px",
            borderRadius: 20,
            background: "rgba(0,0,0,0.75)",
            border: `2px solid ${elementColor}80`,
            boxShadow: `0 0 40px ${elementColor}50, 0 0 80px ${elementColor}30, inset 0 0 30px ${elementColor}15`,
            backdropFilter: "blur(16px) saturate(140%)",
          }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>

          {/* Header */}
          <div
            className="text-center mb-4"
            style={{
              color: elementColor,
              textShadow: `0 0 12px ${elementColor}80`,
              fontSize: "14px",
              fontWeight: "bold",
              letterSpacing: "0.15em",
            }}
          >
            ELEMENT OF THE DAY
          </div>

          {/* Decorative line */}
          <div
            className="w-full h-px mb-6"
            style={{
              background: `linear-gradient(90deg, transparent, ${elementColor}80 20%, ${elementColor} 50%, ${elementColor}80 80%, transparent)`,
              boxShadow: `0 0 8px ${elementColor}60`,
            }}
          />

          {/* Element Image */}
          <div className="flex justify-center mb-6">
            <div
              className="relative"
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: `radial-gradient(circle at 30% 30%, ${elementColor}30, transparent 70%)`,
                boxShadow: `0 0 40px ${elementColor}40, inset 0 0 20px ${elementColor}20`,
              }}
            >
              <img
                src={config?.icon}
                alt={config?.name}
                className="absolute inset-0 w-full h-full object-contain p-4"
                style={{
                  filter: `drop-shadow(0 0 12px ${elementColor})`,
                }}
              />
            </div>
          </div>

          {/* Element Name */}
          <div
            className="text-center mb-4"
            style={{
              color: elementColor,
              textShadow: `0 0 16px ${elementColor}90`,
              fontSize: "28px",
              fontWeight: "bold",
              letterSpacing: "0.1em",
            }}
          >
            {config?.name}
          </div>

          {/* Intention */}
          {data.intention && (
            <>
              <div
                className="text-center mb-2"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "11px",
                  fontWeight: "bold",
                  letterSpacing: "0.2em",
                }}
              >
                INTENTION
              </div>
              <div
                className="text-center px-4"
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "16px",
                  lineHeight: 1.6,
                  textShadow: "0 0 8px rgba(255,255,255,0.3)",
                }}
              >
                {data.intention}
              </div>
            </>
          )}

          {/* Continue button */}
          <button
            onClick={handleClose}
            className="w-full mt-6 py-3 rounded-lg font-medium transition-all"
            style={{
              background: `${elementColor}20`,
              border: `1px solid ${elementColor}60`,
              color: elementColor,
              textShadow: `0 0 8px ${elementColor}80`,
              boxShadow: `0 0 15px ${elementColor}30`,
            }}
          >
            CONTINUE
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
