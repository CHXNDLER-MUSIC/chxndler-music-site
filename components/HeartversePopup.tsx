"use client";

import { useEffect } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  headerContent?: React.ReactNode;
};

export default function HeartversePopup({ isOpen, onClose, title, children, icon, headerContent }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", onKey);
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-[9999] flex justify-center"
      aria-modal="true"
      role="dialog"
      aria-label={title}
      style={{ 
        top: '10px',
        left: '0',
        right: '0',
        bottom: '0'
      }}
    >
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />
      <div 
        className="mx-4 max-w-lg w-full"
        style={{
          position: 'absolute',
          top: '5px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000
        }}
      >
        <div className="relative rounded-2xl p-4 backdrop-blur-md border-2 border-[#FC54AF]/60 bg-white/5 shadow-[0_0_26px_rgba(56,182,255,0.35)]">
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow:
                "0 0 40px rgba(252,84,175,0.5), 0 0 80px rgba(252,84,175,0.3), inset 0 0 24px rgba(252,84,175,0.2)",
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

          <div className="relative text-xl font-bold tracking-wider text-white drop-shadow mb-1">
            {icon && <span className="popup-icon">{icon}</span>}
            {title}
            {headerContent && <div className="header-content">{headerContent}</div>}
          </div>
          
          <div className="relative">
            {children}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .popup-icon {
          margin-right: 0.5em;
          display: inline-flex;
          align-items: center;
        }
        .header-content {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          font-weight: normal;
        }
      `}</style>
    </div>
  );
}