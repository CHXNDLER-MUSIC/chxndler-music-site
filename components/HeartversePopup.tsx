"use client";

import { useEffect } from "react";
import { sfx } from "@/lib/sfx";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  headerContent?: React.ReactNode;
  positioning?: 'default' | 'higher' | 'top-left';
  onTitleClick?: () => void;
};

export default function HeartversePopup({ isOpen, onClose, title, children, icon, headerContent, positioning = 'default', onTitleClick }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", onKey);
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Prevent background/page scroll while popup is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscrollBehavior = (document.body.style as any).overscrollBehavior;
    document.body.style.overflow = 'hidden';
    (document.body.style as any).overscrollBehavior = 'contain';

    return () => {
      document.body.style.overflow = prevOverflow;
      (document.body.style as any).overscrollBehavior = prevOverscrollBehavior || '';
    };
  }, [isOpen]);

  if (!isOpen) return null;


  return (
    <div
      className="fixed inset-0 z-[2147483647] modal-no-drag"
      aria-modal="true"
      role="dialog"
      aria-label={title}
      style={{ overscrollBehaviorX: 'none' }}
      onWheel={(e) => { e.preventDefault(); }}
      onTouchMove={(e) => { e.preventDefault(); }}
    >
      <div
        className="absolute inset-0 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className={positioning === 'top-left' ? 'absolute z-[2147483648] max-w-md' : 'fixed flex justify-center z-[2147483648]'}
        style={{
          ...((positioning === 'top-left') ? {top: '100px', left: '50px', backgroundColor: 'red'} : {
            top: 'var(--profile-bar-boundary, 64px)',
            bottom: 'calc(var(--light-beam-boundary) + var(--beam-height))',
            left: 0,
            right: 0,
            alignItems: 'flex-start'
          }),
          overscrollBehaviorX: 'none'
        }}
      >
        <div className="relative rounded-2xl p-4 backdrop-blur-md border-2 border-[#FC54AF]/60 bg-white/5 shadow-[0_0_26px_rgba(56,182,255,0.35)] max-h-full max-w-lg w-full mx-4 overflow-hidden flex flex-col h-fit">
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
            onMouseEnter={() => {
              try { sfx.play('hover', 0.3); } catch {}
            }}
            className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg font-bold transition-all duration-200 hover:scale-110 pink-neon-close"
          >
            ×
          </button>

          <h2 className="relative text-xl font-bold tracking-wider text-white drop-shadow mb-1">
            {icon && <span className="popup-icon">{icon}</span>}
            {onTitleClick ? (
              <span
                className="cursor-pointer hover:text-[#FC54AF] transition-colors duration-200"
                onClick={onTitleClick}
              >
                {title}
              </span>
            ) : (
              title
            )}
            {headerContent && <div className="header-content">{headerContent}</div>}
          </h2>
          
          <div className="relative flex-1 min-h-0">
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
