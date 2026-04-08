"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  ariaLabel?: string;
};

export default function SharedModal({ open, onClose, title, children, ariaLabel }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("keydown", onKey);
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed z-[100000] flex justify-center"
      aria-modal="true"
      role="dialog"
      aria-label={ariaLabel || title}
      style={{ 
        top: '10px',
        left: '0',
        right: '0',
        bottom: '0'
      }}
    >
      <div
        className="absolute inset-0 bg-black/90"
        onClick={onClose}
      />
      <div
        className="mx-4 max-w-lg w-full"
        style={{
          position: 'absolute',
          top: '5px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100001,
          willChange: 'transform',
        }}
      >
        <div className="relative rounded-2xl p-4 border-2 border-[#FC54AF]/60 bg-[rgba(10,10,15,0.95)] shadow-[0_0_26px_rgba(56,182,255,0.35)]">
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow:
                "0 0 30px rgba(252,84,175,0.4), inset 0 0 16px rgba(252,84,175,0.15)",
            }}
          />

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 border border-white/20 hover:bg-white/15"
          >
            ×
          </button>

          <h2 className="relative text-xl font-bold tracking-wider text-white drop-shadow mb-1">
            {title}
          </h2>
          
          <div className="relative">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
