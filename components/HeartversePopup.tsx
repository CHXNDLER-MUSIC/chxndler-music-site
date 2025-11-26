"use client";

import { useEffect } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  headerContent?: React.ReactNode;
  positioning?: 'default' | 'higher' | 'top-left';
};

export default function HeartversePopup({ isOpen, onClose, title, children, icon, headerContent, positioning = 'default' }: Props) {
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
      className="fixed inset-0 z-[9999] modal-no-drag"
      aria-modal="true"
      role="dialog"
      aria-label={title}
      style={{ touchAction: 'none', overscrollBehaviorX: 'none' }}
    >
      <div
        className="absolute inset-0 backdrop-blur-md"
        onClick={onClose}
      />
      <div 
        className={positioning === 'top-left' ? 'absolute z-[10000] max-w-md' : 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mx-4 max-w-lg w-full z-[10000]'}
        style={{
          ...((positioning === 'top-left') ? {top: '100px', left: '50px', backgroundColor: 'red'} : {marginTop: positioning === 'higher' ? '-25vh' : '0'}),
          touchAction: 'none',
          overscrollBehaviorX: 'none',
          userSelect: 'none'
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
            className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg font-bold transition-all duration-200 hover:scale-110 pink-neon-close"
          >
            ×
          </button>

          <h2 className="relative text-xl font-bold tracking-wider text-white drop-shadow mb-1">
            {icon && <span className="popup-icon">{icon}</span>}
            {title}
            {headerContent && <div className="header-content">{headerContent}</div>}
          </h2>
          
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
        .pink-neon-close {
          background: transparent;
          color: #FF1493;
          border-color: #FF1493;
          text-shadow: 
            0 0 5px #FF1493,
            0 0 10px #FF1493,
            0 0 15px #FF1493;
          box-shadow: 
            0 0 10px rgba(255, 20, 147, 0.5),
            0 0 20px rgba(255, 20, 147, 0.3),
            inset 0 0 10px rgba(255, 20, 147, 0.1);
        }
        .pink-neon-close:hover {
          color: #FF69B4;
          border-color: #FF69B4;
          text-shadow: 
            0 0 8px #FF69B4,
            0 0 15px #FF69B4,
            0 0 25px #FF69B4,
            0 0 35px #FF69B4;
          box-shadow: 
            0 0 15px rgba(255, 105, 180, 0.7),
            0 0 30px rgba(255, 105, 180, 0.5),
            0 0 45px rgba(255, 105, 180, 0.3),
            inset 0 0 15px rgba(255, 105, 180, 0.2);
        }
      `}</style>
    </div>
  );
}