"use client";

import { useState } from "react";
import GlowingHamburgerMenu from "./GlowingHamburgerMenu";
import CodeButton from "./CodeButton";
import ChxndlerButton from "./ChxndlerButton";
import CodeModal from "./CodeModal";

export default function GlowingHamburgerMenuWrapper() {
  const [codeOpen, setCodeOpen] = useState(false);
  const [chxndlerOpen, setChxndlerOpen] = useState(false);

  const handleItemClick = (label: string) => {
    console.log(`Menu item clicked: ${label}`);
    
    switch (label) {
      case "ABOUT":
        setCodeOpen(true);
        break;
      // Handle dynamic journey titles:
      case "JOURNEY":
      case "MY JOURNEY":
        // openJourney();
        console.log(`Journey clicked: ${label}`);
        break;
      // case "JOURNAL":
      //   openJournal();
      //   break;
      // case "BINDER":
      //   openBinder();
      //   break;
      // case "BADGES":
      //   openBadges();
      //   break;
      case "CHXNDLER":
        setChxndlerOpen(true);
        break;
      // case "STORE":
      //   openStore();
      //   break;
      default:
        console.log(`No handler for menu item: ${label}`);
    }
  };

  return (
    <>
      <GlowingHamburgerMenu onItemClick={handleItemClick} />
      {/* CodeModal for ABOUT functionality */}
      <CodeModal 
        open={codeOpen} 
        onClose={() => setCodeOpen(false)} 
      />
      {/* Hidden ChxndlerButton to handle the modal functionality */}
      <ChxndlerButton
        style={{ display: 'none' }}
        open={chxndlerOpen}
        onOpenChange={setChxndlerOpen}
      />
    </>
  );
}