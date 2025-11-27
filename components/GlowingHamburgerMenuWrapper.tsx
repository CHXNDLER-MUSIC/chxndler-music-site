"use client";

import { useState } from "react";
import GlowingHamburgerMenu from "./GlowingHamburgerMenu";
import CodeButton from "./CodeButton";
import ChxndlerButton from "./ChxndlerButton";

export default function GlowingHamburgerMenuWrapper() {
  const [codeOpen, setCodeOpen] = useState(false);
  const [chxndlerOpen, setChxndlerOpen] = useState(false);

  const handleItemClick = (label: string) => {
    console.log(`Menu item clicked: ${label}`);
    
    switch (label) {
      case "THE CODE":
        setCodeOpen(true);
        break;
      // Add other cases as needed:
      // case "JOURNEY":
      //   openJourney();
      //   break;
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
      {/* Hidden CodeButton to handle the modal functionality */}
      <CodeButton
        style={{ display: 'none' }}
        open={codeOpen}
        onOpenChange={setCodeOpen}
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