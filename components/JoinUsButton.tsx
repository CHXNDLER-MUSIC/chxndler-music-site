"use client";

import { useState } from "react";
import LoginModal from "@/components/LoginModal";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export default function JoinUsButton({ asChild = false, children, onClick, ...rest }: Props) {
  const [open, setOpen] = useState(false);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    try { onClick?.(e); } catch {}
    if (!e.defaultPrevented) {
      e.preventDefault();
      setOpen(true);
    }
  };

  // We render a button to avoid navigation; styles come from parent via className
  return (
    <>
      <button type="button" onClick={handleClick} {...rest}>
        {children}
      </button>
      <LoginModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

