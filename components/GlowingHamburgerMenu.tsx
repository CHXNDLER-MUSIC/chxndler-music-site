"use client";

import React, { useState, useRef, useEffect } from "react";

interface GlowingHamburgerMenuProps {
  onItemClick?: (label: string) => void;
}

const menuItems = [
  { label: "THE CODE", href: undefined },
  { label: "JOURNEY", href: undefined },
  { label: "JOURNAL", href: undefined },
  { label: "BINDER", href: undefined },
  { label: "BADGES", href: undefined },
  { label: "CHXNDLER", href: undefined },
  { label: "STORE", href: undefined },
];

export default function GlowingHamburgerMenu({ onItemClick }: GlowingHamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = (label: string) => {
    onItemClick?.(label);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="fixed top-4 left-4 z-50">
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="relative w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm border border-[#FC54AF]/30 flex items-center justify-center transition-all duration-300 hover:scale-105 animate-pulse"
        style={{
          boxShadow: `
            0 0 20px #FC54AF40,
            0 0 40px #FC54AF20,
            inset 0 0 20px #FC54AF10
          `,
        }}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        <div className="w-6 h-6 flex flex-col justify-center items-center">
          {/* Top Line */}
          <div
            className={`w-5 h-0.5 bg-white transition-all duration-300 ${
              isOpen ? "rotate-45 translate-y-0.5" : ""
            }`}
          />
          {/* Middle Line */}
          <div
            className={`w-5 h-0.5 bg-white transition-all duration-300 mt-1 ${
              isOpen ? "opacity-0" : ""
            }`}
          />
          {/* Bottom Line */}
          <div
            className={`w-5 h-0.5 bg-white transition-all duration-300 mt-1 ${
              isOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute top-20 left-0 w-48 rounded-lg border border-[#FC54AF]/40 backdrop-blur-md transition-all duration-300 overflow-hidden"
          style={{
            background: "rgba(0, 0, 0, 0.8)",
            boxShadow: `
              0 0 30px #FC54AF30,
              0 0 60px #FC54AF15,
              inset 0 0 30px #FC54AF05
            `,
          }}
        >
          {/* Holographic Gradient Overlay */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              background: `
                linear-gradient(
                  135deg,
                  transparent 0%,
                  #FC54AF20 25%,
                  transparent 50%,
                  #FF00FF15 75%,
                  transparent 100%
                )
              `,
            }}
          />
          
          {/* Menu Items */}
          <div className="relative z-10 py-2">
            {menuItems.map((item, index) => (
              <React.Fragment key={item.label}>
                <button
                  onClick={() => handleItemClick(item.label)}
                  className="w-full px-6 py-3 text-left text-white font-semibold tracking-wide transition-all duration-200 hover:bg-[#FC54AF]/10 hover:text-[#FC54AF] hover:scale-105 hover:tracking-wider relative group"
                  style={{
                    textShadow: "0 0 10px rgba(252, 84, 175, 0.3)",
                  }}
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-200 bg-gradient-to-r from-transparent via-[#FC54AF] to-transparent" />
                  
                  <span className="relative z-10">{item.label}</span>
                </button>
                
                {/* Pink Divider Line */}
                {index < menuItems.length - 1 && (
                  <div
                    className="mx-4 h-px"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, #FC54AF80 50%, transparent 100%)",
                      boxShadow: "0 0 4px #FC54AF40",
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}