"use client";

import React from "react";
import { motion } from "framer-motion";

type GlowButtonProps = {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;               // if provided -> acts as link
  color?: string;              // tailwind text/outline color classes (optional)
  className?: string;
  onClick?: () => void;
};

export default function GlowButton({
  icon: Icon,
  label,
  href,
  color = "text-white",
  className = "",
  onClick,
}: GlowButtonProps) {
  // choose the correct motion element so props are valid
  const MotionTag: typeof motion.a | typeof motion.button = href ? motion.a : motion.button;

  return (
    <MotionTag
      href={href}
      onClick={onClick}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 22, mass: 0.4 }}
      className={[
        "relative rounded-xl px-3 py-2 bg-black/35 backdrop-blur-md",
        "hover:scale-[1.04] transition will-change-transform",
        "glow cockpit-glow pulse-soft",
        color,
        className,
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 opacity-90" /> : null}
        <span className="uppercase tracking-wide text-xs md:text-sm">{label}</span>
      </div>
    </MotionTag>
  );
}
