"use client";

import React from "react";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/sfx";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function HeartverseCardModal({ open, onClose }: Props) {
  function handleGetCard() {
    try { sfx.play("click", 0.6); } catch {}
    onClose();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("openChxndlerCardDirect"));
    }, 200);
  }

  function handleClose() {
    try { sfx.play("click", 0.5); } catch {}
    onClose();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {open && (
        <>
          {/* Hologram base glow */}
          <div
            className="fixed flex justify-center"
            style={{
              zIndex: 2147483648,
              pointerEvents: "none",
              left: 0,
              right: 0,
              top: "var(--profile-bar-boundary, 64px)",
              bottom: "calc(var(--light-beam-boundary, 120px) + var(--beam-height, 0px))",
              alignItems: "flex-start",
              paddingTop: "200px",
            }}
          >
            <div
              style={{
                width: "min(120vw, 700px)",
                height: "200px",
                background:
                  "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(255,105,180,0.7) 0%, rgba(255,105,180,0.4) 30%, rgba(255,105,180,0.1) 60%, transparent 100%)",
                filter: "blur(100px)",
              }}
            />
          </div>

          {/* Modal container */}
          <div
            className="fixed flex justify-center pointer-events-none"
            style={{
              zIndex: 2147483648,
              left: 0,
              right: 0,
              top: "var(--profile-bar-boundary, 64px)",
              bottom: "calc(var(--light-beam-boundary, 120px) + var(--beam-height, 0px))",
              alignItems: "flex-start",
            }}
          >
            <div
              className="pointer-events-auto"
              style={{
                width: "min(92vw, 700px)",
                height: "100%",
                padding: "18px 14px",
                borderRadius: 18,
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,105,180,0.55)",
                boxShadow:
                  "0 -8px 25px rgba(255,105,180,0.4), 0 -4px 15px rgba(255,105,180,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,105,180,0.45)",
                backdropFilter: "blur(12px) saturate(140%)",
                color: "#FF69B4",
                position: "relative",
              }}
            >
              {/* Bottom glow */}
              <div
                className="absolute"
                style={{
                  bottom: "-15px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "120%",
                  height: "30px",
                  background:
                    "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,105,180,0.6) 0%, rgba(255,105,180,0.3) 40%, transparent 80%)",
                  filter: "blur(30px)",
                  pointerEvents: "none",
                  zIndex: -1,
                }}
              />

              {/* Top glow */}
              <div
                className="absolute"
                style={{
                  top: "-10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "80%",
                  height: "20px",
                  background:
                    "radial-gradient(ellipse 70% 100% at 50% 100%, rgba(255,105,180,0.4) 0%, rgba(255,105,180,0.2) 50%, transparent 100%)",
                  filter: "blur(25px)",
                  pointerEvents: "none",
                  zIndex: -1,
                }}
              />

              {/* Close button */}
              <button
                onClick={handleClose}
                onMouseEnter={() => { try { sfx.play("hover", 0.35); } catch {} }}
                className="absolute top-2 right-4 hover:scale-110 cursor-pointer w-8 h-8 rounded-full border flex items-center justify-center transition-transform duration-150"
                style={{
                  color: "#FF69B4",
                  borderColor: "rgba(255,105,180,0.8)",
                  boxShadow: "0 0 15px rgba(255,105,180,0.8), 0 0 25px rgba(255,105,180,0.5)",
                  background: "rgba(255,105,180,0.1)",
                  backdropFilter: "blur(2px)",
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>

              {/* Header */}
              <div
                className="text-center mb-1"
                style={{
                  color: "#FF69B4",
                  textShadow: "0 0 8px rgba(255,105,180,0.6)",
                  fontSize: "26px",
                  fontWeight: "bold",
                }}
              >
                CLAIM YOUR CHXNDLER CARD
              </div>

              {/* Divider */}
              <div
                className="w-full h-px mb-6"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)",
                  boxShadow: "0 0 4px rgba(255,105,180,0.6)",
                }}
              />

              {/* Body */}
              <div className="flex flex-col items-center space-y-8 px-2">
                <p
                  className="text-center text-xl leading-loose"
                  style={{
                    color: "#FF69B4",
                    textShadow: "0 0 8px rgba(255,105,180,0.6)",
                  }}
                >
                  I'm sending CHXNDLER cards to Aliens. One contains a{" "}
                  <span style={{ fontWeight: "bold", color: "#F2EF1D", textShadow: "0 0 6px rgba(242,239,29,0.6), 0 0 12px rgba(242,239,29,0.3)" }}>
                    hidden signal
                  </span>
                  .<br />Find it, and I'll write and produce a song just for you.
                </p>

                <button
                  onClick={handleGetCard}
                  onMouseEnter={() => { try { sfx.play("hover", 0.35); } catch {} }}
                  className="get-card-pulse w-full rounded-lg px-4 py-3 text-xl font-bold border"
                  style={{
                    background: "radial-gradient(100% 100% at 50% 20%, #F5F270, #F2EF1D)",
                    color: "#001014",
                    border: "1px solid rgba(255,255,255,0.24)",
                  }}
                >
                  SEND ME MY CARD 💌
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>,
    document.body
  );
}
