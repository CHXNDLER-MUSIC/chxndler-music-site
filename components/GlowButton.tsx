// components/GlowButton.tsx
"use client";
import { motion } from "framer-motion";
import { glow, cockpit } from "@/config/ui";
import * as Icons from "lucide-react";

export default function GlowButton({
  icon = "Rocket",
  label,
  onClick,
  href,
  color = "#FFFFFF",
  size = 18,
  active = false,
}: {
  icon?: keyof typeof Icons;
  label: string;
  onClick?: () => void;
  href?: string;
  color?: string;
  size?: number;
  active?: boolean;
}) {
  const Icon = Icons[icon] ?? Icons.Rocket;
  const Comp = href ? "a" : "button";
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${glow.base} ${glow.pulse}`}
      style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
    >
      <Comp
        {...(href ? { href, target: "_blank", rel: "noreferrer" } : {})}
        className={`${cockpit.btn.radius} ${cockpit.btn.pad} ${cockpit.btn.font} ${glow.ring} ${active ? cockpit.btn.on : cockpit.btn.off} bg-white/5 hover:bg-white/10`}
      >
        <span className="flex items-center gap-2">
          <Icon size={size} style={{ color }} />
          <span className="text-white/90">{label}</span>
        </span>
      </Comp>
    </motion.div>
  );
}
