"use client";

import React from "react";

type ButtonVariant = "join-us" | "stars" | "welcome-home" | "custom";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: React.ReactNode;
  onHoverSound?: () => void;
};

export default function SharedButton({ 
  variant = "join-us", 
  children, 
  onClick, 
  onMouseEnter,
  onHoverSound,
  className,
  ...rest 
}: Props) {
  const getVariantClass = (variant: ButtonVariant): string => {
    switch (variant) {
      case "join-us":
        return "join-us-neon";
      case "stars":
        return "stars-neon";
      case "welcome-home":
        return "welcome-home-neon";
      case "custom":
        return "";
      default:
        return "join-us-neon";
    }
  };

  const handleMouseEnter: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    // Call the hover sound function if provided
    if (onHoverSound) {
      try {
        onHoverSound();
      } catch {}
    }
    
    // Call the original onMouseEnter if provided
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  };

  const baseClass = getVariantClass(variant);
  const combinedClassName = className ? `${baseClass} ${className}` : baseClass;

  return (
    <button
      type="button"
      className={combinedClassName}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      {...rest}
    >
      {children}
    </button>
  );
}