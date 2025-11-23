"use client";

import React from "react";

// Venmo icon component (based on their brand)
const VenmoIcon = ({ size }: { size?: number }) => {
  const iconSize = size || `clamp(1.2rem, 3vw, 1.5rem)`;
  return (
    <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill="currentColor">
      <path d="M22.5 2h-21C.7 2 0 2.7 0 3.5v17c0 .8.7 1.5 1.5 1.5h21c.8 0 1.5-.7 1.5-1.5v-17c0-.8-.7-1.5-1.5-1.5zm-8.7 15.2L9.4 6.8h-3l3.6 10.4h2.8v.1zm3.8 0h2.8l1.4-10.4h-2.8l-1.4 10.4zm-9.3-6.8c0-1.5.9-2.4 2-2.4.4 0 .7.1 1 .2l.3-2.7c-.4-.1-.9-.1-1.3-.1-2.4 0-4.7 1.5-4.7 5.2 0 3.5 2.5 4.6 2.5 4.6l1.1-2.2s-1-.8-1-2.6z"/>
    </svg>
  );
};

type VenmoButtonProps = {
  amount?: number;
  note?: string;
  recipient?: string;
  className?: string;
};

export default function VenmoButton({ 
  amount = 3, 
  note = "Fuel the Signal", 
  recipient = "chxndlerthealien",
  className = "" 
}: VenmoButtonProps) {
  const handleVenmoClick = () => {
    // Play card-ding sound
    try {
      // Import sfx dynamically to avoid potential module issues
      import("@/lib/sfx").then(({ sfx }) => {
        sfx.play('card-ding', 0.7);
      });
    } catch {}
    
    // Venmo deep link format: venmo://paycharge?txn=pay&recipients=username&amount=amount&note=message
    const venmoUrl = `venmo://paycharge?txn=pay&recipients=${recipient}&amount=${amount}&note=${encodeURIComponent(note)}`;
    
    // Try to open the Venmo app first
    window.location.href = venmoUrl;
    
    // Fallback: if mobile app doesn't open, try web version after a short delay
    setTimeout(() => {
      const webVenmoUrl = `https://venmo.com/u/${recipient}?txn=pay&amount=${amount}&note=${encodeURIComponent(note)}`;
      window.open(webVenmoUrl, '_blank');
    }, 1500);
  };

  const color = "#3D95CE"; // Venmo brand blue
  const baseShadow = `0 0 18px ${color}88, inset 0 0 12px ${color}44, 0 12px 24px rgba(0,0,0,.35)`;
  const hoverShadow = `0 0 26px ${color}cc, inset 0 0 16px ${color}66, 0 16px 34px rgba(0,0,0,.45)`;

  return (
    <button
      onClick={handleVenmoClick}
      aria-label={`Send $${amount} via Venmo`}
      title={`Send $${amount} via Venmo`}
      className={`grid place-items-center rounded-2xl select-none ${className}`}
      style={{
        height: `clamp(2.5rem, 6vw, 3.5rem)`,
        width: `clamp(2.5rem, 6vw, 3.5rem)`,
        color,
        background: "rgba(0,0,0,.35)",
        border: "1px solid rgba(255,255,255,.16)",
        boxShadow: baseShadow,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        transition: "transform .12s ease, box-shadow .18s ease, background .2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.06)";
        e.currentTarget.style.boxShadow = hoverShadow;
        e.currentTarget.style.background = "rgba(255,255,255,.16)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = baseShadow;
        e.currentTarget.style.background = "rgba(0,0,0,.35)";
      }}
      onFocus={(e) => {
        e.currentTarget.style.transform = "scale(1.04)";
        e.currentTarget.style.boxShadow = hoverShadow;
        e.currentTarget.style.background = "rgba(255,255,255,.14)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = baseShadow;
        e.currentTarget.style.background = "rgba(0,0,0,.35)";
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
    >
      <div className="flex flex-col items-center">
        <VenmoIcon />
        <span className="text-xs font-bold mt-1">${amount}</span>
      </div>
    </button>
  );
}