"use client";

import GlowingHamburgerMenu from "./GlowingHamburgerMenu";

export default function GlowingHamburgerMenuWrapper() {
  const handleItemClick = (label: string) => {
    // Hook into existing UI logic here
    console.log(`Menu item clicked: ${label}`);
    
    // You can replace this with your existing modal/routing logic:
    // switch (label) {
    //   case "CODE":
    //     openCodeModal();
    //     break;
    //   case "JOURNEY":
    //     openJourney();
    //     break;
    //   case "JOURNAL":
    //     openJournal();
    //     break;
    //   case "BINDER":
    //     openBinder();
    //     break;
    //   case "BADGES":
    //     openBadges();
    //     break;
    //   case "CHXNDLER":
    //     openChxndler();
    //     break;
    //   case "BEHAVIOR":
    //     // Handle behavior logic
    //     break;
    // }
  };

  return <GlowingHamburgerMenu onItemClick={handleItemClick} />;
}