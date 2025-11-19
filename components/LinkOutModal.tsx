"use client";
import React from "react";
import SharedModal from "@/components/SharedModal";

export default function LinkOutModal({
  title = "Open Link",
  href,
  onClose,
  accent = "#38B6FF",
  iconSrc,
  message,
}: {
  title?: string;
  href: string;
  onClose: () => void;
  accent?: string; // glow color
  iconSrc?: string; // optional brand icon
  message?: string; // optional helper message
}) {
  return (
    <SharedModal 
      open={true} 
      onClose={onClose} 
      title={title}
      ariaLabel={title}
    >
      <div className="relative flex justify-between items-center mb-4">
        <a href={href} target="_blank" rel="noreferrer" className="text-[#9ad7ff] text-sm underline opacity-90 hover:opacity-100">
          Open in new tab
        </a>
      </div>
      
      <div className="relative flex flex-col items-center gap-4">
        {iconSrc ? (
          <img 
            src={iconSrc} 
            alt="" 
            className="w-[74px] h-[74px] object-contain"
            style={{ filter: `drop-shadow(0 0 22px ${accent})` }}
          />
        ) : (
          <div 
            className="w-[74px] h-[74px] rounded-2xl"
            style={{ 
              background: `radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%), rgba(25,227,255,.25)`, 
              boxShadow: `0 0 22px ${accent}` 
            }}
          />
        )}
        
        <div className="text-[#d4e8ff] opacity-90 text-center">
          {message || "This site cannot be embedded. Use the button below."}
        </div>
        
        <a 
          href={href} 
          target="_blank" 
          rel="noreferrer" 
          className="inline-flex items-center justify-center gap-2 px-[18px] py-3 rounded-xl text-[#001018] bg-gradient-to-b from-[#D6F3FF] to-[#9AD7FF] font-bold hover:brightness-105 transition"
          style={{ boxShadow: '0 8px 22px rgba(25,227,255,.22)' }}
          aria-label={`Open ${title}`}
        >
          Open {title}
        </a>
      </div>
    </SharedModal>
  );
}

