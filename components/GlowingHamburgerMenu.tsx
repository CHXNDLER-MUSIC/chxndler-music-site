"use client";

import React, { useState, useRef, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import Image from "next/image";
import { sfx } from "@/lib/sfx";
import { useDailyReflectionStatus } from "@/hooks/useDailyReflectionStatus";

interface GlowingHamburgerMenuProps {
  onItemClick?: (label: string) => void;
  externalIsOpen?: boolean;
  onMenuToggle?: (isOpen: boolean) => void;
}

const getJourneyTitle = (isLoggedIn: boolean) => {
  return isLoggedIn ? "MY JOURNEY" : "JOURNEY";
};

export default function GlowingHamburgerMenu({ onItemClick, externalIsOpen, onMenuToggle }: GlowingHamburgerMenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const [badgesPoppedOut, setBadgesPoppedOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { profile, user } = useProfile();
  const { hasPendingReflection } = useDailyReflectionStatus();
  
  const journeyTitle = getJourneyTitle(!!user);
  
  const journalLabel = "JOURNAL";
  
  const menuItems = [
    { label: "ABOUT", href: undefined },
    { label: journeyTitle, href: undefined },
    { label: "BINDER", href: undefined },
    { label: "BADGES", href: undefined },
    { label: journalLabel, href: undefined },
    { label: "STORE", href: undefined },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (externalIsOpen !== undefined) {
          onMenuToggle?.(false);
        } else {
          setInternalIsOpen(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [externalIsOpen, onMenuToggle]);


  const toggleMenu = () => {
    sfx.play('click', 0.7);
    if (externalIsOpen !== undefined) {
      onMenuToggle?.(!isOpen);
    } else {
      setInternalIsOpen(!isOpen);
    }
  };

  const handleHover = () => {
    sfx.play('hover', 0.5);
  };

  const handleMenuItemHover = () => {
    sfx.play('change', 0.5);
  };

  const handleItemClick = (label: string) => {
    sfx.play('click', 0.7);
    
    // Always call the parent click handler
    onItemClick?.(label);
    if (externalIsOpen !== undefined) {
      onMenuToggle?.(false);
    } else {
      setInternalIsOpen(false);
    }
  };

  return (
    <div ref={menuRef} className="fixed top-1/2 -translate-y-1/2 left-4 z-[2147483646]" style={{ top: '32px' }}>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        onMouseEnter={handleHover}
        className="relative transition-all duration-300 hover:scale-105"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        data-tour-id="nav-toggle"
      >
        <div className="w-8 h-8 flex flex-col justify-center items-center relative">
          {isOpen ? (
            /* Yellow X - Only when open */
            <>
              <div
                className="w-7 h-1 absolute rotate-45 bg-yellow-400"
                style={{
                  boxShadow: "0 0 12px rgba(255, 255, 0, 1), 0 0 24px rgba(255, 255, 0, 0.8), 0 0 36px rgba(255, 255, 0, 0.6)",
                  animation: "neonPulseYellow 2s ease-in-out infinite alternate"
                }}
              />
              <div
                className="w-7 h-1 absolute -rotate-45 bg-yellow-400"
                style={{
                  boxShadow: "0 0 12px rgba(255, 255, 0, 1), 0 0 24px rgba(255, 255, 0, 0.8), 0 0 36px rgba(255, 255, 0, 0.6)",
                  animation: "neonPulseYellow 2s ease-in-out infinite alternate"
                }}
              />
            </>
          ) : (
            /* White hamburger lines - Only when closed */
            <>
              <div
                className="w-7 h-1 absolute bg-white -translate-y-2.5"
                style={{
                  boxShadow: "0 0 12px rgba(255, 255, 255, 1), 0 0 24px rgba(255, 255, 255, 0.8), 0 0 36px rgba(255, 255, 255, 0.6)",
                  animation: "neonPulse 2s ease-in-out infinite alternate"
                }}
              />
              <div
                className="w-7 h-1 absolute bg-white"
                style={{
                  boxShadow: "0 0 12px rgba(255, 255, 255, 1), 0 0 24px rgba(255, 255, 255, 0.8), 0 0 36px rgba(255, 255, 255, 0.6)",
                  animation: "neonPulse 2s ease-in-out infinite alternate"
                }}
              />
              <div
                className="w-7 h-1 absolute bg-white translate-y-2.5"
                style={{
                  boxShadow: "0 0 12px rgba(255, 255, 255, 1), 0 0 24px rgba(255, 255, 255, 0.8), 0 0 36px rgba(255, 255, 255, 0.6)",
                  animation: "neonPulse 2s ease-in-out infinite alternate"
                }}
              />
            </>
          )}
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          data-tour-id="nav-panel"
          className="absolute top-20 left-0 w-60 rounded-lg border border-[#FC54AF]/40 backdrop-blur-md transition-all duration-300 overflow-hidden"
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
          <div className="relative z-10 py-3">
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
                  onMouseEnter={handleMenuItemHover}
                  data-tour-id={
                    item.label === "ABOUT" ? "menu-about" :
                    (item.label === "JOURNEY" || item.label === "MY JOURNEY") ? "menu-journey" :
                    (item.label === "JOURNAL" || item.label === "COMPLETED") ? "menu-journal" :
                    item.label === "BINDER" ? "menu-binder" :
                    item.label === "BADGES" ? "menu-badges" :
                    item.label === "STORE" ? "menu-store" :
                    `menu-${item.label.toLowerCase().replace(/ /g, '-')}`
                  }
                  className={`w-full px-8 py-3 text-left text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-cyan-500/10 hover:text-cyan-300 relative group ${
                    item.label === "JOURNAL" && hasPendingReflection 
                      ? 'bg-gradient-to-r from-pink-500/10 via-transparent to-pink-500/10' 
                      : ''
                  } ${
                    item.label === "BADGES" && badgesPoppedOut 
                      ? 'scale-110 shadow-lg shadow-yellow-500/50' 
                      : ''
                  } ${
                    item.label === "COMPLETED" 
                      ? 'bg-gradient-to-r from-green-500/10 via-transparent to-green-500/10' 
                      : ''
                  }`}
                  style={{
                    textShadow: item.label === "JOURNAL" && hasPendingReflection
                      ? "0 0 10px rgba(255, 20, 147, 0.8), 0 0 20px rgba(255, 105, 180, 0.6)"
                      : item.label === "COMPLETED" && !hasPendingReflection
                      ? "0 0 10px rgba(34, 197, 94, 0.8), 0 0 20px rgba(34, 197, 94, 0.6)"
                      : "0 0 10px rgba(252, 84, 175, 0.3)",
                  }}
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-200 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
                  
                  <span className="relative z-10 flex items-center gap-2 -ml-2">
                    {item.label === "ABOUT" && (
                      <Image
                        src="/elements/about.webp"
                        alt="About"
                        width={36}
                        height={36}
                        className="transition-all duration-200"
                      />
                    )}
                    {(item.label === "JOURNEY" || item.label === "MY JOURNEY") && (
                      <Image
                        src="/elements/journey.webp"
                        alt="Journey"
                        width={36}
                        height={36}
                        className="transition-all duration-200"
                      />
                    )}
                    {(item.label === "JOURNAL" || item.label === "COMPLETED") && (
                      <Image
                        src="/elements/journal.webp"
                        alt={item.label === "COMPLETED" ? "Journal Completed" : "Journal"}
                        width={36}
                        height={36}
                        className={`transition-all duration-200 ${
                          item.label === "JOURNAL" && hasPendingReflection 
                            ? 'drop-shadow-[0_0_8px_rgba(255,105,180,0.8)]' 
                            : item.label === "COMPLETED"
                            ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                            : ''
                        }`}
                        style={{
                          filter: item.label === "JOURNAL" && hasPendingReflection 
                            ? 'brightness(1.3) drop-shadow(0 0 12px rgba(255,105,180,0.9))'
                            : item.label === "COMPLETED"
                            ? 'brightness(1.3) drop-shadow(0 0 12px rgba(34,197,94,0.9))'
                            : undefined
                        }}
                      />
                    )}
                    {item.label === "BINDER" && (
                      <Image
                        src="/elements/binder.webp"
                        alt="Binder"
                        width={36}
                        height={36}
                        className="transition-all duration-200"
                      />
                    )}
                    {item.label === "BADGES" && (
                      <Image
                        src="/elements/badges.webp"
                        alt="Badges"
                        width={36}
                        height={36}
                        className="transition-all duration-200 group-hover:scale-110 group-hover:drop-shadow-lg"
                        style={{
                          filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.6))'
                        }}
                      />
                    )}
                    {item.label === "STORE" && (
                      <Image
                        src="/elements/store.webp"
                        alt="Store"
                        width={36}
                        height={36}
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
