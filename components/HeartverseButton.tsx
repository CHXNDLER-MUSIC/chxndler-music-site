"use client";

import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon?: React.ReactNode;
  variant?: "primary" | "welcome-home" | "stars" | "journey";
};

const HeartverseButton = React.forwardRef<HTMLButtonElement, Props>(({ 
  label, 
  icon, 
  variant = "primary", 
  onClick, 
  onMouseEnter,
  className,
  ...rest 
}, ref) => {
  const getVariantClass = () => {
    switch (variant) {
      case "welcome-home":
        return "welcome-home-neon";
      case "stars":
        return "stars-neon";
      case "journey":
        return "journey-neon";
      case "primary":
      default:
        return "join-us-neon";
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`${getVariantClass()} ${className || ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      {...rest}
    >
      {icon && <span className="button-icon">{icon}</span>}
      {label}
      
      <style jsx>{`
        .button-icon {
          margin-right: 0.5em;
          display: inline-flex;
          align-items: center;
        }
      `}</style>
    </button>
  );
});

HeartverseButton.displayName = "HeartverseButton";

export default HeartverseButton;