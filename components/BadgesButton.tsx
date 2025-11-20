"use client";

import { useState, useEffect } from "react";
import { sfx } from "@/lib/sfx";
import BadgesModal from "@/components/BadgesModal";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
  onBeamColorChange?: (color: string) => void;
};

export default function BadgesButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, onBeamColorChange, ...rest }: Props) {
  const [open, setOpen] = useState(false);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    try { onClick?.(e); } catch {}
    if (!e.defaultPrevented) {
      e.preventDefault();
      try { sfx.play('click', 0.8); } catch {}
      // Trigger yellow light beam
      try { onBeamColorChange?.('yellow'); } catch {}
      // Close blue display first
      try { onCloseBlueDisplay?.(); } catch {}
      setOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick} 
        onMouseEnter={onHoverSound}
        className="p-1 rounded-lg transition-all duration-200 w-18 h-14"
        style={{
          transition: 'all 0.3s ease',
          ...rest.style
        }}
        onMouseEnter={(e) => {
          if (onHoverSound) onHoverSound();
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        {...rest}
      >
        <img
          src="/elements/badges.png"
          alt="Badges"
          className="w-full h-full object-contain rounded"
          style={{
          }}
          draggable={false}
        />
      </button>
      
      <BadgesModal 
        open={open} 
        onClose={() => {
          try { sfx.play('close', 0.8); } catch {}
          setOpen(false);
          try { onOpenBlueDisplay?.(); } catch {}
        }} 
      />
    </>
  );
}