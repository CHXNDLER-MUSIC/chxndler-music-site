"use client";

import { useState } from "react";
import JoinUsPopup from "@/components/JoinUsPopup";
import SharedButton from "@/components/SharedButton";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onBeamColorChange?: (color: 'blue' | 'yellow' | 'pink' | 'off') => void;
};

export default function JoinUsButton({ asChild = false, children, onClick, onHoverSound, onBeamColorChange, ...rest }: Props) {
  const [open, setOpen] = useState(false);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    try { onClick?.(e); } catch {}
    if (!e.defaultPrevented) {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <>
      <SharedButton 
        variant="join-us" 
        onClick={handleClick} 
        onHoverSound={onHoverSound}
        {...rest}
      >
        {children}
      </SharedButton>
      <JoinUsPopup isOpen={open} onClose={() => {
        setOpen(false);
        // Open the blue display when the popup closes
        try { onBeamColorChange?.('blue'); } catch {}
      }} />
    </>
  );
}

