// components/CoverHologram.tsx
"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { cockpit } from "@/config/ui";
import { useState, useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/sfx";
import HeartCardCheckout from "./HeartCardCheckout";
import HeartCardSuccess from "./HeartCardSuccess";
import { ELEMENT_COLORS, type Element } from "@/lib/planets";

// Helper function to determine element from title/slug
const getTrackElement = (title: string, slug?: string): Element => {
  const searchStr = (slug || title).toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
  
  // Darkness songs
  if (searchStr.includes("alone") || searchStr.includes("cheerleader") || searchStr.includes("little-black-heart") || 
      searchStr.includes("mr-brightside") || searchStr.includes("paris")) return "darkness";
  
  // Heart songs  
  if (searchStr.includes("always-on-my-mind") || searchStr.includes("baby") || searchStr.includes("be-my-bee") ||
      searchStr.includes("collide") || searchStr.includes("colors-of-our-home") || searchStr.includes("i-might-fall-in-love") ||
      searchStr.includes("love-me") || searchStr.includes("somebody-to-love") || searchStr.includes("tienes-un-amigo") ||
      searchStr.includes("we-re-just-friends")) return "heart";
  
  // Lightning songs
  if (searchStr.includes("american-dream") || searchStr.includes("blue") || searchStr.includes("brain-freeze") ||
      searchStr.includes("feeling-this") || searchStr.includes("game-boy-heart") || searchStr.includes("home") ||
      searchStr.includes("house-party") || searchStr.includes("kid-forever") || searchStr.includes("pokemon")) return "lightning";
  
  // Water songs
  if (searchStr.includes("letting-go") || searchStr.includes("ocean-girl")) return "water";
  
  // Legacy fallback for unmapped songs
  if (searchStr.includes("heart") || searchStr.includes("love") || searchStr.includes("friends")) return "heart";
  if (searchStr.includes("lightning") || searchStr.includes("electric") || searchStr.includes("neon")) return "lightning";
  if (searchStr.includes("dark") || searchStr.includes("black") || searchStr.includes("midnight")) return "darkness";
  if (searchStr.includes("ocean") || searchStr.includes("tide") || searchStr.includes("wave") || searchStr.includes("sea")) return "water";
  
  // Default fallback
  return "heart";
};

// Helper functions for element styling
const getElementBackground = (element: string | null) => {
  switch (element) {
    case 'heart': return 'radial-gradient(circle, rgba(252,84,175,0.3), rgba(252,84,175,0.1))';
    case 'water': return 'radial-gradient(circle, rgba(56,182,255,0.3), rgba(56,182,255,0.1))';
    case 'lightning': return 'radial-gradient(circle, rgba(242,239,29,0.3), rgba(242,239,29,0.1))';
    case 'darkness': return 'radial-gradient(circle, rgba(255,255,255,0.3), rgba(255,255,255,0.1))';
    default: return 'radial-gradient(circle, rgba(252,84,175,0.3), rgba(252,84,175,0.1))';
  }
};

const getElementGlow = (element: string | null) => {
  switch (element) {
    case 'heart': return '0 0 12px rgba(252,84,175,0.8), 0 0 24px rgba(252,84,175,0.6), 0 0 36px rgba(252,84,175,0.4)';
    case 'water': return '0 0 12px rgba(56,182,255,0.8), 0 0 24px rgba(56,182,255,0.6), 0 0 36px rgba(56,182,255,0.4)';
    case 'lightning': return '0 0 12px rgba(242,239,29,0.8), 0 0 24px rgba(242,239,29,0.6), 0 0 36px rgba(242,239,29,0.4)';
    case 'darkness': return '0 0 12px rgba(255,255,255,0.8), 0 0 24px rgba(255,255,255,0.6), 0 0 36px rgba(255,255,255,0.4)';
    default: return '0 0 12px rgba(252,84,175,0.8), 0 0 24px rgba(252,84,175,0.6), 0 0 36px rgba(252,84,175,0.4)';
  }
};

// Generate purchase URL based on song title
const getPurchaseUrl = (title: string) => {
  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Debug: log the generated slug to see what's happening
  
  
  // Map of song slugs to their Stripe purchase URLs
  const purchaseUrls: Record<string, string> = {
    'chxndler': 'https://buy.stripe.com/cNi14oetz6p76Bbgxx4gg0k',
    'alone': 'https://buy.stripe.com/dRmfZiclr5l3e3Ddll4gg0i',
    'always-on-my-mind': 'https://buy.stripe.com/9B6cN61GN28R0cN5ST4gg04',
    'baby': 'https://buy.stripe.com/aFacN64SZ4gZcZz8114gg0a',
    'be-my-bee': 'https://buy.stripe.com/7sY9AU1GN00J4t3ftt4gg0l',
    'be-my-bee-acoustic': 'https://buy.stripe.com/eVq4gA7173cV6Bb0yz4gg07',
    'brain-freeze': 'https://buy.stripe.com/8x2aEYfxD00JcZza994gg0h',
    'collide': 'https://buy.stripe.com/7sY3cw5X3fZH0cN0yz4gg05',
    'colors-of-our-home': 'https://buy.stripe.com/5kQ00k2KRfZH9Nn1CD4gg0j',
    'game-boy-heart': 'https://buy.stripe.com/aFa8wQ2KR5l32kV6WX4gg0m',
    'i-might-fall-in-love-with-you': 'https://buy.stripe.com/aFa8wQdpv7tb1gR1CD4gg0c',
    'kid-forever': 'https://buy.stripe.com/00wfZibhnfZH4t3dll4gg0g',
    'letting-go': 'https://buy.stripe.com/3cI9AU85b00J9Nna994gg0d',
    'mrbrightside': 'https://buy.stripe.com/8x25kEetz8xf0cN8114gg02',
    'ocean-girl': 'https://buy.stripe.com/dRmbJ24SZ00J6Bb9554gg00',
    'ocean-girl-acoustic': 'https://buy.stripe.com/aFaeVeclr28R3oZftt4gg09',
    'ocean-girl-remix': 'https://buy.stripe.com/dRmeVeetz8xf0cNchh4gg08',
    'somebody-to-love': 'https://buy.stripe.com/4gM00kgBH4gZaRr1CD4gg0e',
    'tienes-un-amigo': 'https://buy.stripe.com/cNibJ2gBH3cV8Jjgxx4gg0f',
    'were-just-friends': 'https://buy.stripe.com/14A14o99fbJrbVv8114gg0b',
    'were-just-friends-mickey-jas-remix': 'https://buy.stripe.com/aFa5kE3OV14N3oZchh4gg06',
    'were-just-friends-dmvrco-remix': 'https://buy.stripe.com/28EdRa0CJ5l38Jj9554gg03',
    // New mappings from user-provided paylinks
    'were-just-friends-acoustic': 'https://buy.stripe.com/6oU5kE99f9BjgbL6WX4gg0n',
    'love-me-acoustic': 'https://buy.stripe.com/bJecN6adjcNv6Bb3KL4gg0o',
    'love-me': 'https://buy.stripe.com/eVq3cwadj8xf3oZ0yz4gg0p',
    'home-acoustic': 'https://buy.stripe.com/28E3cw3OV14N3oZbdd4gg0q',
    'house-party-acoustic': 'https://buy.stripe.com/3cI14oetzbJr7Ff0yz4gg0r',
    'house-party': 'https://buy.stripe.com/bJe28sdpv5l31gR0yz4gg0s',
    'pink-moon': 'https://buy.stripe.com/bJecN6adjcNv6Bb3KL4gg0o',
    'blue': 'https://buy.stripe.com/14AcN6clrdRz1gRbdd4gg0x',
    'american-dream': 'https://buy.stripe.com/4gM9AUbhneVD3oZbdd4gg0w',
    'always-on-my-mind-remix': 'https://buy.stripe.com/dRm9AUetz3cV0cNepp4gg0A',
    'cheerleader': 'https://buy.stripe.com/cNi5kEadj5l37Ff2GH4gg0y',
    'paris': 'https://buy.stripe.com/28E3cw3OV3cV0cN1CD4gg0z',
    'pokmon': 'https://buy.stripe.com/7sY4gA5X35l39Nn0yz4gg0v', // POKÉMON (diacritic-stripped slug)
    'pokemon': 'https://buy.stripe.com/7sY4gA5X35l39Nn0yz4gg0v', // Safety alias
    'feeling-this': 'https://buy.stripe.com/28EcN6fxD7tb3oZ2GH4gg0u',
  };
  
  // Return specific URL or log error and fallback
  const url = purchaseUrls[slug];
  if (!url) {
    console.error(`🎵 No purchase URL found for slug: "${slug}" (title: "${title}"). Available slugs:`, Object.keys(purchaseUrls));
    console.error(`🎵 Falling back to chxndler URL`);
    return purchaseUrls['chxndler'];
  }
  return url;
};

export default function CoverHologram({ src, title, slug, inline = false, size = 180, onCardOpen }: { src: string; title: string; slug?: string; inline?: boolean; size?: number; onCardOpen?: () => void }) {
  // Determine the element type for this track to get appropriate neon glow
  const trackElement = getTrackElement(title, slug);
  const elementColor = ELEMENT_COLORS[trackElement];
  
  // Explicit external card image URLs by slug
  const CARD_URLS: Record<string, string> = {
    // Special/back + brand
    'back': 'https://ik.imagekit.io/CHXNDLER/card/back.png?updatedAt=1762388351170',
    'chxndler': 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910',
    'chxndler_home': 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910',

    // Cards by song
    'baby': 'https://ik.imagekit.io/CHXNDLER/card/baby.png?updatedAt=1762388345192',
    'feeling-this': 'https://ik.imagekit.io/CHXNDLER/card/feeling-this.png?updatedAt=1762388347289',
    'colors-of-our-home': 'https://ik.imagekit.io/CHXNDLER/card/COLORS%20OF%20OUR%20HOME%20.png?updatedAt=1763055065493',
    'tienes-un-amigo': 'https://ik.imagekit.io/CHXNDLER/card/tienes-un-amigo.png?updatedAt=1762388343639',
    'alone': 'https://ik.imagekit.io/CHXNDLER/card/alone.png?updatedAt=1762388342410',
    'always-on-my-mind': 'https://ik.imagekit.io/CHXNDLER/card/always-on-my-mind.png?updatedAt=1762388345883',
    'always-on-my-mind-remix': 'https://ik.imagekit.io/CHXNDLER/card/always-on-my-mind-remix.png?updatedAt=1762388342107',
    'be-my-bee': 'https://ik.imagekit.io/CHXNDLER/card/be-my-bee.png?updatedAt=1762388342848',
    'be-my-bee-acoustic': 'https://ik.imagekit.io/CHXNDLER/card/be-my-bee-acoustic.png?updatedAt=1762388342912',
    'blue': 'https://ik.imagekit.io/CHXNDLER/card/blue.png?updatedAt=1762388346777',
    'brain-freeze': 'https://ik.imagekit.io/CHXNDLER/card/brain-freeze.png?updatedAt=1762388347224',
    'cheerleader': 'https://ik.imagekit.io/CHXNDLER/card/cheerleader.png?updatedAt=1762388346177',
    'colors-of-our-home-bluma': 'https://ik.imagekit.io/CHXNDLER/card/colors-of-our-home-bluma.png?updatedAt=1762388344204',
    'colors-of-our-home-bluma-game-soundtrack': 'https://ik.imagekit.io/CHXNDLER/card/colors-of-our-home-bluma.png?updatedAt=1762388344204',
    'colors-of-our-home-acoustic': 'https://ik.imagekit.io/CHXNDLER/card/COLORS%20OF%20OUR%20HOME%20(ACOUSTIC).png?updatedAt=1763056318632',
    'game-boy-heart': 'https://ik.imagekit.io/CHXNDLER/card/game-boy-heart.png?updatedAt=1762388346348',
    'home': 'https://ik.imagekit.io/CHXNDLER/card/home.png?updatedAt=1762388345590',
    'home-acoustic': 'https://ik.imagekit.io/CHXNDLER/card/home-acoustic.png?updatedAt=1762388344295',
    'letting-go': 'https://ik.imagekit.io/CHXNDLER/card/letting-go.png?updatedAt=1762388344472',
    'house-party': 'https://ik.imagekit.io/CHXNDLER/card/house-party.png?updatedAt=1762388343549',
    'i-might-fall-in-love-with-you': 'https://ik.imagekit.io/CHXNDLER/card/i-might-fall-in-love-with-you.png?updatedAt=1762388340663',
    'little-black-heart': 'https://ik.imagekit.io/CHXNDLER/card/little-black-heart.png?updatedAt=1762388346814',
    'kid-forever': 'https://ik.imagekit.io/CHXNDLER/card/kid-forever.png?updatedAt=1762388339589',
    'love-me': 'https://ik.imagekit.io/CHXNDLER/card/love-me.png?updatedAt=1762388339563',
    'love-me-acoustic': 'https://ik.imagekit.io/CHXNDLER/card/love-me-acoustic.png?updatedAt=1762388330787',
    'house-party-acoustic': 'https://ik.imagekit.io/CHXNDLER/card/house-party-acoustic.png?updatedAt=1762388343028',
    'ocean-girl-remix': 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl-remix.png?updatedAt=1762388346301',
    'ocean-girl': 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl.png?updatedAt=1762388343942',
    'ocean-girl-acoustic': 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl-acoustic.png?updatedAt=1762388344386',
    'pink-moon': 'https://ik.imagekit.io/CHXNDLER/card/pink-moon.png?updatedAt=1762388347173',
    'somebody-to-love': 'https://ik.imagekit.io/CHXNDLER/card/somebody-to-love.png?updatedAt=1762388347148',
    'we-re-just-friends-dmvrco-remix': "https://ik.imagekit.io/CHXNDLER/card/we're-just-friends-dmvrco-remix.png?updatedAt=1762388345669",
    'we-re-just-friends-acoustic': "https://ik.imagekit.io/CHXNDLER/card/we're-just-friends-acoustic.png?updatedAt=1762388340285",
    'we-re-just-friends-mickey-jas-remix': "https://ik.imagekit.io/CHXNDLER/card/we're-just-friends-mickey-jas-remix.png?updatedAt=1762388346859",
    'we-re-just-friends': "https://ik.imagekit.io/CHXNDLER/card/we're-just-friends.png?updatedAt=1762388347233",
    'collide': 'https://ik.imagekit.io/CHXNDLER/card/collide.png?updatedAt=1762388347054',
    'mr-brightside': 'https://ik.imagekit.io/CHXNDLER/card/mr.brightside.png?updatedAt=1762388346700',
    'paris': 'https://ik.imagekit.io/CHXNDLER/card/paris.png?updatedAt=1762388344978',
    'pokemon': 'https://ik.imagekit.io/CHXNDLER/card/pokemon.png?updatedAt=1762388341960',
  };
  const [showCard, setShowCard] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hasRealCard, setHasRealCard] = useState(false);
  
  // Collection panel state
  const [showCollectionPanel, setShowCollectionPanel] = useState(false);
  const [userProfile, setUserProfile] = useState<{name: string; hearts: number; selected_element?: ElementKey; email?: string; phone?: string} | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState<'digital' | 'physical'>('digital');
  const [userSelectedElement, setUserSelectedElement] = useState<ElementKey | null>('heart');
  
  // Checkout flow state
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  
  // Function to fetch user profile
  const fetchUserProfile = async () => {
    setLoadingProfile(true);
    try {
      const response = await fetch('/api/profile', { credentials: 'include' });
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        
        // Also fetch the user's selected element
        try {
          const elementResponse = await fetch('/api/profile/element', { credentials: 'include' });
          if (elementResponse.ok) {
            const elementData = await elementResponse.json();
            setUserSelectedElement(elementData?.selected_element || 'heart');
          }
        } catch {
          setUserSelectedElement('heart'); // Default fallback
        }
      } else {
        // User not logged in or no profile - use hardcoded data for now
        setUserProfile({ name: 'Guest User', hearts: 5 });
        setUserSelectedElement('heart');
      }
    } catch (error) {
      // Fallback to hardcoded data
      setUserProfile({ name: 'Guest User', hearts: 5 });
      setUserSelectedElement('heart');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Load profile when collection panel opens
  useEffect(() => {
    if (showCollectionPanel && !userProfile && !loadingProfile) {
      fetchUserProfile();
    }
  }, [showCollectionPanel, userProfile, loadingProfile]);
  
  // ELEMENT popover state
  const [showElementsPopover, setShowElementsPopover] = useState(false);
  const [elementsLoading, setElementsLoading] = useState(false);
  const [elementsError, setElementsError] = useState<string | null>(null);
  const [elementsContent, setElementsContent] = useState('');
  // Selected element to display within Elements popover; null shows only intro
  type ElementKey = 'water' | 'heart' | 'lightning' | 'darkness';
  const [selectedElement, setSelectedElement] = useState<ElementKey | null>(null);
  // Hovered element for hover effects
  const [hoveredElement, setHoveredElement] = useState<ElementKey | null>(null);
  // Parse ELEMENTS.md content for structured rendering
  const parseElementsContent = (content: string) => {
    if (!content) return { title: '', intro: '', elements: {} as Record<ElementKey, { heading: string; text: string }> };
    
    const lines = content.split(/\r?\n/);
    type Key = ElementKey;
    const keyFromHeading = (s: string): Key | null => {
      const t = s.trim().toLowerCase();
      if (t.startsWith('💧 water')) return 'water';
      if (t.startsWith('🩷 heart')) return 'heart';
      if (t.startsWith('⚡️ lightning') || t.startsWith('⚡ lightning')) return 'lightning';
      if (t.startsWith('🌑 darkness')) return 'darkness';
      return null;
    };
    
    let title = '';
    let intro = '';
    const elements: Record<ElementKey, { heading: string; text: string }> = {} as any;
    
    let currentElement: ElementKey | null = null;
    let buffer: string[] = [];
    let introBuffer: string[] = [];
    let afterTitle = false;
    
    console.log('🔍 Parsing content with', lines.length, 'lines'); // Debug
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const asKey = keyFromHeading(line);
      
      // First line is the title
      if (i === 0 && line.trim()) {
        title = line.trim();
        afterTitle = true;
        console.log('📌 Title:', title); // Debug
        continue;
      }
      
      // Found an element heading
      if (asKey) {
        console.log('🎯 Found element:', asKey, 'at line', i); // Debug
        
        // Save previous intro content
        if (!currentElement && introBuffer.length) {
          intro = introBuffer.join('\n').trim();
          introBuffer = [];
        }
        
        // Save previous element content
        if (currentElement && buffer.length) {
          elements[currentElement].text = buffer.join('\n').trim();
          console.log('💾 Saved content for', currentElement, ':', elements[currentElement].text.substring(0, 50) + '...'); // Debug
          buffer = [];
        }
        
        currentElement = asKey;
        elements[asKey] = { heading: line.trim(), text: '' };
        continue;
      }
      
      // Collect content
      if (currentElement) {
        buffer.push(line);
      } else if (afterTitle) {
        introBuffer.push(line);
      }
    }
    
    // Save final content
    if (!currentElement && introBuffer.length) {
      intro = introBuffer.join('\n').trim();
    }
    if (currentElement && buffer.length) {
      elements[currentElement].text = buffer.join('\n').trim();
      console.log('💾 Final save for', currentElement, ':', elements[currentElement].text.substring(0, 50) + '...'); // Debug
    }
    
    console.log('📋 Parsed elements:', Object.keys(elements)); // Debug
    
    return { title, intro, elements };
  };
  
  // Render title above image (clickable to reset to intro)
  const renderElementsTitle = (content: string) => {
    const { title } = parseElementsContent(content);
    return title ? (
      <div 
        style={{ 
          fontSize: 16, 
          fontWeight: 800, 
          margin: '16px 0 10px', 
          lineHeight: 1.6, 
          textShadow: '0 0 12px rgba(242,239,29,1), 0 0 26px rgba(242,239,29,0.75)', 
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'opacity 0.2s ease'
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation(); // Prevent event from bubbling up
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation(); // Prevent event from bubbling up
          setSelectedElement(null); // Reset to intro text
          try { sfx.play('click', 0.4); } catch {}
        }}
        onMouseEnter={() => {
          try { sfx.play('hover', 0.25); } catch {}
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        title="Click to return to intro"
      >
        {title}
      </div>
    ) : null;
  };
  
  // Render content below image (intro or selected element)
  const renderElementsContent = (content: string) => {
    // Hardcode the updated content to avoid caching issues
    const updatedElements = {
      water: {
        heading: '💧 WATER',
        text: 'Soft yet powerful, WATER represents flow, adaptability, and emotional depth. It carries themes of change, healing, and trusting life\'s current. WATER songs move like tides, calm and cleansing, inviting you to release control and let the moment guide you.'
      },
      heart: {
        heading: '🩷 HEART',
        text: 'HEART embodies emotion, vulnerability, and connection. It symbolizes love, compassion, and the courage to stay open. HEART songs are tender, raw, and real, pulling you into the spaces where feeling becomes truth and connection begins.'
      },
      lightning: {
        heading: '⚡️ LIGHTNING',
        text: 'LIGHTNING holds energy, passion, and awakening. It represents breakthroughs, inspiration, and sudden clarity. These songs are fast, alive, and electric, striking with intensity and capturing the rush of change when everything shifts at once.'
      },
      darkness: {
        heading: '🌑 DARKNESS',
        text: 'DARKNESS carries mystery, shadow, and transformation. It symbolizes the unknown and the growth that rises from struggle. These songs dive into heartbreak, isolation, and truth, revealing that darkness is not the enemy but the place where transformation starts and light returns.'
      }
    };
    
    // Default intro text to show when no element is selected
    const defaultIntro = `Every song in the Heartverse is born from an element — a living force with its own energy and emotion. Each element tells a different truth.
⚡️ Lightning awakens.
🩷 Heart connects.
🌑 Darkness transforms.
💧 Water heals.
Together, they form the emotional ecosystem of the HEARTVERSE.`;
    
    let contentToShow = defaultIntro; // Default to summary text
    
    if (selectedElement && updatedElements[selectedElement]) {
      console.log(`🎯 Showing content for selected element: ${selectedElement}`);
      const element = updatedElements[selectedElement];
      
      // Render with centered heading and left-aligned body text
      return (
        <div style={{ lineHeight: 1.6, fontSize: 15, textShadow: '0 0 12px rgba(242,239,29,1), 0 0 26px rgba(242,239,29,0.75)' }}>
          <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: '8px' }}>
            {element.heading}
          </div>
          <div style={{ textAlign: 'left' }}>
            {element.text}
          </div>
        </div>
      );
    }
    
    return (
      <div style={{ lineHeight: 1.6, fontSize: 15, textShadow: '0 0 12px rgba(242,239,29,1), 0 0 26px rgba(242,239,29,0.75)' }}>
        <div style={{ whiteSpace: 'pre-wrap' }}>
          {contentToShow}
        </div>
      </div>
    );
  };

  // Handle element selection without closing popup
  const selectElement = async (key: ElementKey) => {
    try {
      // Select the element section to reveal; keep intro visible
      console.log(`🔥 Element selected: ${key}`); // Debug log
      setSelectedElement(key);
      try { 
        const a = chimeAudioRef.current; 
        if (a && a.readyState >= 2) { 
          a.currentTime = 0; 
          a.volume = 0.6; 
          a.play().catch(() => {}); 
        }
      } catch {}
      try { track('elements_quadrant_click', { quadrant: key }); } catch {}
      
      // Save to user profile selected_element field
      try {
        await fetch('/api/profile/element', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selected_element: key }),
          credentials: 'include'
        });
        // Update the local state for the Heart Coin display
        setUserSelectedElement(key);
      } catch (error) {
        console.warn('Failed to save selected element:', error);
      }
    } catch {}
  };
  
  // Load user's previously selected element
  useEffect(() => {
    if (showElementsPopover) {
      fetch('/api/profile/element', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data?.selected_element) {
            setSelectedElement(data.selected_element);
          }
        })
        .catch(() => {}); // Ignore errors
    }
  }, [showElementsPopover]);
  const elementBtnRef = useRef<HTMLButtonElement | null>(null);
  const [elementsPopoverPos, setElementsPopoverPos] = useState<{ left: number; top: number; width?: number } | null>(null);
  const closeCoverRef = useRef(null);
  // Plays when opening the card from the cover art
  const openDingRef = useRef(null);
  // Plays when flipping the card front/back
  const flipCoverRef = useRef(null);
  // Plays a subtle sound when scrolling elements popover
  const scrollAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastScrollSoundRef = useRef<number>(0);
  // Plays when selecting an element quadrant
  const chimeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Compute effective slug and preferred card image path (overridden by CARD_URLS when available)
  const effectiveSlug = (() => {
    // Prefer explicit slug when provided; else derive a diacritic-safe slug from title
    const safeFromTitle = title
      .toLowerCase()
      .normalize('NFD')
      // Remove combining diacritics (e.g., é -> e)
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’'\"]/g, '')
      .replace(/[()]/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return (slug && slug.toLowerCase()) || safeFromTitle;
  })();
  // Prefer local card image that mirrors the cover filename when available
  const localCardFromCover = src && src.includes('/covers/') ? src.replace('/covers/', '/cards/') : null;
  // Fallback to a title-based card filename in /cards (files are stored as WEBP with title casing)
  const computedCardSrc = localCardFromCover || `/cards/${title}.webp`;
  const explicitCardSrc = CARD_URLS[effectiveSlug];

  useEffect(() => {
    setMounted(true);
    // If an explicit external card URL is defined, trust it
    if (explicitCardSrc) { setHasRealCard(true); return; }
    // Otherwise probe local fallbacks as before
    const img = new window.Image();
    img.onload = () => setHasRealCard(true);
    img.onerror = () => {
      const fallback = src.replace('/covers/', '/cards/');
      if (fallback !== src) {
        const img2 = new window.Image();
        img2.onload = () => setHasRealCard(true);
        img2.onerror = () => {
          const asciiFromTitle = title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[’'\"]/g, '')
            .replace(/[()]/g, ' ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          const lastTry = `/cards/${asciiFromTitle}.webp`;
          const img3 = new window.Image();
          img3.onload = () => setHasRealCard(true);
          img3.onerror = () => setHasRealCard(false);
          img3.src = lastTry;
        };
        img2.src = fallback;
      } else {
        setHasRealCard(false);
      }
    };
    img.src = computedCardSrc;
  }, [src, slug, title, explicitCardSrc, computedCardSrc]);
  
  const handleClick = () => {
    // Play card ding when opening the card (do not play flip)
    try { 
      const a = openDingRef.current; 
      if (a && a.readyState >= 2) { 
        a.currentTime = 0; 
        a.volume = 0.6; 
        a.play().catch(()=>{}); 
      } 
    } catch {}
    
    // Track cover art click immediately when the cover is clicked
    try {
      const norm = (slug && slug.toLowerCase()) || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      track('cover_art_clicked', {
        song_slug: norm,
        payload: { song_title: title, cover_src: src },
      });
    } catch {}

    setShowCard(true);
    // Preserve optional callback for external hooks (no tracking here anymore)
    try { if (onCardOpen) onCardOpen(); } catch {}
  };

  // Reset flip state when modal closes
  useEffect(() => {
    if (!showCard) {
      setCardFlipped(false);
      setShowElementsPopover(false);
      setShowCollectionPanel(false);
    }
  }, [showCard]);

  // Listen for Escape key
  useEffect(() => {
    if (!showCard) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowCard(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCard]);

  // Close Elements popover on outside click / Escape
  useEffect(() => {
    if (!showElementsPopover) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const withinBtn = elementBtnRef.current && t && elementBtnRef.current.contains(t);
      const dialog = document.querySelector('[aria-label="Elements"]');
      const withinDialog = dialog && t && (dialog as HTMLElement).contains(t);
      
      // Check if click is on a quadrant button by checking for the elt-q class
      const isQuadrantButton = t && (t.classList?.contains('elt-q') || t.closest('.elt-q'));
      
      if (!withinBtn && !withinDialog && !isQuadrantButton) { 
        try { sfx.play('close', 0.4); } catch {}; 
        setShowElementsPopover(false); 
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowElementsPopover(false); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [showElementsPopover]);

  return (
    <motion.div
      className={`cover-hologram-container ${hovered ? 'hovered' : ''} ${inline ? 'relative' : 'absolute left-1/2 z-30 -translate-x-1/2'} rounded-2xl cursor-pointer border-2 border-[#19E3FF]/80 bg-cyan-400/10 backdrop-blur-xl`}
      style={inline ? { 
        // Make the cover touch the sides of the blue box: no extra padding compensation
        width: size,
      } : { 
        top: "calc(50% - 120px)", 
        transform: "translateX(-50%)",
        width: "360px"
      }}
      // Disable slide/tilt-in; render in-place without motion
      initial={{ opacity: 1, y: 0, rotateX: 0 }}
      animate={{ opacity: inline ? 1 : cockpit.cover.hologramOpacity, y: 0, rotateX: 0 }}
      transition={{ duration: 0 }}
      onClick={handleClick}
      onMouseEnter={() => { setHovered(true); try { sfx.play('hover', 0.35); } catch {} }}
      onMouseLeave={() => setHovered(false)}
      role="button"
      // Help analytics identify cover art context reliably
      data-song={title}
      data-slug={(slug && slug.toLowerCase()) || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`View ${title} card`}
    >
      <div className="cover-hologram-inner p-0.5">
        <Image
          src={src}
          alt={`${title} cover`}
          width={size}
          height={size}
          className="cover-hologram-image rounded-2xl object-cover select-none w-full h-auto transition-all duration-150"
          // Mirror attributes onto the image for robust targeting
          data-song={title}
          data-slug={(slug && slug.toLowerCase()) || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
          priority
        />
      </div>
      {!inline && <div className="px-3 pb-3 text-center text-xs text-white/70">{title}</div>}
      
      {showCard && mounted ? createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60"
          style={{ padding: 0 }}
          onClick={() => {
            try { const a = closeCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}
            setShowCard(false);
          }}
        >
          {/* Card modal positioned above light beam */}
          <div
            className="card-anchored"
            style={{
              position: 'fixed',
              bottom: '40vh', // Slightly higher on screen
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'auto'
            }}
            onClick={(e)=> e.stopPropagation()}
          >
            <div
              className="relative rounded-2xl p-4 card-modal"
              style={{ paddingBottom: '0px', paddingTop: '32px' }}
            >
            <div className="tilt-wrap">
              <div className="card-frame">
                <div 
                  className="card-flip-container"
                  style={{
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
                  onClick={() => { 
                    // Flip the card and play flip sound regardless of card availability;
                    // the front image already falls back to cover if a card image is missing.
                    try { const a = flipCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.45; a.play().catch(()=>{}); } } catch {}
                    setCardFlipped((v) => !v); 
                  }}
                >
                  <div 
                    className="card-flip-inner"
                    style={{
                      transition: 'transform 0.7s ease-in-out',
                      transformStyle: 'preserve-3d',
                      transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* Front side shows the CARD image (not cover) */}
                    <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}>
                      <img
                        src={explicitCardSrc || computedCardSrc}
                        alt={title}
                        className="tilt-img"
                        onError={(e)=>{
                          // If card not found, try swapping covers->cards, then fallback to card back
                          const fallback = src.replace('/covers/', '/cards/');
                          if (fallback && fallback !== src) {
                            e.currentTarget.onerror = () => { e.currentTarget.src = CARD_URLS['back'] || '/cards/BACK.webp'; };
                            e.currentTarget.src = fallback;
                          } else {
                            e.currentTarget.src = CARD_URLS['back'] || '/cards/BACK.webp';
                          }
                        }}
                      />
                    </div>
                    {/* Back side shows the original COVER image */}
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                    >
                      <img
                        src={src}
                        alt={title}
                        className="tilt-img"
                        onError={(e)=>{
                          // If cover missing, fall back to brand logo
                          e.currentTarget.src = "/logo/CHXNDLER_Logo.png";
                        }}
                      />
                    </div>
                  </div>
                </div>
                <span className="frame-sheen" aria-hidden />
              </div>
            </div>
            {hasRealCard && (
              <>
                {/* Centered Collect Card button */}
                <div className="absolute top-[5px] left-1/2 transform -translate-x-1/2 z-10">
                  <div className="buttons-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="ocean-cta-wrap relative">
                      <button
                        type="button"
                        className="btn-ocean"
                        title="Collect this card"
                        aria-label={`Collect Card: ${title}`}
                        data-song={title}
                        data-slug={title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                        onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
                        onClick={(e) => {
                          try { e.preventDefault(); } catch {}
                          try { sfx.play('click', 0.7); } catch {}
                          
                          // Close the card modal
                          setShowCard(false);
                          
                          // Set HeartCoin modal to open with USE tab and CARDS sub-tab
                          try {
                            (window as any).heartCoinInitialTab = 'USE';
                            (window as any).heartCoinInitialUseTab = 'CARDS';
                            // Store the card name for filtering
                            (window as any).heartCoinSelectedCard = title;
                          } catch {}
                          
                          // Emit custom event to open HeartCoin modal with card filter
                          try {
                            const heartCoinEvent = new CustomEvent('openHeartCoinCards', {
                              detail: { 
                                cardTitle: title,
                                songSlug: title?.toLowerCase().replace(/\s+/g, '-'),
                                cardSrc: src 
                              }
                            });
                            window.dispatchEvent(heartCoinEvent);
                          } catch {}
                          
                          try {
                            track('collect_card_clicked', { 
                              song_slug: title?.toLowerCase().replace(/\s+/g, '-'),
                              card_src: src,
                              payload: { song_title: title, card_image: src, action: 'open_heartcoin_with_card' } 
                            });
                          } catch {}
                        }}
                      >
                        <span className="btn-label" style={{ whiteSpace: 'nowrap' }}>COLLECT CARD</span>
                        <span className="btn-ripple" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Collection Panel */}
            {showCollectionPanel && hasRealCard && (
              <div className="collection-panel absolute top-[50px] left-1/2 transform -translate-x-1/2 z-20 w-full max-w-[320px] p-4 rounded-lg bg-black/80 backdrop-blur-lg border border-[#19E3FF]/60 shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-white">
                {/* Close button */}
                <button
                  type="button"
                  aria-label="Close collection panel"
                  onClick={() => {
                    try { sfx.play('close', 0.4); } catch {}
                    setShowCollectionPanel(false);
                  }}
                  onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#19E3FF] text-black font-bold text-sm flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-[0_0_20px_rgba(25,227,255,0.8)]"
                  style={{
                    boxShadow: '0 0 12px rgba(25,227,255,0.6)'
                  }}
                >
                  ×
                </button>

                {loadingProfile ? (
                  <div className="text-center text-[#19E3FF] text-sm">Loading profile...</div>
                ) : userProfile ? (
                  <>
                    {/* User Display */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full relative overflow-hidden flex items-center justify-center"
                          style={{
                            background: getElementBackground(userSelectedElement),
                            boxShadow: getElementGlow(userSelectedElement)
                          }}
                        >
                          <img
                            src={`/elements/${userSelectedElement || 'heart'}.png`}
                            alt={`${userSelectedElement || 'Heart'} Element`}
                            className="w-full h-full object-cover"
                            style={{
                              filter: 'brightness(1.2) saturate(1.5)'
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-semibold text-[#CFF7FF]">{userProfile.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg text-[#F2EF1D] font-bold">{userProfile.hearts}</span>
                            <img
                              src="/elements/heart-coin.webp"
                              alt="Heart Coin"
                              className="w-6 h-6 object-contain"
                              style={{
                                filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 4px #FC54AF)'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cost Display - removed per user request */}

                    {/* Affordability Indicator */}
                    <div className="mb-4">
                      {userProfile.hearts >= (selectedCardType === 'digital' ? 20 : 30) ? (
                        <div className="text-sm font-semibold text-green-400 bg-green-400/20 px-3 py-1 rounded border border-green-400/40">
                          ✓ You can collect this
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-red-400 bg-red-400/20 px-3 py-1 rounded border border-red-400/40">
                          ✗ Not enough coins
                        </div>
                      )}
                    </div>

                    {/* Digital vs Physical Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-[#CFF7FF]">Select Card Type:</div>
                        {/* Elements button */}
                        <button
                          ref={elementBtnRef}
                          type="button"
                          className="btn-element"
                          title="Elements"
                          aria-label="Elements"
                          onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
                          onClick={async () => {
                            try { sfx.play('click', 0.6); } catch {}
                            if (showElementsPopover) { setShowElementsPopover(false); return; }
                            // Position popover under this button
                            try {
                              const r = elementBtnRef.current?.getBoundingClientRect();
                              if (r) setElementsPopoverPos({ left: Math.round(r.left + r.width/2), top: r.bottom + 8 });
                            } catch {}
                            // Load content if not already loaded
                            setElementsLoading(true);
                            setElementsError(null);
                            setElementsContent('');
                            setSelectedElement(null); // Show only intro until a quadrant is clicked
                            try {
                              const res = await fetch(`/api/elements?t=${Date.now()}`);
                              const data = await res.json();
                              if (!res.ok) throw new Error(data?.error || `Failed to load ELEMENTS.md`);
                              setElementsContent(String(data?.content || ''));
                            } catch (e: any) {
                              setElementsError(e?.message || 'Failed to load ELEMENTS.md');
                            } finally {
                              setElementsLoading(false);
                              setShowElementsPopover(true);
                            }
                          }}
                        >
                          <Image
                            src="/elements/elementals.webp?v=20241027"
                            alt=""
                            fill
                            sizes="36px"
                            className="btn-element-icon"
                            aria-hidden
                          />
                          <span className="sr-only">Elements</span>
                        </button>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCardType('digital');
                          try { sfx.play('hover', 0.35); } catch {}
                        }}
                        className={`w-full p-3 rounded-lg border-2 transition-all duration-200 ${
                          selectedCardType === 'digital'
                            ? 'border-[#19E3FF] bg-[#19E3FF]/20 shadow-[0_0_20px_rgba(25,227,255,0.6)]'
                            : 'border-[#19E3FF]/40 bg-[#19E3FF]/5 hover:border-[#19E3FF]/60'
                        }`}
                        style={selectedCardType === 'digital' ? {
                          boxShadow: '0 0 20px rgba(25, 227, 255, 0.6), 0 0 40px rgba(25, 227, 255, 0.3)'
                        } : {}}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-[#19E3FF]">Digital Card</div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#F2EF1D] font-bold">20</span>
                            <img
                              src="/elements/heart-coin.webp"
                              alt="Heart Coin"
                              className="w-4 h-4 object-contain"
                              style={{
                                filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 4px #FC54AF)'
                              }}
                            />
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCardType('physical');
                          try { sfx.play('hover', 0.35); } catch {}
                        }}
                        className={`w-full p-3 rounded-lg border-2 transition-all duration-200 ${
                          selectedCardType === 'physical'
                            ? 'border-[#FC54AF] bg-[#FC54AF]/20 shadow-[0_0_20px_rgba(252,84,175,0.6)]'
                            : 'border-[#FC54AF]/40 bg-[#FC54AF]/5 hover:border-[#FC54AF]/60'
                        }`}
                        style={selectedCardType === 'physical' ? {
                          boxShadow: '0 0 20px rgba(252, 84, 175, 0.6), 0 0 40px rgba(252, 84, 175, 0.3)'
                        } : {}}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-[#FC54AF]">Physical Card</div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#F2EF1D] font-bold">30</span>
                            <img
                              src="/elements/heart-coin.webp"
                              alt="Heart Coin"
                              className="w-4 h-4 object-contain"
                              style={{
                                filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 4px #FC54AF)'
                              }}
                            />
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Purchase Button */}
                    <div className="mt-6 pt-4 border-t border-[#19E3FF]/30">
                      {selectedCardType === 'physical' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            try { e.preventDefault(); } catch {}
                            try { sfx.play('click', 0.7); } catch {}
                            try {
                              track('heart_coins_purchase_clicked', { 
                                song_slug: title?.toLowerCase().replace(/\s+/g, '-'),
                                card_src: src,
                                card_type: selectedCardType,
                                heart_coins_cost: 30,
                                payload: { song_title: title, card_image: src } 
                              });
                            } catch {}
                            setShowCheckout(true);
                          }}
                          disabled={userProfile.hearts < 30}
                          onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
                          className={`w-full purchase-btn relative overflow-hidden font-bold py-3 px-6 rounded-lg border-2 transition-all duration-200 ${
                            userProfile.hearts >= 30
                              ? 'bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] text-black border-[#F2EF1D] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(242,239,29,0.8)]'
                              : 'bg-gray-600 text-gray-300 border-gray-600 cursor-not-allowed'
                          }`}
                          style={userProfile.hearts >= 30 ? {
                            boxShadow: '0 0 20px rgba(242,239,29,0.6), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -8px 16px rgba(0,0,0,0.22)'
                          } : {}}
                        >
                          <span className="relative z-10 text-sm font-bold tracking-wide">
                            PURCHASE WITH HEART COINS
                          </span>
                          {userProfile.hearts >= 30 && (
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full transition-transform duration-700 hover:translate-x-full" aria-hidden />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            try { e.preventDefault(); } catch {}
                            try { sfx.play('click', 0.7); } catch {}
                            try {
                              track('purchase_card_clicked', { 
                                song_slug: title?.toLowerCase().replace(/\s+/g, '-'),
                                card_src: src,
                                card_type: selectedCardType,
                                payload: { song_title: title, card_image: src, stripe_url: getPurchaseUrl(title) } 
                              });
                            } catch {}
                            try {
                              const url = getPurchaseUrl(title);
                              window.open(url, '_blank', 'noopener,noreferrer');
                            } catch { }
                          }}
                          onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
                          className="w-full purchase-btn relative overflow-hidden bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] text-black font-bold py-3 px-6 rounded-lg border-2 border-[#F2EF1D] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(242,239,29,0.8)]"
                          style={{
                            boxShadow: '0 0 20px rgba(242,239,29,0.6), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -8px 16px rgba(0,0,0,0.22)'
                          }}
                        >
                          <span className="relative z-10 text-sm font-bold tracking-wide">PURCHASE</span>
                          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full transition-transform duration-700 hover:translate-x-full" aria-hidden />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-red-400 text-sm">Failed to load profile</div>
                )}
              </div>
            )}

            <button
              type="button"
              aria-label="Close"
              onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
              onClick={() => {
                try { const a = closeCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}
                setShowCard(false);
              }}
              onMouseOver={(e)=>{ try { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 28px rgba(25,227,255,1)'; } catch {} }}
              onMouseOut={(e)=>{ try { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(25,227,255,0.8)'; } catch {} }}
              className="absolute -top-3 -right-3 rounded-full bg-[#19E3FF] text-black font-bold w-8 h-8 shadow-[0_0_20px_rgba(25,227,255,0.8)] transition-transform"
              title="Close"
            >×</button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Elements Popover (portal-rendered) */}
      {typeof document !== 'undefined' && showElementsPopover && elementsPopoverPos ? createPortal(
        <div
          role="dialog"
          aria-label="Elements"
          className="elements-popover holo-scrollbar-yellow"
          style={{
            position: 'fixed',
            // Shift slightly left from exact center
            left: 'calc(50% - 6px)',
            // Nudge popover further upward (very slight)
            top: (elementsPopoverPos.top - 54),
            transform: 'translateX(-50%)',
            padding: '14px 16px',
            borderRadius: 12,
            background: 'rgba(3,10,20,0.86)',
            border: '1px solid rgba(25,227,255,0.5)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 0 22px rgba(25,227,255,0.55)',
            backdropFilter: 'blur(8px)',
            color: '#F2EF1D',
            zIndex: 2147483647,
            // Slightly wider popover
            width: 'min(92vw, 420px)',
            maxWidth: 'min(92vw, 420px)',
            maxHeight: '44vh',
            overflowY: 'auto'
          } as any}
          onClick={(e) => e.stopPropagation()}
          onScroll={() => {
            try {
              const now = Date.now();
              if (now - lastScrollSoundRef.current > 260) {
                const a = scrollAudioRef.current as any;
                if (a) {
                  a.currentTime = 0;
                  a.volume = 0.25;
                  a.play().catch(() => {});
                }
                lastScrollSoundRef.current = now;
              }
            } catch {}
          }}
          onKeyDown={(e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowElementsPopover(false); } }}
        >
          {/* Close (X) button at top-right */}
          <button
            aria-label="Close"
            title="Close"
            onMouseEnter={() => { try { sfx.play('hover', 0.4); } catch {} }}
            onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowElementsPopover(false); }}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 30,
              height: 30,
              borderRadius: 999,
              border: '1px solid rgba(242,239,29,0.6)',
              background: 'rgba(0,0,0,0.5)',
              color: '#F2EF1D',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(242,239,29,0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseOver={(e)=>{ try { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(242,239,29,0.75)'; } catch {} }}
            onMouseOut={(e)=>{ try { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px rgba(242,239,29,0.35)'; } catch {} }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z" />
            </svg>
          </button>

          {/* Title always shown above image */}
          {!elementsLoading && !elementsError && (
            renderElementsTitle(elementsContent || '')
          )}

          {/* Header image with clickable quadrants */}
          <div style={{ marginBottom: 8, display: 'grid', placeItems: 'center', position: 'relative' }}>
            <div style={{ position: 'relative', width: '58%', maxWidth: 280 }} id="elemental-container">
              <img
                src="/elements/elementals.webp?v=20241027"
                alt="Elementals"
                className="elt-img"
                style={{ display: 'block', width: '100%', height: 'auto', background: 'transparent' }}
              />
              {/* Quadrant overlay buttons */}
              {/* Mapping per request: TL=darkness, TR=heart, BL=water, BR=lightning */}
              <button 
                aria-label="Darkness" 
                title="Darkness" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectElement('darkness');
                }} 
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseEnter={() => {
                  setHoveredElement('darkness');
                  try { sfx.play('hover', 0.25); } catch {}
                }}
                onMouseLeave={() => setHoveredElement(null)}
                className="elt-q elt-q-tl"
                data-element="darkness"
              />
              <button 
                aria-label="Heart" 
                title="Heart" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectElement('heart');
                }} 
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseEnter={() => {
                  setHoveredElement('heart');
                  try { sfx.play('hover', 0.25); } catch {}
                }}
                onMouseLeave={() => setHoveredElement(null)}
                className="elt-q elt-q-tr"
                data-element="heart"
              />
              <button 
                aria-label="Water" 
                title="Water" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectElement('water');
                }} 
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseEnter={() => {
                  setHoveredElement('water');
                  try { sfx.play('hover', 0.25); } catch {}
                }}
                onMouseLeave={() => setHoveredElement(null)}
                className="elt-q elt-q-bl"
                data-element="water"
              />
              <button 
                aria-label="Lightning" 
                title="Lightning" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectElement('lightning');
                }} 
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseEnter={() => {
                  setHoveredElement('lightning');
                  try { sfx.play('hover', 0.25); } catch {}
                }}
                onMouseLeave={() => setHoveredElement(null)}
                className="elt-q elt-q-br"
                data-element="lightning"
              />
            </div>
            
            {/* Overlay highlights using mix-blend-mode to ensure visibility */}
            {(hoveredElement || selectedElement) && (
              <div 
                style={{
                  position: 'absolute',
                  top: selectedElement ? '0px' : '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '54%',
                  maxWidth: 260,
                  aspectRatio: '1',
                  pointerEvents: 'none',
                  zIndex: 10000,
                  mixBlendMode: 'screen'
                }}
              >
                {/* Active highlight */}
                {hoveredElement === 'darkness' && (
                  <div 
                    className="elt-q-tl"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)',
                      filter: 'blur(1px)',
                      animation: 'pulse 2s infinite'
                    }}
                  />
                )}
                {hoveredElement === 'heart' && (
                  <div 
                    className="elt-q-tr"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle at center, rgba(252,84,175,0.6) 0%, rgba(252,84,175,0.3) 40%, transparent 70%)',
                      filter: 'blur(1px)',
                      animation: 'pulse 2s infinite'
                    }}
                  />
                )}
                {hoveredElement === 'water' && (
                  <div 
                    className="elt-q-bl"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle at center, rgba(56,182,255,0.6) 0%, rgba(56,182,255,0.3) 40%, transparent 70%)',
                      filter: 'blur(1px)',
                      animation: 'pulse 2s infinite'
                    }}
                  />
                )}
                {hoveredElement === 'lightning' && (
                  <div 
                    className="elt-q-br"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle at center, rgba(242,239,29,0.6) 0%, rgba(242,239,29,0.3) 40%, transparent 70%)',
                      filter: 'blur(1px)',
                      animation: 'pulse 2s infinite'
                    }}
                  />
                )}
                
                {/* Selected state - steadier glow */}
                {selectedElement === 'darkness' && !hoveredElement && (
                  <div 
                    className="elt-q-tl"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.15) 50%, transparent 80%)',
                      filter: 'blur(2px)'
                    }}
                  />
                )}
                {selectedElement === 'heart' && !hoveredElement && (
                  <div 
                    className="elt-q-tr"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle at center, rgba(252,84,175,0.4) 0%, rgba(252,84,175,0.2) 50%, transparent 80%)',
                      filter: 'blur(2px)'
                    }}
                  />
                )}
                {selectedElement === 'water' && !hoveredElement && (
                  <div 
                    className="elt-q-bl"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle at center, rgba(56,182,255,0.4) 0%, rgba(56,182,255,0.2) 50%, transparent 80%)',
                      filter: 'blur(2px)'
                    }}
                  />
                )}
                {selectedElement === 'lightning' && !hoveredElement && (
                  <div 
                    className="elt-q-br"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle at center, rgba(242,239,29,0.4) 0%, rgba(242,239,29,0.2) 50%, transparent 80%)',
                      filter: 'blur(2px)'
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {elementsLoading ? (
            <div style={{ fontSize: 15 }}>Loading…</div>
          ) : elementsError ? (
            <div style={{ fontSize: 15, color: '#ff7b7b' }}>{elementsError}</div>
          ) : (
            renderElementsContent(elementsContent || 'No elements content available.')
          )}
        </div>,
        document.body
      ) : null}

      <style jsx>{`
        /* Cover Hologram Hover Effects */
        .cover-hologram-container {
          /* Grow the whole container (image + border) on hover */
          transition: scale .15s ease, box-shadow .2s ease !important;
          will-change: transform;
          transform-origin: 50% 50%;
          box-shadow: none;
          scale: 1;
        }
        /* Scale the entire container for a cohesive grow */
        .cover-hologram-container:hover,
        .cover-hologram-container.hovered {
          scale: 1.08;
        }
        .cover-hologram-container:hover,
        .cover-hologram-container.hovered {
          box-shadow: none !important;
        }
        
        .cover-hologram-image {
          filter: brightness(1.1) contrast(1.05) saturate(1.1);
          transition: filter .15s ease;
        }
        .cover-hologram-container:hover .cover-hologram-image,
        .cover-hologram-container.hovered .cover-hologram-image {
          filter: brightness(1.6) contrast(1.4) saturate(1.8);
        }
        
        .cover-glow-frame {
          box-shadow: inset 0 0 40px rgba(255,255,255,0.08);
          border-color: rgba(25, 227, 255, 0.6);
        }
        .cover-hologram-container:hover .cover-glow-frame,
        .cover-hologram-container.hovered .cover-glow-frame {
          border-color: rgba(25, 227, 255, 1);
          box-shadow: none;
        }
        
        
        
        .card-modal{
          /* Smaller pop container */
          width: min(78vw, 260px);
          max-width: 78vw;
          background: rgba(25,227,255,0.45);
          box-shadow: 0 0 60px rgba(25,227,255,0.45), inset 0 0 0 1px rgba(25,227,255,0.35);
        }
        @media (max-width: 380px) {
          /* Nudge down more on very narrow devices */
          .card-modal{ width: min(82vw, 240px); }
        }
        .tilt-wrap{ perspective: 1200px; transform-style: preserve-3d; }
        .card-frame{
          position:relative; border-radius: 16px; padding: 8px; background: transparent;
          outline: 1px solid rgba(25,227,255,.4);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), 0 0 36px rgba(25,227,255,.35);
        }
        /* Hover grow + glow on the card, similar to COLLECT CARD button */
        .card-flip-container{ transition: transform .12s ease, box-shadow .18s ease, filter .18s ease; will-change: transform; }
        .card-flip-container:hover{ transform: translateZ(0) scale(1.05); }
        .card-frame:hover{
          box-shadow:
            0 0 52px rgba(25,227,255,.9),
            0 0 90px rgba(25,227,255,.7),
            0 0 140px rgba(25,227,255,0.5),
            0 0 200px rgba(25,227,255,0.3),
            inset 0 0 0 1px rgba(255,255,255,.12);
          outline-color: rgba(25,227,255,.75);
        }
        .card-frame:hover .tilt-img{
          filter: saturate(1.1) brightness(1.08) contrast(1.08)
            drop-shadow(0 0 26px rgba(25,227,255,1))
            drop-shadow(0 0 52px rgba(25,227,255,.8))
            drop-shadow(0 0 96px rgba(25,227,255,.6));
        }
        .tilt-img{
          width: 100%; height: auto; display:block; object-fit: contain;
          transform: rotateX(10deg) rotateY(-10deg) translateZ(0);
          filter: saturate(1.06) contrast(1.06) brightness(1.04)
            drop-shadow(0 0 18px rgba(25,227,255,0.55)) drop-shadow(0 0 36px rgba(25,227,255,0.35));
          animation: tiltPulse 3s ease-in-out infinite;
          border-radius: 14px;
        }
        .frame-sheen{ position:absolute; inset: 6px; border-radius: 12px; pointer-events:none;
          background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,0) 60%);
          mix-blend-mode: screen; opacity:.6;
        }
        .tilt-img:hover{ animation-duration: 2.2s; }
        @keyframes tiltPulse{
          0%,100% { transform: rotateX(9deg) rotateY(-9deg) scale(1); }
          50%      { transform: rotateX(13deg) rotateY(-13deg) scale(1.04); }
        }
        .ocean-cta-wrap{ position:relative; }
        .buttons-row{ position: relative; justify-content: center; }
        .btn-ocean{
          position:relative; display:inline-grid; place-items:center;
          padding: 5px 12px; border-radius: 10px; font-weight:800; letter-spacing:.06em; font-size: 12px; line-height: 1.1;
          color:#001014; text-transform:uppercase; font-family: InterLocal, system-ui, sans-serif;
          background: radial-gradient(100% 100% at 50% 20%, rgba(255,255,210,0.95), #F2EF1D);
          border: 1px solid rgba(255,255,255,.24);
          box-shadow: 0 0 20px rgba(242,239,29,.55), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -8px 16px rgba(0,0,0,.22);
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
          overflow:hidden;
          white-space: nowrap;
        }
        .btn-ocean:hover{
          transform: translateZ(0) scale(1.05);
          box-shadow:
            0 0 36px rgba(242,239,29,.95),
            0 0 80px rgba(242,239,29,.55),
            inset 0 2px 0 rgba(255,255,255,.7),
            inset 0 -10px 18px rgba(0,0,0,.28);
          filter: saturate(1.08) brightness(1.07);
          animation: oceanGlow 1.8s ease-in-out infinite;
        }
        .btn-ocean:active{ transform: scale(.98); }
        @keyframes oceanGlow {
          0%, 100% { box-shadow: 0 0 36px rgba(242,239,29,.95), 0 0 80px rgba(242,239,29,.55), inset 0 2px 0 rgba(255,255,255,.7), inset 0 -10px 18px rgba(0,0,0,.28); }
          50% { box-shadow: 0 0 52px rgba(242,239,29,1), 0 0 110px rgba(242,239,29,.7), inset 0 2px 0 rgba(255,255,255,.75), inset 0 -12px 20px rgba(0,0,0,.3); }
        }
        .btn-ripple{ position:absolute; inset:-10%; border-radius:inherit; pointer-events:none; opacity:0;
          background: radial-gradient(closest-side, rgba(255,255,255,.85), rgba(242,239,29,.45) 40%, rgba(242,239,29,0) 60%);
          filter: blur(1px);
        }
        .btn-ocean.is-rippling .btn-ripple{ animation: og-ripple 520ms ease-out 1; }
        @keyframes og-ripple{
          0% { opacity:.7; transform: scale(.5); }
          60% { opacity:.25; transform: scale(1.6); }
          100% { opacity:0; transform: scale(2.2); }
        }
        /* Elements popover: no entrance animation, stronger scrollbar */
        .elements-popover { animation: none !important; transition: none !important; }
        .elements-popover::-webkit-scrollbar { width: 18px; }
        .elements-popover::-webkit-scrollbar-thumb {
          box-shadow:
            0 0 18px rgba(242,239,29,0.8),
            0 0 36px rgba(242,239,29,0.5),
            inset 0 0 10px rgba(255,255,255,0.22);
        }
        /* Clickable quadrants overlay for elementals image */
        .elt-img{ position: relative; z-index: 1; }
        .elt-q{ 
          position: absolute; 
          top: 0; 
          left: 0; 
          width: 100%; 
          height: 100%; 
          background: transparent; 
          border: 0; 
          padding: 0; 
          cursor: pointer; 
          z-index: 2;
        }
        .elt-q:focus-visible{ outline: 2px solid rgba(25,227,255,0.85); outline-offset: 2px; }
        
        /* Highlight divs use same clip paths as buttons */
        .elt-highlight{
          transition: all .2s ease;
        }
        
        /* Pulse animation for hover effects */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        /* Quarter-circle clip shapes matching the image quadrants */
        .elt-q-tl{ clip-path: polygon(50% 50%, 50% 0%, 43% 2%, 35% 6%, 27% 12%, 19% 19%, 12% 27%, 6% 35%, 2% 43%, 0% 50%, 50% 50%); }
        .elt-q-tr{ clip-path: polygon(50% 50%, 50% 0%, 57% 2%, 65% 6%, 73% 12%, 81% 19%, 88% 27%, 94% 35%, 98% 43%, 100% 50%, 50% 50%); }
        .elt-q-bl{ clip-path: polygon(50% 50%, 0% 50%, 2% 57%, 6% 65%, 12% 73%, 19% 81%, 27% 88%, 35% 94%, 43% 98%, 50% 100%, 50% 50%); }
        .elt-q-br{ clip-path: polygon(50% 50%, 100% 50%, 98% 57%, 94% 65%, 88% 73%, 81% 81%, 73% 88%, 65% 94%, 57% 98%, 50% 100%, 50% 50%); }
        
        /* Mobile responsive improvements */
        @media (max-width: 768px) {
          .elements-popover {
            width: min(95vw, 380px) !important;
            maxWidth: 95vw !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            padding: 12px 14px !important;
          }
          
          .elt-q {
            /* Larger touch targets on mobile */
            min-width: 44px;
            min-height: 44px;
          }
          
          .elt-q::after {
            /* Stronger visual feedback on mobile */
            transition: all .3s ease;
          }
          
          .elt-q.elt-q-hovered::after,
          .elt-q:active::after {
            box-shadow: inset 0 0 0 3px rgba(255,255,255,0.9), 0 0 25px rgba(255,255,255,0.7);
          }
        }
        
        @media (max-width: 480px) {
          .elements-popover {
            width: min(98vw, 340px) !important;
            maxWidth: 98vw !important;
            fontSize: 14px !important;
          }
          
          .card-modal {
            width: min(85vw, 220px) !important;
          }
        }
        /* ELEMENT button icon styles */
        .btn-element{
          position: relative; display:inline-grid; place-items:center;
          width: 36px; height: 36px; border-radius: 50%; font-weight:800; letter-spacing:.06em; font-size: 15px; line-height: 1.1;
          color:#001014; text-transform:none; font-family: InterLocal, system-ui, sans-serif;
          background: transparent; /* fill entirely with elementals.png */
          border: 0; /* remove border so image can fill completely */
          padding: 0; /* remove any padding */
          box-shadow: 0 0 8px ${elementColor}88; /* dynamic element color with 55% opacity */
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
          overflow: hidden; /* contain glow within the circular button */
          z-index: 12;
        }
        .btn-element-icon{ 
          position: absolute; 
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 105%; 
          height: 105%; 
          object-fit: cover !important; 
          display: block; 
          pointer-events: none; 
          border-radius: 50%; /* ensure the image itself is circular */
          margin: 0; /* remove any default margin */
        }
        .btn-element:hover{
          transform: scale(1.12);
          box-shadow:
            0 0 12px ${elementColor}F2, /* 95% opacity */
            0 0 20px ${elementColor}88, /* 55% opacity */
            inset 0 2px 0 rgba(255,255,255,.7),
            inset 0 -10px 18px rgba(0,0,0,.28);
          filter: saturate(1.08) brightness(1.07);
          animation: elementGlow 1.8s ease-in-out infinite;
        }
        .btn-element:active{ transform: scale(.98); }
        @keyframes elementGlow {
          0%, 100% {
            box-shadow: 0 0 12px ${elementColor}F2, 0 0 20px ${elementColor}88, inset 0 2px 0 rgba(255,255,255,.7), inset 0 -10px 18px rgba(0,0,0,.28);
          }
          50% {
            box-shadow: 0 0 16px ${elementColor}FF, 0 0 24px ${elementColor}B2, inset 0 2px 0 rgba(255,255,255,.75), inset 0 -12px 20px rgba(0,0,0,.3);
          }
        }
      `}</style>

      <audio ref={closeCoverRef} src="/audio/close.mp3" preload="auto" />
      <audio ref={openDingRef} src="/audio/card-ding.mp3" preload="auto" />
      <audio ref={flipCoverRef} src="/audio/flip.mp3" preload="auto" />
      <audio ref={scrollAudioRef} src="/audio/scroll.mp3" preload="auto" />
      <audio ref={chimeAudioRef} src="/audio/card-ding.mp3" preload="auto" />

      {/* Heart Coins Checkout Modal */}
      <HeartCardCheckout
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSuccess={(shippingData) => {
          setShowCheckout(false);
          setCompletedOrder({
            fullName: shippingData.fullName,
            streetAddress: shippingData.streetAddress,
            apartment: shippingData.apartment,
            city: shippingData.city,
            stateRegion: shippingData.stateRegion,
            zipPostal: shippingData.zipPostal,
            country: shippingData.country
          });
          setShowSuccess(true);
          // Refresh user profile to update Heart Coins balance
          fetchUserProfile();
        }}
        cardTitle={title}
        cardCost={30}
        userEmail={userProfile?.email}
        userPhone={userProfile?.phone}
      />

      {/* Success Modal */}
      <HeartCardSuccess
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          setCompletedOrder(null);
        }}
        shippingAddress={completedOrder}
      />
    </motion.div>
  );
}
