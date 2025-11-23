/**
 * INTEGRATION EXAMPLE: How to add the onboarding tour to your cockpit
 * 
 * This example shows how to integrate the onboarding tour components
 * into your main cockpit/dashboard page.
 */

"use client";

import { useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import OnboardingEntryGate from "@/components/OnboardingEntryGate";
import OnboardingTour from "@/components/OnboardingTour";
import TourReplayButton from "@/components/TourReplayButton";

export default function CockpitWithOnboarding() {
  const { profile } = useProfile();
  
  // Track when profile creation is complete (user clicked "Enter the Heartverse")
  const [isProfileCreationComplete, setIsProfileCreationComplete] = useState(false);
  
  // Control tour visibility
  const [isTourActive, setIsTourActive] = useState(false);
  
  // Manual tour trigger (for replay button)
  const [isTourManuallyTriggered, setIsTourManuallyTriggered] = useState(false);

  // Called when user completes profile creation and clicks "Enter the Heartverse"
  const handleProfileCreationComplete = () => {
    setIsProfileCreationComplete(true);
  };

  // Called when user chooses "Show me around" from the welcome modal
  const handleStartTour = () => {
    setIsTourActive(true);
  };

  // Called when tour finishes (completed or skipped)
  const handleTourFinish = (completed: boolean) => {
    setIsTourActive(false);
    setIsTourManuallyTriggered(false);
    console.log(`Tour ${completed ? 'completed' : 'skipped'}`);
  };

  // Called when user clicks "Show me around again" button
  const handleReplayTour = () => {
    setIsTourManuallyTriggered(true);
    setIsTourActive(true);
  };

  return (
    <div className="cockpit-container">
      {/* Your existing cockpit UI */}
      
      {/* ========== COCKPIT CONTENT WITH TOUR IDS ========== */}
      
      {/* Beliefs Button - ADD data-tour-id="beliefs" */}
      <button 
        data-tour-id="beliefs"
        className="beliefs-button"
        onClick={() => {/* your beliefs logic */}}
      >
        Beliefs
      </button>

      {/* Heart Coins Display - ADD data-tour-id="heartcoins" */}
      <div data-tour-id="heartcoins" className="heartcoins-display">
        <span>Heart Coins: {profile?.heartcoin_balance || 0}</span>
      </div>

      {/* CHXNDLER Cards Binder - ADD data-tour-id="cards" */}
      <button 
        data-tour-id="cards"
        className="cards-binder-button"
        onClick={() => {/* your cards logic */}}
      >
        CHXNDLER Cards
      </button>

      {/* Soul Star Journal - ADD data-tour-id="journal" */}
      <button 
        data-tour-id="journal"
        className="journal-button"
        onClick={() => {/* your journal logic */}}
      >
        Soul Star Journal
      </button>

      {/* Badges Section - ADD data-tour-id="badges" */}
      <div data-tour-id="badges" className="badges-section">
        <h3>Badges</h3>
        {/* badges content */}
      </div>

      {/* ========== PROFILE CREATION TRIGGER ========== */}
      
      {/* 
        IMPORTANT: Call handleProfileCreationComplete() right after 
        the user clicks "Enter the Heartverse" and completes their profile.
        
        This should be in your profile creation flow:
      */}
      {/* 
      <button 
        onClick={() => {
          // Your existing profile completion logic
          completeProfile();
          
          // NEW: Trigger onboarding check
          handleProfileCreationComplete();
        }}
      >
        Enter the Heartverse
      </button>
      */}

      {/* ========== REPLAY TOUR BUTTON ========== */}
      
      {/* Add this somewhere in your UI - maybe in a help menu or profile panel */}
      {profile?.has_seen_tour && (
        <div className="help-menu">
          <TourReplayButton onReplayTour={handleReplayTour} />
        </div>
      )}

      {/* ========== ONBOARDING COMPONENTS ========== */}
      
      {/* Entry gate modal - shows "Welcome home, Alien" modal */}
      <OnboardingEntryGate
        isProfileCreationComplete={isProfileCreationComplete}
        onStartTour={handleStartTour}
      />

      {/* Tour overlay and speech bubbles */}
      <OnboardingTour
        active={isTourActive}
        onFinish={handleTourFinish}
      />
    </div>
  );
}

/**
 * ========== REQUIRED DATA ATTRIBUTES ==========
 * 
 * Add these data-tour-id attributes to your existing cockpit elements:
 * 
 * 1. data-tour-id="beliefs"     - On your Beliefs button/section
 * 2. data-tour-id="heartcoins"  - On your Heart Coins display  
 * 3. data-tour-id="cards"       - On your CHXNDLER cards binder button
 * 4. data-tour-id="journal"     - On your Soul Star Journal button
 * 5. data-tour-id="badges"      - On your Badges section
 * 
 * Example:
 * <button data-tour-id="beliefs" onClick={openBeliefs}>
 *   Beliefs
 * </button>
 */

/**
 * ========== SETUP CHECKLIST ==========
 * 
 * 1. ✅ Run the SQL migration:
 *    Execute ADD_HAS_SEEN_TOUR_MIGRATION.sql in your Supabase dashboard
 * 
 * 2. ✅ Add data-tour-id attributes to your cockpit elements (see above)
 * 
 * 3. ✅ Import and use the components in your main cockpit page:
 *    - OnboardingEntryGate
 *    - OnboardingTour  
 *    - TourReplayButton (optional)
 * 
 * 4. ✅ Call handleProfileCreationComplete() after "Enter the Heartverse" click
 * 
 * 5. ✅ Test the flow:
 *    - Create a new profile
 *    - Complete name and element selection
 *    - Click "Enter the Heartverse"  
 *    - Should see "Welcome home, Alien" modal
 *    - Click "Show me around" to start tour
 */

/**
 * ========== CUSTOMIZATION OPTIONS ==========
 * 
 * Tour Steps (in OnboardingTour.tsx):
 * - Modify TOUR_STEPS array to change text or add/remove steps
 * - Update selectors if your data-tour-id attributes are different
 * 
 * Styling:
 * - Tour uses Tailwind + inline styles matching your cyan theme
 * - Modify colors in the component files to match your brand
 * - Glow animations use 2s duration for calm, magical feel
 * 
 * Timing:
 * - Modal fades: 250-300ms
 * - Tour highlight pulse: 2s ease-in-out  
 * - All transitions designed to feel calm and magical
 */