"use client";

import React, { useState, useRef, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import Image from "next/image";
import { sfx } from "@/lib/sfx";
import { useDailyReflectionStatus } from "@/hooks/useDailyReflectionStatus";
import { useUIState } from "@/lib/use-ui-state";

interface GlowingHamburgerMenuProps {
  onItemClick?: (label: string) => void;
}

const getJourneyTitle = (isLoggedIn: boolean) => {
  return isLoggedIn ? "MY JOURNEY" : "JOURNEY";
};

export default function GlowingHamburgerMenu({ onItemClick }: GlowingHamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [badgesPoppedOut, setBadgesPoppedOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { profile, user } = useProfile();
  const { hasPendingReflection } = useDailyReflectionStatus();
  const { hasEnteredHeartverse } = useUIState();
  
  const journeyTitle = getJourneyTitle(!!user);
  
  const menuItems = [
    { label: "ABOUT", href: undefined },
    { label: journeyTitle, href: undefined },
    { label: "BINDER", href: undefined },
    { label: "BADGES", href: undefined },
    { label: "JOURNAL", href: undefined },
    { label: "STORE", href: undefined },
  ];

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
    sfx.play('click', 0.7);
    setIsOpen(!isOpen);
  };

  const handleItemClick = (label: string) => {
    sfx.play('click', 0.7);
    
    // Always call the parent click handler
    onItemClick?.(label);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="fixed top-2 left-4 z-[2147483647]">
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="relative w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white flex items-center justify-center transition-all duration-300 hover:scale-105"
        style={{
          borderColor: '#FFFFFF',
        }}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        <div className="w-6 h-6 flex flex-col justify-center items-center">
          {/* Top Line */}
          <div
            className={`w-5 h-0.5 bg-white transition-all duration-300 ${
              isOpen ? "rotate-45 translate-y-0.5" : ""
            }`}
            style={{
              boxShadow: "0 0 8px rgba(255, 255, 255, 0.6), 0 0 16px rgba(255, 255, 255, 0.3)"
            }}
          />
          {/* Middle Line */}
          <div
            className={`w-5 h-0.5 bg-white transition-all duration-300 mt-1 ${
              isOpen ? "opacity-0" : ""
            }`}
            style={{
              boxShadow: "0 0 8px rgba(255, 255, 255, 0.6), 0 0 16px rgba(255, 255, 255, 0.3)"
            }}
          />
          {/* Bottom Line */}
          <div
            className={`w-5 h-0.5 bg-white transition-all duration-300 mt-1 ${
              isOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
            style={{
              boxShadow: "0 0 8px rgba(255, 255, 255, 0.6), 0 0 16px rgba(255, 255, 255, 0.3)"
            }}
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
                  onClick={(e) => {
                    if (item.label === "BADGES") {
                      // Trigger pop-out animation
                      setBadgesPoppedOut(true);
                      setTimeout(() => setBadgesPoppedOut(false), 200);
                    }
                    handleItemClick(item.label);
                  }}
                  className={`w-full px-6 py-2 text-left text-white font-semibold tracking-wide transition-all duration-200 hover:bg-cyan-500/10 hover:text-cyan-300 relative group ${
                    item.label === "JOURNAL" && hasPendingReflection 
                      ? 'bg-gradient-to-r from-pink-500/10 via-transparent to-pink-500/10' 
                      : ''
                  } ${
                    item.label === "BADGES" && badgesPoppedOut 
                      ? 'scale-110 shadow-lg shadow-yellow-500/50' 
                      : ''
                  }`}
                  style={{
                    textShadow: item.label === "JOURNAL" && hasPendingReflection
                      ? "0 0 10px rgba(255, 20, 147, 0.8), 0 0 20px rgba(255, 105, 180, 0.6)"
                      : "0 0 10px rgba(252, 84, 175, 0.3)",
                  }}
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-200 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
                  
                  <span className="relative z-10 flex items-center gap-1 -ml-2">
                    {item.label === "ABOUT" && (
                      <Image
                        src="/elements/about.webp"
                        alt="About"
                        width={32}
                        height={32}
                        className="transition-all duration-200"
                      />
                    )}
                    {(item.label === "JOURNEY" || item.label === "MY JOURNEY") && (
                      <Image
                        src="/elements/journey.webp"
                        alt="Journey"
                        width={32}
                        height={32}
                        className="transition-all duration-200"
                      />
                    )}
                    {item.label === "JOURNAL" && (
                      <Image
                        src="/elements/journal.webp"
                        alt="Journal"
                        width={32}
                        height={32}
                        className={`transition-all duration-200 ${
                          hasPendingReflection 
                            ? 'drop-shadow-[0_0_8px_rgba(255,105,180,0.8)]' 
                            : ''
                        }`}
                        style={{
                          filter: hasPendingReflection 
                            ? 'brightness(1.3) drop-shadow(0 0 12px rgba(255,105,180,0.9))'
                            : undefined
                        }}
                      />
                    )}
                    {item.label === "BINDER" && (
                      <Image
                        src="/elements/binder.webp"
                        alt="Binder"
                        width={32}
                        height={32}
                        className="transition-all duration-200"
                      />
                    )}
                    {item.label === "BADGES" && (
                      <Image
                        src="/elements/badges.webp"
                        alt="Badges"
                        width={32}
                        height={32}
                        className="transition-all duration-200 group-hover:scale-110 group-hover:drop-shadow-lg"
                        style={{
                          filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.6))'
                        }}
                      />
                    )}
                    {item.label === "STORE" && (
                      <Image
                        src="/elements/store.png"
                        alt="Store"
                        width={32}
                        height={32}
                        className="transition-all duration-200"
                      />
                    )}
                    <div className="relative flex items-center">
                      {item.label}
                      {item.label === "JOURNAL" && hasPendingReflection && (
                        <div 
                          className="ml-2 w-2.5 h-2.5 rounded-full"
                          style={{
                            background: 'radial-gradient(circle, #FF1493 0%, #FF69B4 70%)',
                            boxShadow: '0 0 8px #FF1493, 0 0 16px #FF69B4'
                          }}
                        />
                      )}
                    </div>
                  </span>
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
