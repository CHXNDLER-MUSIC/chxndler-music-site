"use client";

import { useState } from "react";
import JoinUsPopup from "@/components/JoinUsPopup";
import SharedButton from "@/components/SharedButton";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
};

export default function JoinUsButton({ asChild = false, children, onClick, onHoverSound, ...rest }: Props) {
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
      <JoinUsPopup isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

